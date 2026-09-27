import type { PrismaClient, User } from "@workspace/db"

import type { Env } from "./env"
import type { IdentityProvider } from "./identity/provider"
import type { StorageDriver } from "./lib/storage"

/** The authenticated caller as resolved from the *verified* session — never from request input. */
export type CurrentUser = Pick<
  User,
  "id" | "clerkId" | "email" | "name" | "phone" | "imageUrl" | "role" | "status" | "onboarded"
>

export type AppEnv = {
  Variables: {
    db: PrismaClient
    env: Env
    identity: IdentityProvider
    storage: StorageDriver
    user: CurrentUser | null
    requestId: string
  }
}
