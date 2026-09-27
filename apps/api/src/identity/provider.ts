import type { Role } from "@workspace/types"

export interface VerifiedIdentity {
  clerkId: string
}

export interface ExternalProfile {
  email: string
  name: string | null
  imageUrl: string | null
  phone: string | null
  /** Whether the identity provider has verified this e-mail address (proof the person owns it). */
  emailVerified: boolean
  /** Role stored in Clerk public metadata (set only by the backend or the Clerk dashboard). */
  role: Role
}

/**
 * Seam between the API and the identity provider (Clerk in production).
 * Tests inject an in-memory implementation; nothing else in the API talks to Clerk directly.
 */
export interface IdentityProvider {
  /** Returns the verified subject for a bearer token, or null when the token is invalid/expired. */
  verify(token: string): Promise<VerifiedIdentity | null>
  fetchProfile(clerkId: string): Promise<ExternalProfile | null>
  /** Mirror a role/onboarding change into Clerk public metadata so the web proxy can route optimistically. */
  syncMetadata(clerkId: string, metadata: { role: Role; onboarded: boolean }): Promise<void>
}

/** Used in development when Clerk keys are absent: every request stays anonymous, public routes still work. */
export function createUnconfiguredIdentity(): IdentityProvider {
  return {
    verify: async () => null,
    fetchProfile: async () => null,
    syncMetadata: async () => undefined,
  }
}
