#!/bin/sh
# Applies any pending Prisma migrations, then starts the API.
#
# `prisma migrate deploy` (via `bun run db:deploy`) only APPLIES migrations already committed under
# packages/db/prisma/migrations — it never creates, resets, drops, or force-pushes a schema, and it is
# a no-op (fast exit) once a database is already up to date. It is NOT the same command as
# `migrate reset` or `db push --force-reset`.
#
# This step is necessary because DATABASE_URL in a fresh deploy (a new Dokploy-managed database, or a
# first deploy against an existing empty one) points at a database with zero tables. Without this, the
# API container starts and reports "healthy" (its healthcheck only does `SELECT 1`, which succeeds
# against an empty database too) while every real query fails with Prisma error P2021
# ("The table `...` does not exist in the current database").
#
# If migrations still fail after MAX_ATTEMPTS below, this script exits non-zero and the container
# exits; Docker's `restart: unless-stopped` retries the whole container. The API must never start
# serving requests against an unmigrated schema.
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] DATABASE_URL is not set" >&2
  exit 1
fi

# Log only host and port — never the user, password, or full URL.
db_host() {
  case "$1" in
    *@*)
      target=${1##*@}
      target=${target%%\?*}
      target=${target%%/*}
      printf '%s' "$target"
      ;;
    *)
      printf '%s' "unknown"
      ;;
  esac
}

# FAIL LOUD, do not silently "fix" this: every `localhost`/`127.0.0.1` database URL in this repo is the
# LOCAL DEV Postgres (root docker-compose.yml — explicitly commented "Never point production at this",
# port 5433; .env.example's DATABASE_URL uses exactly this value). Inside ANY container, "localhost"
# always means the container itself, so a value like this can never be a valid production target.
# In production, DATABASE_URL is normally auto-derived by docker-compose.prod.yml from
# POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB, pointing at the `postgres` compose service — seeing
# localhost here means DATABASE_URL was overridden directly (or the old manual-paste setup is still in
# use) with a local/dev connection string. An earlier version of this script rewrote it to
# host.docker.internal automatically; that masked the misconfiguration as a networking problem instead
# of surfacing it. If you genuinely need this container to reach a host-side Postgres for local
# testing, set DATABASE_URL to host.docker.internal yourself; this script will not guess it for you.
case "$DATABASE_URL" in
  *@localhost:*|*@localhost/*|*@127.0.0.1:*|*@127.0.0.1/*)
    echo "[entrypoint] DATABASE_URL points at $(db_host "$DATABASE_URL") — refusing to start." >&2
    echo "[entrypoint] this is the LOCAL DEV database's address (see docker-compose.yml / .env.example)," >&2
    echo "[entrypoint] not a valid target inside any container, including this one." >&2
    echo "[entrypoint] fix: in Dokploy's Environment tab, set DATABASE_URL to your actual production" >&2
    echo "[entrypoint] database's Internal Connection URL (DEPLOY.md step 1) — not a localhost value." >&2
    exit 1
    ;;
esac

# Bound the TCP handshake. Without this, a black-holed database host keeps
# `prisma migrate deploy` blocked longer than the healthcheck start_period, so
# Docker marks the container unhealthy while this script is still waiting.
case "$DATABASE_URL" in
  *connect_timeout=*) ;;
  *\?*) DATABASE_URL="${DATABASE_URL}&connect_timeout=15" ;;
  *) DATABASE_URL="${DATABASE_URL}?connect_timeout=15" ;;
esac
export DATABASE_URL

echo "[entrypoint] database target: $(db_host "$DATABASE_URL")"

# Bounded retry for TRANSIENT startup races only (e.g. a freshly-created Dokploy database resource
# that isn't accepting connections yet on the very first deploy). `prisma migrate deploy` is safe to
# retry — it is idempotent. This is not a way to paper over a genuinely wrong DATABASE_URL: that fails
# identically every attempt and this still exits non-zero, loudly, once attempts are exhausted.
MAX_ATTEMPTS=5
attempt=1
until bun run db:deploy; do
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "[entrypoint] migrations failed after $MAX_ATTEMPTS attempts against $(db_host "$DATABASE_URL") — giving up." >&2
    exit 1
  fi
  wait_s=$((attempt * 3))
  echo "[entrypoint] migration attempt $attempt/$MAX_ATTEMPTS failed; retrying in ${wait_s}s..." >&2
  sleep "$wait_s"
  attempt=$((attempt + 1))
done

# Fail closed if migrate deploy somehow exited 0 without creating the core tables (empty/wrong DB).
echo "[entrypoint] verifying schema (Category/Vendor/Product)..."
bun --filter @workspace/db verify-schema

echo "[entrypoint] migrations up to date. starting API..."
# `bun run <file>` stays a wrapper (PID 1) around a child bun. Run the bundle
# directly so the server is PID 1 and a wrapper exit cannot kill the container.
# Docker sets HOSTNAME to the container id; Bun must not use that as the bind address.
unset HOSTNAME
exec bun apps/api/dist/index.js
