import { beforeEach, describe, expect, test } from "bun:test"

import { call, db, get, knownProfiles, makeUser, makeVendor, patch, post, resetDb } from "./helpers"

beforeEach(resetDb)

describe("health & envelope", () => {
  test("GET /api/health reports database up", async () => {
    const r = await get<{ status: string; database: string }>("/api/health")
    expect(r.status).toBe(200)
    expect(r.body.success).toBe(true)
    expect(r.body.data?.database).toBe("up")
  })

  test("unknown routes use the error envelope", async () => {
    const r = await get("/api/nope")
    expect(r.status).toBe(404)
    expect(r.body).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
    })
  })

  test("malformed JSON is a validation error, not a 500", async () => {
    const buyer = await makeUser("BUYER")
    const res = await call("POST", "/api/cart/items", {
      as: buyer.clerkId,
      headers: { "content-type": "application/json" },
    })
    expect([422, 400]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })
})

describe("authentication", () => {
  test("protected routes need a session", async () => {
    for (const path of ["/api/me", "/api/cart", "/api/orders", "/api/vendor/profile", "/api/admin/dashboard"]) {
      const r = await get(path)
      expect(r.status).toBe(401)
      expect(r.body.error?.code).toBe("UNAUTHORIZED")
    }
  })

  test("an invalid token is treated as anonymous", async () => {
    const r = await call("GET", "/api/me", {
      headers: { authorization: "Bearer garbage" },
    })
    expect(r.status).toBe(401)
  })

  test("public routes work without a session", async () => {
    expect((await get("/api/products")).status).toBe(200)
    expect((await get("/api/categories")).status).toBe(200)
  })

  test("first request from a Clerk user provisions a BUYER — never trusting client input", async () => {
    knownProfiles.set("clerk_new", {
      email: "new@example.com",
      name: "New Person",
      imageUrl: null,
      phone: null,
      emailVerified: true,
      role: "BUYER",
    })
    const r = await get<{ role: string; email: string }>("/api/me", "clerk_new")
    expect(r.status).toBe(200)
    expect(r.body.data?.role).toBe("BUYER")
    expect(await db.user.count({ where: { clerkId: "clerk_new" } })).toBe(1)
  })

  test("suspended accounts are refused", async () => {
    const u = await makeUser("BUYER", { status: "SUSPENDED" })
    const r = await get("/api/me", u.clerkId)
    expect(r.status).toBe(403)
  })
})

describe("role-based access", () => {
  test("BUYER cannot reach vendor or admin APIs", async () => {
    const buyer = await makeUser("BUYER")
    expect((await get("/api/vendor/profile", buyer.clerkId)).status).toBe(403)
    expect((await get("/api/vendor/products", buyer.clerkId)).status).toBe(403)
    expect((await get("/api/admin/dashboard", buyer.clerkId)).status).toBe(403)
    expect((await get("/api/admin/users", buyer.clerkId)).status).toBe(403)
  })

  test("VENDOR cannot reach admin APIs", async () => {
    const { user } = await makeVendor()
    expect((await get("/api/vendor/profile", user.clerkId)).status).toBe(200)
    expect((await get("/api/admin/dashboard", user.clerkId)).status).toBe(403)
  })

  test("STAFF can read admin data but not change roles", async () => {
    const staff = await makeUser("STAFF")
    const target = await makeUser("BUYER")
    expect((await get("/api/admin/dashboard", staff.clerkId)).status).toBe(200)
    const r = await patch(`/api/admin/users/${target.id}/role`, { role: "VENDOR" }, staff.clerkId)
    expect(r.status).toBe(403)
  })

  test("ADMIN cannot mint admins or touch themselves; SUPER_ADMIN can", async () => {
    const admin = await makeUser("ADMIN")
    const superAdmin = await makeUser("SUPER_ADMIN")
    const target = await makeUser("BUYER")
    expect((await patch(`/api/admin/users/${target.id}/role`, { role: "ADMIN" }, admin.clerkId)).status).toBe(403)
    expect((await patch(`/api/admin/users/${admin.id}/role`, { role: "BUYER" }, admin.clerkId)).status).toBe(403)
    expect((await patch(`/api/admin/users/${superAdmin.id}/role`, { role: "BUYER" }, admin.clerkId)).status).toBe(403)
    const ok = await patch(`/api/admin/users/${target.id}/role`, { role: "ADMIN" }, superAdmin.clerkId)
    expect(ok.status).toBe(200)
    const audit = await db.auditLog.findFirst({
      where: { action: "user.role_changed", entityId: target.id },
    })
    expect(audit?.actorId).toBe(superAdmin.id)
  })
})

