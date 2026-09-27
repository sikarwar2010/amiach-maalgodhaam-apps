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
# If migrations fail (e.g. the database isn't reachable yet), this script exits non-zero and the
# container exits; Docker's `restart: unless-stopped` retries it. The API must never start serving
# requests against an unmigrated schema.
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

# `.env` uses localhost so host-side tools can reach the published Postgres port.
# Inside this container, localhost is the container itself (P1001). The host gateway
# is host.docker.internal (Docker Desktop, or extra_hosts host-gateway on Linux).
case "$DATABASE_URL" in
  *@localhost:*|*@localhost/*|*@127.0.0.1:*|*@127.0.0.1/*)
    DATABASE_URL=$(printf '%s' "$DATABASE_URL" | sed -E 's#@(localhost|127\.0\.0\.1)#@host.docker.internal#')
    export DATABASE_URL
    echo "[entrypoint] rewrote database host localhost -> host.docker.internal (localhost is this container)"
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

echo "[entrypoint] applying database migrations (prisma migrate deploy)..."
bun run db:deploy

# Fail closed if migrate deploy somehow exited 0 without creating the core tables (empty/wrong DB).
echo "[entrypoint] verifying schema (Category/Vendor/Product)..."
bun --filter @workspace/db verify-schema

echo "[entrypoint] migrations up to date. starting API..."
# `bun run <file>` stays a wrapper (PID 1) around a child bun. Run the bundle
# directly so the server is PID 1 and a wrapper exit cannot kill the container.
# Docker sets HOSTNAME to the container id; Bun must not use that as the bind address.
unset HOSTNAME
exec bun apps/api/dist/index.js
