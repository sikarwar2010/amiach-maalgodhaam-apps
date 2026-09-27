// Creates the *_test database if needed and applies migrations to it (non-destructive: `migrate deploy`).
import { fileURLToPath } from "node:url"

import { SQL } from "bun"

import { testDatabaseUrl } from "./db-url"

const url = new URL(testDatabaseUrl())
const dbName = url.pathname.replace(/^\//, "")

const admin = new URL(url.toString())
admin.pathname = "/postgres"
admin.search = ""
const sql = new SQL(admin.toString())
const exists = await sql`SELECT 1 AS one FROM pg_database WHERE datname = ${dbName}`
if (exists.length === 0) {
  // The name was validated above (must end in _test); strip quotes defensively anyway.
  await sql.unsafe(`CREATE DATABASE "${dbName.replaceAll('"', "")}"`)
  console.log(`created database ${dbName}`)
}
await sql.close()

const proc = Bun.spawnSync(["bunx", "prisma", "migrate", "deploy"], {
  cwd: fileURLToPath(new URL("../../../packages/db", import.meta.url)),
  env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
  stdout: "pipe",
  stderr: "pipe",
})
if (proc.exitCode !== 0) {
  console.error(proc.stdout.toString(), proc.stderr.toString())
  throw new Error("prisma migrate deploy failed for the test database")
}
