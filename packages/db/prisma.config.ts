import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig } from "prisma/config"

// Local dev: pick up the repo-root .env. In CI/production real env vars win (loadEnvFile never overrides).
const rootEnv = resolve(import.meta.dirname, "../../.env")
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

// Prisma 7 reads the connection URL from here, not from schema.prisma.
// Migrations run against DATABASE_URL (use a direct, non-pooled URL in production).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun run prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
})
