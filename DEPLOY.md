# Deploying to Dokploy (Hetzner or any Docker host)

Everything in this guide was built and verified locally before being written down: both
`Dockerfile`s were built with `docker build`, and the full stack (`api` + `web` + the shared
Postgres) was brought up with `docker compose -f docker-compose.prod.yml` and hit over HTTP
(`/api/health` → `200`, `/`, `/products` → `200`, migrations applied with `bun run db:deploy`).
I do not have SSH or Dokploy access to your Hetzner server, so the actual deploy — creating the
Dokploy project, pasting in environment variables, and clicking Deploy — is something you (or
someone with access) needs to do by following the steps below. Ask me if any step's output looks
wrong and I'll help debug it.

## What's in the repo for this

| File | Purpose |
| --- | --- |
| [`apps/api/Dockerfile`](apps/api/Dockerfile) | Multi-stage Bun build of the Hono API |
| [`apps/web/Dockerfile`](apps/web/Dockerfile) | Multi-stage Bun + Next.js standalone build |
| [`docker-compose.prod.yml`](docker-compose.prod.yml) | The two services above, for Dokploy's "Docker Compose" application type |
| [`.env.production.example`](.env.production.example) | Every variable the compose file needs, with comments |
| `.dockerignore` | Keeps `node_modules`, `.next`, uploads, etc. out of the build context |

The root [`docker-compose.yml`](docker-compose.yml) is unrelated — it's a local-only Postgres for
development and is not used in production (`docker-compose.prod.yml` has its own separate `postgres`
service, on its own named volume — the two never share data).

## 0. Prerequisites