describe("vendor registration", () => {
  const body = {
    businessName: "Shree Tiles",
    contactName: "Ramesh",
    phone: "9876543210",
    gstin: "24AAAAA0000A1Z5",
    addressLine: "Plot 4, Ceramic Zone",
    city: "Morbi",
    state: "Gujarat",
    pincode: "363641",
  }

  test("a buyer becomes a PENDING vendor and the server (not the body) sets the role", async () => {
    const buyer = await makeUser("BUYER")
    const r = await post("/api/vendor/register", { ...body, role: "ADMIN", status: "APPROVED" }, buyer.clerkId)
    expect(r.status).toBe(201)
    const vendor = await db.vendor.findUnique({ where: { userId: buyer.id } })
    expect(vendor?.status).toBe("PENDING")
    expect((await db.user.findUnique({ where: { id: buyer.id } }))?.role).toBe("VENDOR")
  })

  test("duplicate registrations and duplicate GSTINs conflict", async () => {
    const a = await makeUser("BUYER")
    const b = await makeUser("BUYER")
    expect((await post("/api/vendor/register", body, a.clerkId)).status).toBe(201)
    expect((await post("/api/vendor/register", body, a.clerkId)).status).toBe(409)
    expect((await post("/api/vendor/register", body, b.clerkId)).status).toBe(409)
  })

  test("invalid GSTIN is a 422 with field details", async () => {
    const buyer = await makeUser("BUYER")
    const r = await post("/api/vendor/register", { ...body, gstin: "bad" }, buyer.clerkId)
    expect(r.status).toBe(422)
    expect(r.body.error?.details?.some((d) => d.path === "gstin")).toBe(true)
  })

  test("admin approval publishes the vendor publicly; public profile hides tax ids", async () => {
    const buyer = await makeUser("BUYER")
    const admin = await makeUser("ADMIN")
    await post("/api/vendor/register", body, buyer.clerkId)
    const vendor = await db.vendor.findUniqueOrThrow({
      where: { userId: buyer.id },
    })
    expect((await get(`/api/vendors/${vendor.slug}`)).status).toBe(404)
    const d = await post(`/api/admin/vendors/${vendor.id}/decision`, { status: "APPROVED" }, admin.clerkId)
    expect(d.status).toBe(200)
    const pub = await get<Record<string, unknown>>(`/api/vendors/${vendor.slug}`)
    expect(pub.status).toBe(200)
    expect(pub.body.data).not.toHaveProperty("gstin")
    expect(pub.body.data).not.toHaveProperty("phone")
    expect(pub.body.data).not.toHaveProperty("email")
  })
})

