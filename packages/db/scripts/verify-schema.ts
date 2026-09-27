/**
 * Production entrypoint gate: confirm core tables exist after `migrate deploy`.
 * Exits non-zero if Category/Vendor/Product are missing (typical P2021 cause).
 */
import { createPrismaClient } from "../src/client"

const db = createPrismaClient()
try {
  await db.$queryRaw`SELECT 1 FROM "Category" LIMIT 1`
  await db.$queryRaw`SELECT 1 FROM "Vendor" LIMIT 1`
  await db.$queryRaw`SELECT 1 FROM "Product" LIMIT 1`
  console.log("[verify-schema] Category, Vendor, and Product are present")
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error("[verify-schema] required tables are missing:", message)
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
