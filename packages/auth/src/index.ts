import { ROLES, type ActorRole, type Role } from "@workspace/types"

export { ROLES }
export type { ActorRole, Role }

/**
 * Role hierarchy used for "at least this role" checks on the *admin side*.
 * BUYER and VENDOR are peers (neither implies the other); staff/admin tiers stack.
 */
const STAFF_TIER: Record<Role, number> = {
  BUYER: 0,
  VENDOR: 0,
  STAFF: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
}

/** True for any back-office role (STAFF, ADMIN, SUPER_ADMIN). */
export function isBackOffice(role: ActorRole): boolean {
  return role !== "PUBLIC" && STAFF_TIER[role] >= 1
}

/** True when `role` is one of `allowed`. SUPER_ADMIN always passes. */
export function hasRole(role: ActorRole, allowed: readonly Role[]): boolean {
  if (role === "PUBLIC") return false
  if (role === "SUPER_ADMIN") return true
  return allowed.includes(role)
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}

/** Reads a role out of Clerk `publicMetadata`; anything unrecognised falls back to BUYER. */
export function roleFromMetadata(metadata: unknown): Role {
  if (typeof metadata === "object" && metadata !== null && "role" in metadata) {
    const value = (metadata as { role: unknown }).role
    if (isRole(value)) return value
  }
  return "BUYER"
}

/**
 * Roles a user may pick for themselves during onboarding.
 * ADMIN / SUPER_ADMIN / STAFF can only be granted by an admin, never self-selected.
 */
export const SELF_SELECTABLE_ROLES = ["BUYER", "VENDOR"] as const satisfies readonly Role[]
export type SelfSelectableRole = (typeof SELF_SELECTABLE_ROLES)[number]

export function canSelfSelect(role: unknown): role is SelfSelectableRole {
  return typeof role === "string" && (SELF_SELECTABLE_ROLES as readonly string[]).includes(role)
}

/** Only SUPER_ADMIN may grant or revoke admin-tier roles. */
export function canAssignRole(actor: Role, target: Role): boolean {
  if (actor === "SUPER_ADMIN") return true
  if (actor === "ADMIN") return target === "BUYER" || target === "VENDOR" || target === "STAFF"
  return false
}

/** Where each role lands after sign-in. */
export const ROLE_HOME: Record<Role, string> = {
  BUYER: "/buyer",
  VENDOR: "/vendor",
  ADMIN: "/admin",
  SUPER_ADMIN: "/admin",
  STAFF: "/admin",
}

/** URL prefix → roles allowed. Used by the web proxy for optimistic redirects (API stays authoritative). */
export const PORTAL_ACCESS: { prefix: string; roles: readonly Role[] }[] = [
  {
    prefix: "/buyer",
    roles: ["BUYER", "VENDOR", "ADMIN", "SUPER_ADMIN", "STAFF"],
  },
  { prefix: "/vendor", roles: ["VENDOR", "ADMIN", "SUPER_ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN", "SUPER_ADMIN", "STAFF"] },
]
