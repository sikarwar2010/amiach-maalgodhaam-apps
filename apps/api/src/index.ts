import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { getDb } from "@workspace/db"

// Local dev: pick up the repo-root .env. Real environment variables always win.
const rootEnv = resolve(import.meta.dirname, "../../../.env")
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const { createApp } = await import("./app")
const { loadEnv } = await import("./env")
const { createClerkIdentity } = await import("./identity/clerk")
const { createUnconfiguredIdentity } = await import("./identity/provider")
const { createLocalStorage } = await import("./lib/storage")

const env = loadEnv()
if (!env.CLERK_SECRET_KEY) {
  console.warn("CLERK_SECRET_KEY is not set: sign-in is disabled, only public endpoints will work.")
}
const identity = env.CLERK_SECRET_KEY ? createClerkIdentity(env) : createUnconfiguredIdentity()
const app = createApp({
  db: getDb(),
  env,
  identity,
  storage: createLocalStorage(env.UPLOAD_DIR),
})

console.log(`API listening on http://localhost:${env.API_PORT}`)

export default {
  port: env.API_PORT,
  fetch: app.fetch,
}
