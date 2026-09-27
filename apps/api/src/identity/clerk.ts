import { createClerkClient, verifyToken } from "@clerk/backend"
import { roleFromMetadata } from "@workspace/auth"

import type { Env } from "../env"
import type { ExternalProfile, IdentityProvider } from "./provider"

/** Extracts the user id from whatever `verifyToken` returned (bare claims, or the legacy `{ data, errors }` wrapper). */
export function subjectFromVerification(result: unknown): string | null {
  if (typeof result !== "object" || result === null) return null
  if ("errors" in result && result.errors) return null
  const claims: unknown = "data" in result ? result.data : result
  if (
    typeof claims === "object" &&
    claims !== null &&
    "sub" in claims &&
    typeof claims.sub === "string" &&
    claims.sub
  ) {
    return claims.sub
  }
  return null
}

export function createClerkIdentity(env: Env): IdentityProvider {
  const secretKey = env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required to verify sessions")
  }
  const client = createClerkClient({ secretKey })

  return {
    async verify(token) {
      try {
        // @clerk/backend v3 throws on an invalid token and returns the verified claims directly; older majors
        // returned `{ data, errors }`. Accept either so an SDK upgrade cannot silently reject every session.
        const result: unknown = await verifyToken(token, {
          secretKey,
          authorizedParties: env.webOrigins,
          // Servers and laptops drift; Clerk's default (5s) rejects valid tokens when the local clock is a few seconds slow.
          clockSkewInMs: 60_000,
        })
        const subject = subjectFromVerification(result)
        if (subject === null) console.warn("[auth] session token rejected or carries no subject")
        return subject === null ? null : { clerkId: subject }
      } catch (error) {
        console.warn(`[auth] token verification failed: ${error instanceof Error ? error.message : "unknown"}`)
        return null
      }
    },

    async fetchProfile(clerkId): Promise<ExternalProfile | null> {
      try {
        const user = await client.users.getUser(clerkId)
        const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0]
        if (!primary) return null
        return {
          email: primary.emailAddress.toLowerCase(),
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
          imageUrl: user.imageUrl || null,
          phone: user.phoneNumbers[0]?.phoneNumber ?? null,
          emailVerified: primary.verification?.status === "verified",
          role: roleFromMetadata(user.publicMetadata),
        }
      } catch (error) {
        console.warn(`[auth] could not load the Clerk profile: ${error instanceof Error ? error.message : "unknown"}`)
        return null
      }
    },

    async syncMetadata(clerkId, metadata) {
      await client.users.updateUserMetadata(clerkId, {
        publicMetadata: { role: metadata.role, onboarded: metadata.onboarded },
      })
    },
  }
}
