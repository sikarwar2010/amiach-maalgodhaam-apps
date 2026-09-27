/**
 * Production entrypoint gate: confirm core tables exist after `migrate deploy`.
 * Exits non-zero if Category/Vendor/Product are missing (typical P2021 cause).
 */
import { createPrismaClient } from "../src/client"

const db = createPrismaClient()
let exitCode = 0
try {
  await db.$queryRaw`SELECT 1 FROM "Category" LIMIT 1`
  await db.$queryRaw`SELECT 1 FROM "Vendor" LIMIT 1`
  await db.$queryRaw`SELECT 1 FROM "Product" LIMIT 1`
  console.log("[verify-schema] Category, Vendor, and Product are present")
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error("[verify-schema] required tables are missing or the database is unreachable:", message)
  exitCode = 1
}

// `$disconnect()` waits for the pg pool. A stuck connection would keep this process alive and block
// the entrypoint from ever starting the server, so Docker's healthcheck fails with "unhealthy".
await Promise.race([db.$disconnect(), new Promise((resolve) => setTimeout(resolve, 5_000))])
process.exit(exitCode)
