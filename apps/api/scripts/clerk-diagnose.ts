// Read-only diagnostic: confirms CLERK_SECRET_KEY works and shows (redacted) what the API would see for each user.
// Run from apps/api:  bun scripts/clerk-diagnose.ts
import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { createClerkClient } from "@clerk/backend"

const rootEnv = resolve(import.meta.dirname, "../../../.env")
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const secretKey = process.env.CLERK_SECRET_KEY
if (!secretKey) {
  console.error("CLERK_SECRET_KEY is not set")
  process.exit(1)
}

const redact = (email: string) => email.replace(/^(.).*(@.*)$/, "$1***$2")

const client = createClerkClient({ secretKey })
const { data, totalCount } = await client.users.getUserList({ limit: 10 })
console.log(`Clerk reachable. Users in this instance: ${totalCount}`)
for (const u of data) {
  const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0]
  console.log({
    id: u.id,
    email: primary ? redact(primary.emailAddress) : null,
    verification: primary?.verification?.status ?? null,
    publicMetadata: u.publicMetadata,
  })
}
