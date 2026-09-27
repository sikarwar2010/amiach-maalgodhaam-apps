import { beforeEach, describe, expect, test } from "bun:test"

import {
  db,
  get,
  makeAddress,
  makeBusinessBuyer,
  makeCategory,
  makeProduct,
  makeUser,
  makeVendor,
  post,
  resetDb,
} from "./helpers"

beforeEach(resetDb)

const inTwoWeeks = () => new Date(Date.now() + 14 * 86_400_000).toISOString()

const rfq = (productId?: string) => ({
  ...(productId ? { productId } : {}),
  title: "5000 sq ft vitrified tiles",
  description: "Need 600x600 vitrified tiles for a residential project in Pune.",
  quantity: 500,
  unit: "PIECE",
  targetUnitPrice: 80,
  deliveryCity: "Pune",
})

async function setup() {
  const cat = await makeCategory()
  const seller = await makeVendor()
  const rival = await makeVendor()
  const buyer = await makeBusinessBuyer()
  const address = await makeAddress(buyer.id)
  const product = await makeProduct(seller.vendor.id, cat.id, {
    price: 100,
    quantity: 1000,
    minOrderQty: 100,
  })
  return { cat, seller, rival, buyer, address, product }
}

describe("B2B requests for quote", () => {
  test("requires a business profile with GSTIN; individuals are refused", async () => {
    const { product } = await setup()
    const individual = await makeUser("BUYER")
    const r = await post("/api/b2b/inquiries", rfq(product.id), individual.clerkId)
    expect(r.status).toBe(403)
  })

  test("the vendor is derived from the product; MOQ is enforced", async () => {
    const { buyer, seller, rival, product } = await setup()
    const bad = await post("/api/b2b/inquiries", { ...rfq(product.id), quantity: 10 }, buyer.clerkId)
    expect(bad.status).toBe(409)
    const r = await post<{ id: string; vendorId: string }>(
      "/api/b2b/inquiries",
      { ...rfq(product.id), vendorId: rival.vendor.id },
      buyer.clerkId
    )
    expect(r.status).toBe(201)
    expect(r.body.data?.vendorId).toBe(seller.vendor.id)
  })

  test("full flow: RFQ → quote → accept → B2B order with stock decrement", async () => {
    const { buyer, seller, address, product } = await setup()
    const inq = await post<{ id: string }>("/api/b2b/inquiries", rfq(product.id), buyer.clerkId)
    const inquiryId = inq.body.data!.id

    const quoted = await post<{ id: string; totalPrice: number }>(
      `/api/vendor/b2b/inquiries/${inquiryId}/quote`,
      {
        unitPrice: 90,
        quantity: 500,
        leadTimeDays: 5,
        validUntil: inTwoWeeks(),
      },
      seller.user.clerkId
    )
    expect(quoted.status).toBe(201)
    expect(quoted.body.data?.totalPrice).toBe(45_000)

    const detail = await get<{ status: string; quotes: { id: string }[] }>(
      `/api/b2b/inquiries/${inquiryId}`,
      buyer.clerkId
    )
    expect(detail.body.data?.status).toBe("QUOTED")
    expect(detail.body.data?.quotes).toHaveLength(1)

    const accepted = await post<{ orderId: string; orderNumber: string }>(
      `/api/b2b/quotes/${quoted.body.data!.id}/accept`,
      { shippingAddressId: address.id },
      buyer.clerkId
    )
    expect(accepted.status).toBe(201)
    const order = await db.order.findUniqueOrThrow({
      where: { id: accepted.body.data!.orderId },
      include: { items: true },
    })
    expect(order).toMatchObject({ channel: "B2B", buyerId: buyer.id })
    expect(Number(order.total)).toBe(45_000)
    expect(Number(order.items[0]!.unitPrice)).toBe(90)
    expect(
      (
        await db.inventory.findUniqueOrThrow({
          where: { productId: product.id },
        })
      ).quantity
    ).toBe(500)
    expect((await db.b2BInquiry.findUniqueOrThrow({ where: { id: inquiryId } })).status).toBe("ACCEPTED")

    // an accepted quote cannot be accepted (or rejected) again
    expect(
      (await post(`/api/b2b/quotes/${quoted.body.data!.id}/accept`, { shippingAddressId: address.id }, buyer.clerkId))
        .status
    ).toBe(409)
    expect((await post(`/api/b2b/quotes/${quoted.body.data!.id}/reject`, {}, buyer.clerkId)).status).toBe(409)
  })

  test("rejecting the only quote reopens the inquiry; the vendor can requote after withdrawing", async () => {
    const { buyer, seller, product } = await setup()
    const inq = await post<{ id: string }>("/api/b2b/inquiries", rfq(product.id), buyer.clerkId)
    const id = inq.body.data!.id
    const quote = await post<{ id: string }>(
      `/api/vendor/b2b/inquiries/${id}/quote`,
      { unitPrice: 95, quantity: 500, validUntil: inTwoWeeks() },
      seller.user.clerkId
    )
    // a second live quote from the same vendor is refused
    expect(
      (
        await post(
          `/api/vendor/b2b/inquiries/${id}/quote`,
          { unitPrice: 90, quantity: 500, validUntil: inTwoWeeks() },
          seller.user.clerkId
        )
      ).status
    ).toBe(409)

    expect(
      (await post(`/api/b2b/quotes/${quote.body.data!.id}/reject`, { reason: "Too high" }, buyer.clerkId)).status
    ).toBe(200)
    expect((await db.b2BInquiry.findUniqueOrThrow({ where: { id } })).status).toBe("OPEN")
  })

  test("expired quotes cannot be accepted", async () => {
    const { buyer, seller, address, product } = await setup()
    const inq = await post<{ id: string }>("/api/b2b/inquiries", rfq(product.id), buyer.clerkId)
    const quote = await post<{ id: string }>(
      `/api/vendor/b2b/inquiries/${inq.body.data!.id}/quote`,
      { unitPrice: 95, quantity: 500, validUntil: inTwoWeeks() },
      seller.user.clerkId
    )
    await db.b2BQuote.update({
      where: { id: quote.body.data!.id },
      data: { validUntil: new Date(Date.now() - 1000) },
    })
    const r = await post(
      `/api/b2b/quotes/${quote.body.data!.id}/accept`,
      { shippingAddressId: address.id },
      buyer.clerkId
    )
    expect(r.status).toBe(409)
    expect(
      (
        await db.b2BQuote.findUniqueOrThrow({
          where: { id: quote.body.data!.id },
        })
      ).status
    ).toBe("EXPIRED")
  })

  test("IDOR: other buyers and other vendors cannot see or act on the negotiation", async () => {
    const { buyer, seller, rival, address, product } = await setup()
    const mallory = await makeBusinessBuyer()
    const inq = await post<{ id: string }>("/api/b2b/inquiries", rfq(product.id), buyer.clerkId)
    const id = inq.body.data!.id
    const quote = await post<{ id: string }>(
      `/api/vendor/b2b/inquiries/${id}/quote`,
      { unitPrice: 95, quantity: 500, validUntil: inTwoWeeks() },
      seller.user.clerkId
    )

    // another buyer
    expect((await get(`/api/b2b/inquiries/${id}`, mallory.clerkId)).status).toBe(404)
    expect((await post(`/api/b2b/inquiries/${id}/cancel`, {}, mallory.clerkId)).status).toBe(404)
    expect(
      (
        await post(
          `/api/b2b/quotes/${quote.body.data!.id}/accept`,
          { shippingAddressId: (await makeAddress(mallory.id)).id },
          mallory.clerkId
        )
      ).status
    ).toBe(404)
    expect((await post(`/api/b2b/quotes/${quote.body.data!.id}/reject`, {}, mallory.clerkId)).status).toBe(404)
    expect((await get<unknown[]>("/api/b2b/inquiries", mallory.clerkId)).body.data).toHaveLength(0)

    // a vendor the RFQ was not addressed to
    expect((await get(`/api/vendor/b2b/inquiries/${id}`, rival.user.clerkId)).status).toBe(404)
    expect((await get<unknown[]>("/api/vendor/b2b/inquiries", rival.user.clerkId)).body.data).toHaveLength(0)
    expect(
      (
        await post(
          `/api/vendor/b2b/inquiries/${id}/quote`,
          { unitPrice: 1, quantity: 500, validUntil: inTwoWeeks() },
          rival.user.clerkId
        )
      ).status
    ).toBe(404)
    expect((await post(`/api/vendor/b2b/quotes/${quote.body.data!.id}/withdraw`, {}, rival.user.clerkId)).status).toBe(
      404
    )

    // buyers cannot use the vendor API
    expect((await get("/api/vendor/b2b/inquiries", buyer.clerkId)).status).toBe(403)
    // …and the address must be the accepting buyer's own
    const foreign = await makeAddress((await makeUser("BUYER")).id)
    expect(
      (await post(`/api/b2b/quotes/${quote.body.data!.id}/accept`, { shippingAddressId: foreign.id }, buyer.clerkId))
        .status
    ).toBe(404)
    expect(address.id).toBeDefined()
  })

  test("open requirements reach every approved vendor, but never reveal the buyer", async () => {
    const { buyer, seller, rival } = await setup()
    const pending = await makeVendor("PENDING")
    const inq = await post<{ id: string }>("/api/b2b/inquiries", rfq(), buyer.clerkId)
    expect(inq.status).toBe(201)

    for (const v of [seller, rival]) {
      const list = await get<Record<string, unknown>[]>("/api/vendor/b2b/inquiries", v.user.clerkId)
      expect(list.body.data).toHaveLength(1)
      const item = list.body.data![0]!
      for (const leaked of ["buyerId", "buyer", "email", "companyName", "gstin", "phone"]) {
        expect(item).not.toHaveProperty(leaked)
      }
    }
    expect((await get("/api/vendor/b2b/inquiries", pending.user.clerkId)).status).toBe(403)
  })
})
