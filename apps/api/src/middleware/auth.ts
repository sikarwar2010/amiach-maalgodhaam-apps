import { hasRole } from "@workspace/auth"
import { Prisma } from "@workspace/db"
import type { Role } from "@workspace/types"
import type { Context, MiddlewareHandler } from "hono"
import { createMiddleware } from "hono/factory"

import type { AppEnv, CurrentUser } from "../context"
import { audit } from "../lib/audit"
import { isBootstrapAdmin } from "../lib/bootstrap"
import { conflict, forbidden, unauthorized } from "../lib/errors"

const userSelect = {
  id: true,
  clerkId: true,
  email: true,
  name: true,
  phone: true,
  imageUrl: true,
  role: true,
  status: true,
  onboarded: true,
} as const satisfies Prisma.UserSelect

/**
 * Resolves the caller from the verified bearer token. Identity comes only from the token's
 * subject; a missing/invalid token simply leaves the request anonymous (PUBLIC).
 */
export const attachUser = createMiddleware<AppEnv>(async (c, next) => {
  c.set("user", null)
  const header = c.req.header("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null

  if (token) {
    const identity = await c.get("identity").verify(token)
    if (!identity) console.warn(`[auth] ${c.req.method} ${c.req.path}: bearer token present but not accepted`)
    if (identity) {
      const user = await resolveUser(c.get("db"), c.get("identity"), identity.clerkId)
      if (!user)
        console.warn(`[auth] ${c.req.path}: token verified for ${identity.clerkId} but no user could be resolved`)
      c.set("user", user && (await applyBootstrapAdmin(c, user)))
    }
  }
  await next()
})

/** Promotes the operator's own (verified) address to SUPER_ADMIN, in the database and in Clerk metadata. */
async function applyBootstrapAdmin(c: Context<AppEnv>, user: CurrentUser): Promise<CurrentUser> {
  const env = c.get("env")
  if (user.role === "SUPER_ADMIN" || user.status !== "ACTIVE") return user
  if (!env.superAdminEmails.includes(user.email.toLowerCase())) return user

  const profile = await c.get("identity").fetchProfile(user.clerkId)
  if (
    !profile ||
    profile.email.toLowerCase() !== user.email.toLowerCase() ||
    !isBootstrapAdmin(env, profile.email, profile.emailVerified)
  ) {
    return user
  }
  const db = c.get("db")
  const promoted = await db.$transaction(async (tx) => {
    const row = await tx.user.update({
      where: { id: user.id },
      data: { role: "SUPER_ADMIN", onboarded: true },
      select: userSelect,
    })
    await audit(tx, {
      actor: null,
      action: "user.bootstrap_super_admin",
      entityType: "User",
      entityId: user.id,
      metadata: { from: user.role },
    })
    return row
  })
  await c
    .get("identity")
    .syncMetadata(user.clerkId, { role: "SUPER_ADMIN", onboarded: true })
    .catch(() => undefined)
  return promoted
}

async function resolveUser(
  db: AppEnv["Variables"]["db"],
  identity: AppEnv["Variables"]["identity"],
  clerkId: string
): Promise<CurrentUser | null> {
  const existing = await db.user.findUnique({
    where: { clerkId },
    select: userSelect,
  })
  if (existing) return existing.status === "DELETED" ? null : existing

  // First authenticated request creates the row from the verified Clerk profile.
  const profile = await identity.fetchProfile(clerkId)
  if (!profile) return null
  try {
    return await db.user.create({
      data: {
        clerkId,
        email: profile.email,
        name: profile.name,
        imageUrl: profile.imageUrl,
        phone: profile.phone,
        role: profile.role,
      },
      select: userSelect,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await db.user.findUnique({
        where: { clerkId },
        select: userSelect,
      })
      if (raced) return raced
      throw conflict("An account with this email already exists")
    }
    throw error
  }
}

/** 401 when anonymous, 403 when the account is suspended. Narrows `c.get("user")` for handlers via `currentUser`. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get("user")
  if (!user) throw unauthorized()
  if (user.status !== "ACTIVE") throw forbidden("This account is suspended")
  await next()
}

export function requireRole(...allowed: Role[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get("user")
    if (!user) throw unauthorized()
    if (user.status !== "ACTIVE") throw forbidden("This account is suspended")
    if (!hasRole(user.role, allowed)) throw forbidden()
    await next()
  }
}

/** Handler-side accessor; only valid behind requireAuth/requireRole. */
export function currentUser(c: { get: (k: "user") => CurrentUser | null }): CurrentUser {
  const user = c.get("user")
  if (!user) throw unauthorized()
  return user
}
