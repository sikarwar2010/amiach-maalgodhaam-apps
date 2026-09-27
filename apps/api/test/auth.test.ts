import { beforeEach, describe, expect, test } from "bun:test"

import { call, db, get, knownProfiles, makeUser, makeVendor, patch, post, resetDb, signWebhook } from "./helpers"

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

describe("Clerk webhook", () => {
  const userPayload = (id: string, email: string) => ({
    type: "user.created",
    data: {
      id,
      primary_email_address_id: "e1",
      email_addresses: [{ id: "e1", email_address: email }],
      first_name: "Web",
      last_name: "Hook",
      image_url: null,
      phone_numbers: [],
      public_metadata: {},
    },
  })

  test("rejects unsigned and badly-signed requests", async () => {
    const r = await call("POST", "/api/webhooks/clerk", {
      json: userPayload("wh_1", "wh1@example.com"),
      headers: {
        "svix-id": "x",
        "svix-timestamp": "1",
        "svix-signature": "v1,bad",
      },
    })
    expect(r.status).toBe(401)
    const none = await call("POST", "/api/webhooks/clerk", { json: {} })
    expect(none.status).toBe(400)
    expect(await db.user.count()).toBe(0)
  })

  test("creates the user once even when delivered twice (idempotent)", async () => {
    const { raw, headers } = signWebhook(userPayload("wh_2", "wh2@example.com"), "msg_fixed_1")
    const send = () => app_request(raw, headers)
    expect((await send()).status).toBe(200)
    const second = await send()
    expect(second.status).toBe(200)
    expect((second.body.data as { result: string }).result).toBe("duplicate")
    expect(await db.user.count({ where: { clerkId: "wh_2" } })).toBe(1)
    expect(await db.webhookEvent.count()).toBe(1)
  })

  test("user.updated syncs profile, user.deleted frees the email", async () => {
    const created = signWebhook(userPayload("wh_3", "wh3@example.com"))
    await app_request(created.raw, created.headers)
    const updated = signWebhook({
      type: "user.updated",
      data: {
        ...userPayload("wh_3", "wh3@example.com").data,
        first_name: "Changed",
      },
    })
    await app_request(updated.raw, updated.headers)
    expect((await db.user.findUniqueOrThrow({ where: { clerkId: "wh_3" } })).name).toBe("Changed Hook")

    const deleted = signWebhook({
      type: "user.deleted",
      data: { id: "wh_3", deleted: true },
    })
    await app_request(deleted.raw, deleted.headers)
    const row = await db.user.findUniqueOrThrow({ where: { clerkId: "wh_3" } })
    expect(row.status).toBe("DELETED")
    expect(row.email).not.toBe("wh3@example.com")
    // …so the same person can sign up again.
    const again = signWebhook(userPayload("wh_3b", "wh3@example.com"))
    expect((await app_request(again.raw, again.headers)).status).toBe(200)
  })
})

async function app_request(raw: string, headers: Record<string, string>) {
  const { app } = await import("./helpers")
  const res = await app.request("/api/webhooks/clerk", {
    method: "POST",
    headers,
    body: raw,
  })
  return { status: res.status, body: (await res.json()) as { data?: unknown } }
}

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
})
