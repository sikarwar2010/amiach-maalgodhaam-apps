# syntax=docker/dockerfile:1
#
# Production image for the Hono API. Build from the REPO ROOT so the whole workspace is visible:
#   docker build -f apps/api/Dockerfile -t maalgodaam-api .
#
# 1. pruner   — turbo trims the monorepo down to what `api` actually needs (out/full).
# 2. installer — installs deps for that subset (runs `prisma generate` via postinstall) and builds.
# 3. runner   — copies only the installed result; runs as a non-root user.

FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS pruner
# libc6-compat: some native deps (bun's own, occasionally) expect glibc-shaped symlinks on musl.
RUN apk add --no-cache libc6-compat
COPY . .
RUN bunx turbo prune api --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat openssl
# The full pruned source (not just package.json) — `prisma generate` (packages/db's postinstall)
# needs prisma/schema.prisma to exist before `bun install` runs.
COPY --from=pruner /app/out/full/ .
# `turbo prune --docker` writes the pruned lockfile to out/bun.lock, a SIBLING of out/full/ — it is
# not inside it. Without this, `--frozen-lockfile` has no lockfile to freeze against and silently
# writes a new one (`bun install` logs "Saved lockfile"), which can install different versions than
# the ones actually pinned in the repo.
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile
RUN bunx turbo run build --filter=api

FROM base AS runner
# The Prisma query engine links against OpenSSL at runtime.
RUN apk add --no-cache openssl && \
    addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=installer --chown=app:app /app .
USER app

ENV NODE_ENV=production
ARG API_PORT=4100
ENV API_PORT=${API_PORT}
EXPOSE ${API_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${API_PORT}/api/health" || exit 1

CMD ["bun", "run", "apps/api/dist/index.js"]
