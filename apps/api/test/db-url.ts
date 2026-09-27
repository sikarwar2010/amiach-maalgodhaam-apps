/**
 * Integration tests run against a real Postgres. To make it impossible to point them at a real
 * database by accident, the database name MUST end in `_test` — the suite truncates every table.
 */
export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL
  const base = explicit ?? "postgresql://maalgodaam:maalgodaam_dev@localhost:5433/maalgodaam_test?schema=public"
  const name = new URL(base).pathname.replace(/^\//, "")
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to run tests against "${name}": database name must end with _test`)
  }
  return base
}