- A Hetzner server with Dokploy installed (`curl -sSL https://dokploy.com/install.sh | sh`, per
  [Dokploy's own docs](https://docs.dokploy.com/docs/core/installation) — run that on the server,
  not here).
- This repository pushed to a Git host (GitHub/GitLab/etc.) that your Dokploy instance can reach.
- Two DNS records pointed at your server's IP: your main domain (`yourdomain.com`) and an API
  subdomain (`api.yourdomain.com`). Dokploy/Traefik issues Let's Encrypt certificates for both
  automatically once they resolve and a domain is configured (step 4).
- A **production** Clerk instance (Clerk Dashboard → your app → the environment switcher). Don't
  reuse the development instance — it has strict usage limits and a "development mode" watermark.

## 1. Database

Postgres runs as its own service (`postgres`) inside `docker-compose.prod.yml`, on a persistent named
volume (`postgres_data`) — **you do not create a separate Dokploy "Database" resource**, and you do
not set `DATABASE_URL` directly. It's derived automatically from `POSTGRES_DB`/`POSTGRES_USER`/
`POSTGRES_PASSWORD` (step 3), pointing at the compose service name `postgres` — never `localhost`.

This trades away Dokploy's managed-database backups/upgrades for one less moving part and one less
place to misconfigure (a manually-pasted `DATABASE_URL` was the single biggest source of production
issues in this project's deploy history — copy-pasted local-dev values, wrong databases, etc.). If you
want Dokploy's managed database back later, see the comment at the top of `docker-compose.prod.yml`.

Set a **strong, unique** `POSTGRES_PASSWORD` in step 3 — generate one with a password manager or
`openssl rand -base64 24`, never reuse a password from elsewhere. Never paste a real password into
chat, a commit, or any tracked file — only into Dokploy's Environment tab.

**Do not reuse this repo's own dev `DATABASE_URL`** from `.env`/`.env.example` (`localhost:5433`) —
that's the local-only dev Postgres from the root [`docker-compose.yml`](docker-compose.yml). Inside a
container, `localhost` always means the container itself; the api container's entrypoint refuses to
start on a `localhost`/`127.0.0.1` `DATABASE_URL` rather than guess what you meant.

## 2. Create the Compose application

**Project → Create → Application → Docker Compose** (or add it to the same project as the
database). Point it at your Git repo, branch, and set:

- **Compose Path**: `docker-compose.prod.yml`
- **Build context**: repo root (the compose file's `build.context: .` expects this)

## 3. Set environment variables

Open the application's **Environment** tab and paste in the contents of
[`.env.production.example`](.env.production.example) with real values filled in. This one box
covers *both* services — the compose file's `${VAR}` references are filled from it for `api` and
`web` alike.

Fill in at minimum:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` — from step 1. `DATABASE_URL` is derived from
  these automatically; do not set it yourself.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — from your **production** Clerk instance.
- `SUPER_ADMIN_EMAILS` — your own email. You become `SUPER_ADMIN` the first time you sign in with
  a Clerk-verified address that's on this list (see `apps/api/src/middleware/auth.ts`). Set this
  *before* your first deploy so you can reach `/admin` right away.
- `WEB_ORIGIN=https://yourdomain.com`
- `PUBLIC_API_URL=https://api.yourdomain.com`
- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`

## 4. Configure domains

Don't edit `docker-compose.prod.yml` to add Traefik labels or a `dokploy-network` — Dokploy's
documented, recommended approach is to configure domains entirely from its UI, which injects the
routing config for you. Open the application's **Domains** tab and add two:

| Service | Host | Container Port | HTTPS |
| --- | --- | --- | --- |
| `web` | `yourdomain.com` (and `www` if you use it) | `3000` | on |
| `api` | `api.yourdomain.com` | `4100` | on |

## 5. Deploy

Click **Deploy**. Dokploy runs `docker compose build` then `up -d` on the server — exactly what I
tested locally. Watch the build logs; a failure here is almost always a missing/misspelled
environment variable (Next.js's build step needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to be a
syntactically valid Clerk key, or the `web` build fails).

The API image's entrypoint runs `bun run db:deploy` (Prisma `migrate deploy`) before the server
listens, so schema migrations apply automatically on each container start. That command only
applies committed migrations under `packages/db/prisma/migrations` — it never resets or drops data.

Do **not** run `bun run db:seed` in production — it loads demo/placeholder listings. It refuses to
run at all unless you explicitly pass `SEED_ALLOW_PRODUCTION=true`.

## 6. Verify

```bash
curl https://api.yourdomain.com/api/health
```

should return `{"success":true,"data":{"status":"ok","database":"up",...}}` — this is the exact
shape I got locally. Then open `https://yourdomain.com`, sign in with your `SUPER_ADMIN_EMAILS`
address, and confirm `/admin` loads.

## Notes and limits

- **Uploads are local disk**, on a named volume (`api_uploads`) so they survive a redeploy of the
  `api` service. They will *not* survive moving to multiple `api` replicas, and Dokploy has no
  built-in way to share that volume across replicas. If you need horizontal scaling, swap the
  storage driver (`apps/api/src/lib/storage.ts`, a small interface) for Hetzner Object Storage (S3
  compatible) or R2 before scaling past one replica.
- **Firewall**: Dokploy/Traefik terminate TLS on 80/443. The compose file also publishes 3000 and
  4100 directly on the host (Dokploy's own documented convention for compose services — see the
  comments in `docker-compose.prod.yml`). Consider restricting external access to 80/443 only in
  Hetzner's firewall, so 3000/4100 are reachable container-to-container but not directly from the
  internet.
- **Rate limits**: the API's in-memory rate limiter (`apps/api/src/middleware/rate-limit.ts`) is
  per-process. Fine for one replica; back it with Redis before running more than one.
- I have not tested a real Clerk **production** key end to end (only the format-invalid
  placeholder used to validate the Docker build, and the development key used throughout this
  project). Please confirm sign-in after deploy. Clerk webhooks are not used: the API creates the
  local user row on the first authenticated request from a verified session.

Sources on Dokploy's Compose/domain conventions used above: [Docker Compose overview](https://docs.dokploy.com/docs/core/docker-compose), [Domains — Docker Compose](https://docs.dokploy.com/docs/core/docker-compose/domains), [Compose example](https://docs.dokploy.com/docs/core/docker-compose/example), [Environment Variables](https://docs.dokploy.com/docs/core/variables), [Database connections](https://docs.dokploy.com/docs/core/databases/connection).