describe("individual sellers", () => {
  test("an individual can register without a GSTIN or street address", async () => {
    const buyer = await makeUser("BUYER")
    const r = await post(
      "/api/vendor/register",
      {
        vendorType: "INDIVIDUAL",
        businessName: "Asha Rao",
        contactName: "Asha Rao",
        phone: "9876543210",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
      },
      buyer.clerkId
    )
    expect(r.status).toBe(201)
    const vendor = await db.vendor.findUniqueOrThrow({
      where: { userId: buyer.id },
    })
    expect(vendor.vendorType).toBe("INDIVIDUAL")
    expect(vendor.gstin).toBeNull()
    expect(vendor.status).toBe("PENDING")
  })

  test("business vendors still need GSTIN and address", async () => {
    const buyer = await makeUser("BUYER")
    const r = await post(
      "/api/vendor/register",
      {
        vendorType: "BUSINESS",
        businessName: "X Traders",
        contactName: "X",
        phone: "9876543210",
        city: "Pune",
        state: "MH",
        pincode: "411001",
      },
      buyer.clerkId
    )
    expect(r.status).toBe(422)
    const paths = r.body.error?.details?.map((d) => d.path) ?? []
    expect(paths).toEqual(expect.arrayContaining(["gstin", "addressLine"]))
  })
})

describe("operator bootstrap (SUPER_ADMIN_EMAILS)", () => {
  const profile = (email: string, emailVerified: boolean) => ({
    email,
    name: "Owner",
    imageUrl: null,
    phone: null,
    emailVerified,
    role: "BUYER" as const,
  })

  test("a verified listed e-mail becomes SUPER_ADMIN on first sight", async () => {
    knownProfiles.set("clerk_owner", profile("owner@example.com", true))
    const r = await get<{ role: string }>("/api/me", "clerk_owner")
    expect(r.body.data?.role).toBe("SUPER_ADMIN")
    expect((await get("/api/admin/dashboard", "clerk_owner")).status).toBe(200)
    expect(await db.auditLog.count({ where: { action: "user.bootstrap_super_admin" } })).toBe(1)
  })

  test("an UNVERIFIED listed e-mail is not promoted", async () => {
    knownProfiles.set("clerk_fake", profile("owner@example.com", false))
    const r = await get<{ role: string }>("/api/me", "clerk_fake")
    expect(r.body.data?.role).toBe("BUYER")
    expect((await get("/api/admin/dashboard", "clerk_fake")).status).toBe(403)
  })

  test("other addresses are untouched", async () => {
    knownProfiles.set("clerk_other", profile("someone@example.com", true))
    expect((await get<{ role: string }>("/api/me", "clerk_other")).body.data?.role).toBe("BUYER")
  })

  test("an existing user is promoted when their listed e-mail is verified", async () => {
    const u = await db.user.create({
      data: { clerkId: "clerk_existing", email: "owner@example.com", role: "BUYER", onboarded: true },
    })
    knownProfiles.set("clerk_existing", profile("owner@example.com", true))
    await get("/api/me", "clerk_existing")
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).role).toBe("SUPER_ADMIN")
  })

  test("a row pre-created in Postgres under another Clerk id is relinked on verified sign-in", async () => {
    // e.g. inserted by hand, or created under a different Clerk instance (dev vs production keys)
    const u = await db.user.create({
      data: { clerkId: "manual_placeholder", email: "owner@example.com", role: "SUPER_ADMIN", onboarded: true },
    })
    knownProfiles.set("clerk_real", profile("owner@example.com", true))
    const r = await get<{ role: string }>("/api/me", "clerk_real")
    expect(r.status).toBe(200)
    expect(r.body.data?.role).toBe("SUPER_ADMIN")
    const row = await db.user.findUniqueOrThrow({ where: { id: u.id } })
    expect(row.clerkId).toBe("clerk_real")
    expect(await db.user.count()).toBe(1)
  })

  test("an UNVERIFIED e-mail cannot take over a pre-existing row", async () => {
    await db.user.create({
      data: { clerkId: "manual_placeholder", email: "owner@example.com", role: "SUPER_ADMIN", onboarded: true },
    })
    knownProfiles.set("clerk_fake", profile("owner@example.com", false))
    expect((await get("/api/me", "clerk_fake")).status).toBe(409)
    expect((await db.user.findFirstOrThrow()).clerkId).toBe("manual_placeholder")
  })
})
