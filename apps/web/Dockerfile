# syntax=docker/dockerfile:1
#
# Production image for the Next.js storefront. Build from the REPO ROOT:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
#     -t maalgodaam-web .
#
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so they must be passed as
# --build-arg (docker-compose.prod.yml does this from Dokploy's environment variables) — setting
# them only at `docker run` time has no effect on already-built pages.

FROM oven/bun:1-alpine AS base
WORKDIR /app

FROM base AS pruner
RUN apk add --no-cache libc6-compat
COPY . .
RUN bunx turbo prune web --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat
# The full pruned source (not just package.json), so workspace packages resolve during the build.
COPY --from=pruner /app/out/full/ .
RUN bun install --frozen-lockfile

ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/account
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/register
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_URL} \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_URL} \
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=${NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL} \
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=${NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL} \
    NODE_ENV=production
RUN bunx turbo run build --filter=web

FROM base AS runner
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
# Standalone output only traces node_modules + server.js; static assets and public/ are copied in separately.
COPY --from=installer --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=installer --chown=app:app /app/apps/web/public ./apps/web/public
COPY --from=installer --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
USER app

ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" || exit 1

CMD ["bun", "apps/web/server.js"]
