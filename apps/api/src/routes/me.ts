import type { SessionUser } from "@workspace/types"
import {
  addressInput,
  buyerProfileInput,
  idParam,
  onboardingBuyerInput,
  pageQuery,
  updateProfileInput,
} from "@workspace/validators"
import { Hono, type Context } from "hono"

import type { AppEnv } from "../context"
import { audit } from "../lib/audit"
import { notFound, validation } from "../lib/errors"
import { jsonBody, ok, page, pageMeta, params, query, skipTake } from "../lib/http"
import { clientIp } from "../lib/ip"
import { currentUser, requireAuth } from "../middleware/auth"

export const meRoutes = new Hono<AppEnv>()

meRoutes.use("*", requireAuth)

async function sessionUser(c: Context<AppEnv>): Promise<SessionUser> {
  const user = currentUser(c)
  const db = c.get("db")
  const [vendor, unreadNotifications] = await Promise.all([
    db.vendor.findUnique({ where: { userId: user.id }, select: { status: true } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ])
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
    phone: user.phone,
    role: user.role,
    onboarded: user.onboarded,
    vendorStatus: vendor?.status ?? null,
    unreadNotifications,
  }
}

/** Who am I? The single source of truth the UI uses for *display* (never for authorization). */
meRoutes.get("/", async (c) => ok(c, await sessionUser(c)))

meRoutes.patch("/", async (c) => {
  const user = currentUser(c)
  const input = await jsonBody(c, updateProfileInput)
  const updated = await c.get("db").user.update({
    where: { id: user.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    },
    select: { id: true, name: true, phone: true },
  })
  return ok(c, updated)
})

/* ------------------------------- onboarding ------------------------------- */

meRoutes.post("/onboarding/buyer", async (c) => {
  const user = currentUser(c)
  const input = await jsonBody(c, onboardingBuyerInput)
  const db = c.get("db")

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { name: input.name, phone: input.phone, onboarded: true },
    })
    await tx.buyerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        buyerType: input.buyerType,
        companyName: input.companyName ?? null,
        gstin: input.gstin ?? null,
        pan: input.pan ?? null,
        businessType: input.businessType ?? null,
      },
      update: {
        buyerType: input.buyerType,
        companyName: input.companyName ?? null,
        gstin: input.gstin ?? null,
        pan: input.pan ?? null,
        businessType: input.businessType ?? null,
      },
    })
    await audit(tx, {
      actor: user,
      action: "buyer.onboarded",
      entityType: "User",
      entityId: user.id,
      ip: clientIp(c),
    })
  })

  // Best-effort: keeps the web proxy's optimistic routing in step. The DB stays authoritative.
  await c
    .get("identity")
    .syncMetadata(user.clerkId, { role: user.role, onboarded: true })
    .catch(() => undefined)

  return ok(c, await sessionUser(c))
})

meRoutes.get("/buyer-profile", async (c) => {
  const user = currentUser(c)
  const profile = await c.get("db").buyerProfile.findUnique({ where: { userId: user.id } })
  return ok(c, profile)
})

meRoutes.put("/buyer-profile", async (c) => {
  const user = currentUser(c)
  const input = await jsonBody(c, buyerProfileInput)
  if (input.buyerType === "BUSINESS" && !input.companyName) {
    throw validation("Business buyers need a company name", [
      { path: "companyName", message: "Required for business buyers" },
    ])
  }
  const data = {
    buyerType: input.buyerType,
    companyName: input.companyName ?? null,
    gstin: input.gstin ?? null,
    pan: input.pan ?? null,
    businessType: input.businessType ?? null,
    about: input.about ?? null,
  }
  const profile = await c.get("db").buyerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  })
  return ok(c, profile)
})

/* -------------------------------- addresses ------------------------------- */

meRoutes.get("/addresses", async (c) => {
  const user = currentUser(c)
  const rows = await c.get("db").address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  })
  return ok(c, rows)
})

meRoutes.post("/addresses", async (c) => {
  const user = currentUser(c)
  const input = await jsonBody(c, addressInput)
  const db = c.get("db")
  const created = await db.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: user.id } })
    const makeDefault = input.isDefault || count === 0
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      })
    }
    return tx.address.create({
      data: {
        userId: user.id,
        type: input.type,
        label: input.label ?? null,
        fullName: input.fullName,
        phone: input.phone,
        line1: input.line1,
        line2: input.line2 ?? null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        isDefault: makeDefault,
      },
    })
  })
  return ok(c, created, 201)
})

meRoutes.put("/addresses/:id", async (c) => {
  const user = currentUser(c)
  const { id } = params(c, idParam)
  const input = await jsonBody(c, addressInput)
  const db = c.get("db")
  const updated = await db.$transaction(async (tx) => {
    // Ownership is part of the query: another user's id is indistinguishable from a missing one.
    const existing = await tx.address.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) throw notFound("Address")
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      })
    }
    return tx.address.update({
      where: { id },
      data: {
        type: input.type,
        label: input.label ?? null,
        fullName: input.fullName,
        phone: input.phone,
        line1: input.line1,
        line2: input.line2 ?? null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        isDefault: input.isDefault,
      },
    })
  })
  return ok(c, updated)
})

meRoutes.delete("/addresses/:id", async (c) => {
  const user = currentUser(c)
  const { id } = params(c, idParam)
  const result = await c.get("db").address.deleteMany({ where: { id, userId: user.id } })
  if (result.count === 0) throw notFound("Address")
  return ok(c, { deleted: true })
})

/* ------------------------------ notifications ----------------------------- */

meRoutes.get("/notifications", async (c) => {
  const user = currentUser(c)
  const q = query(c, pageQuery)
  const db = c.get("db")
  const where = { userId: user.id }
  const [total, unread, rows] = await Promise.all([
    db.notification.count({ where }),
    db.notification.count({ where: { ...where, readAt: null } }),
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(q),
    }),
  ])
  c.header("X-Unread-Count", String(unread))
  return page(c, rows, pageMeta(total, q.page, q.pageSize))
})

meRoutes.post("/notifications/:id/read", async (c) => {
  const user = currentUser(c)
  const { id } = params(c, idParam)
  const result = await c.get("db").notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  })
  return ok(c, { updated: result.count })
})

meRoutes.post("/notifications/read-all", async (c) => {
  const user = currentUser(c)
  const result = await c.get("db").notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  })
  return ok(c, { updated: result.count })
})
