import { beforeEach, describe, expect, test } from "bun:test"

import { app, db, get, knownProfiles, makeCategory, patch, post, resetDb } from "./helpers"

beforeEach(resetDb)

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])

async function upload(as: string, kind: string, bytes: Uint8Array) {
  const form = new FormData()
  form.set("kind", kind)
  form.set("file", new File([bytes], "x.png"))
  const res = await app.request("/api/uploads", {
    method: "POST",
    body: form,
    headers: { authorization: `Bearer test:${as}` },
  })
  return (await res.json()) as { data: { url: string } }
}

function newPerson(clerkId: string, email: string, role: "BUYER" | "ADMIN" = "BUYER") {
  knownProfiles.set(clerkId, {
    email,
    name: email.split("@")[0]!,
    imageUrl: null,
    phone: null,
    emailVerified: true,
    role,
  })
}

describe("end-to-end journey: sign-up → vendor listing → buyer order → fulfilment", () => {
  test("a new vendor lists a product, a new buyer orders it, and it is delivered", async () => {
    const category = await makeCategory("tiles")
    newPerson("admin_1", "boss@ops.example", "ADMIN")
    newPerson("vendor_1", "seller@example.com")
    newPerson("buyer_1", "buyer@example.com")

    // Vendor signs up (provisioned as BUYER), registers, and prepares a draft while still pending.
    expect((await get<{ role: string }>("/api/me", "vendor_1")).body.data?.role).toBe("BUYER")
    const reg = await post(
      "/api/vendor/register",
      {
        vendorType: "BUSINESS",
        businessName: "Shree Tiles",
        contactName: "Ramesh",
        phone: "9876543210",
        gstin: "24AAAAA0000A1Z5",
        addressLine: "Plot 4",
        city: "Morbi",
        state: "Gujarat",
        pincode: "363641",
      },
      "vendor_1"
    )
    expect(reg.status).toBe(201)
    expect((await get<{ role: string; vendorStatus: string }>("/api/me", "vendor_1")).body.data).toMatchObject({
      role: "VENDOR",
      vendorStatus: "PENDING",
    })

    const image = await upload("vendor_1", "product-image", PNG)
    const created = await post<{ id: string; slug: string }>(
      "/api/vendor/products",
      {
        title: "Vitrified tiles 600x600",
        description: "Premium surplus vitrified tiles, first quality.",
        categoryId: category.id,
        condition: "SURPLUS",
        unit: "PIECE",
        price: 400,
        marketValue: 800,
        minOrderQty: 10,
        quantity: 100,
        city: "Morbi",
        state: "Gujarat",
        images: [{ url: image.data.url }],
      },
      "vendor_1"
    )
    expect(created.status).toBe(201)
    const productId = created.body.data!.id

    // Admin approves the vendor; the vendor submits the draft; the admin publishes it.
    const vendor = await db.vendor.findFirstOrThrow({ where: { businessName: "Shree Tiles" } })
    expect((await post(`/api/admin/vendors/${vendor.id}/decision`, { status: "APPROVED" }, "admin_1")).status).toBe(200)
    expect(
      (await post(`/api/vendor/products/${productId}/status`, { status: "PENDING_REVIEW" }, "vendor_1")).status
    ).toBe(200)
    expect((await post(`/api/admin/products/${productId}/decision`, { status: "PUBLISHED" }, "admin_1")).status).toBe(
      200
    )
    expect((await get(`/api/products/${created.body.data!.slug}`)).status).toBe(200)

    // Buyer onboards, saves an address, carts, checks out.
    expect(
      (
        await post(
          "/api/me/onboarding/buyer",
          { buyerType: "INDIVIDUAL", name: "Asha", phone: "9876543211" },
          "buyer_1"
        )
      ).status
    ).toBe(200)
    const address = await post<{ id: string }>(
      "/api/me/addresses",
      {
        fullName: "Asha",
        phone: "9876543211",
        line1: "1 MG Road",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
      },
      "buyer_1"
    )
    expect((await post("/api/cart/items", { productId, quantity: 20 }, "buyer_1")).status).toBe(201)
    const order = await post<{ id: string; total: number; status: string }>(
      "/api/orders",
      { shippingAddressId: address.body.data!.id, paymentMethod: "COD" },
      "buyer_1"
    )
    expect(order.status).toBe(201)
    expect(order.body.data).toMatchObject({ total: 8000, status: "PENDING" })

    // Vendor sees the line, fulfils it; the buyer sees the order delivered and the vendor was notified.
    const lines = await get<{ id: string }[]>("/api/vendor/orders", "vendor_1")
    expect(lines.body.data).toHaveLength(1)
    const lineId = lines.body.data![0]!.id
    for (const status of ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]) {
      expect((await patch(`/api/vendor/orders/items/${lineId}`, { status }, "vendor_1")).status).toBe(200)
    }
    expect((await get<{ status: string }>(`/api/orders/${order.body.data!.id}`, "buyer_1")).body.data?.status).toBe(
      "DELIVERED"
    )
    expect(await db.notification.count({ where: { user: { clerkId: "vendor_1" }, type: "ORDER" } })).toBe(1)
    expect(await db.notification.count({ where: { user: { clerkId: "buyer_1" }, type: "ORDER" } })).toBeGreaterThan(0)
    expect(
      (await get<{ deliveredRevenue: number }>("/api/vendor/dashboard", "vendor_1")).body.data?.deliveredRevenue
    ).toBe(8000)
  })
})

describe("admin visibility of vendor activity", () => {
  test("admins are notified of new vendors and product submissions; unread count is exposed", async () => {
    const category = await makeCategory("tiles")
    newPerson("admin_2", "ops@example.com", "ADMIN")
    newPerson("vendor_2", "seller2@example.com")
    await get("/api/me", "admin_2")

    await post(
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
      "vendor_2"
    )
    const me = await get<{ unreadNotifications: number }>("/api/me", "admin_2")
    expect(me.body.data?.unreadNotifications).toBe(1)

    // approve, draft, submit → a second notification for the admin
    const vendor = await db.vendor.findFirstOrThrow({ where: { businessName: "Asha Rao" } })
    await post(`/api/admin/vendors/${vendor.id}/decision`, { status: "APPROVED" }, "admin_2")
    const image = await upload("vendor_2", "product-image", PNG)
    const product = await post<{ id: string }>(
      "/api/vendor/products",
      {
        title: "Spare tiles",
        description: "Leftover tiles from a renovation, boxed.",
        categoryId: category.id,
        condition: "SURPLUS",
        unit: "BOX",
        price: 500,
        quantity: 20,
        city: "Pune",
        state: "Maharashtra",
        images: [{ url: image.data.url }],
      },
      "vendor_2"
    )
    await post(`/api/vendor/products/${product.body.data!.id}/status`, { status: "PENDING_REVIEW" }, "vendor_2")
    const after = await get<{ unreadNotifications: number }>("/api/me", "admin_2")
    expect(after.body.data?.unreadNotifications).toBe(2)

    // the vendor got the approval notification
    expect((await get<{ unreadNotifications: number }>("/api/me", "vendor_2")).body.data?.unreadNotifications).toBe(1)
  })
})
