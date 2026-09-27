import { beforeEach, describe, expect, test } from "bun:test"

import {
  db,
  del,
  get,
  makeAddress,
  makeCategory,
  makeProduct,
  makeUser,
  makeVendor,
  patch,
  post,
  resetDb,
} from "./helpers"

beforeEach(resetDb)

interface CartView {
  items: {
    id: string
    quantity: number
    unitPrice: number
    lineTotal: number
    issues: string[]
  }[]
  subtotal: number
  itemCount: number
  canCheckout: boolean
}

async function setup() {
  const cat = await makeCategory()
  const { vendor, user: vendorUser } = await makeVendor()
  const buyer = await makeUser("BUYER")
  const address = await makeAddress(buyer.id)
  return { cat, vendor, vendorUser, buyer, address }
}

describe("wishlist", () => {
  test("adding the same product twice keeps a single entry", async () => {
    const { cat, vendor, buyer } = await setup()
    const p = await makeProduct(vendor.id, cat.id)
    expect((await post("/api/wishlist", { productId: p.id }, buyer.clerkId)).status).toBe(201)
    expect((await post("/api/wishlist", { productId: p.id }, buyer.clerkId)).status).toBe(201)
    const list = await get<unknown[]>("/api/wishlist", buyer.clerkId)
    expect(list.body.data).toHaveLength(1)
    expect(await db.wishlistItem.count()).toBe(1)
  })

  test("wishlists are private per user and hidden products cannot be added", async () => {
    const { cat, vendor, buyer } = await setup()
    const other = await makeUser("BUYER")
    const live = await makeProduct(vendor.id, cat.id)
    const draft = await makeProduct(vendor.id, cat.id, { status: "DRAFT" })
    await post("/api/wishlist", { productId: live.id }, buyer.clerkId)
    expect((await get<unknown[]>("/api/wishlist", other.clerkId)).body.data).toHaveLength(0)
    expect((await post("/api/wishlist", { productId: draft.id }, buyer.clerkId)).status).toBe(404)
    // removing someone else's entry is a no-op
    const r = await del<{ removed: number }>(`/api/wishlist/${live.id}`, other.clerkId)
    expect(r.body.data?.removed).toBe(0)
    expect(await db.wishlistItem.count()).toBe(1)
  })

  test("move-to-cart respects MOQ and removes the wishlist entry", async () => {
    const { cat, vendor, buyer } = await setup()
    const p = await makeProduct(vendor.id, cat.id, {
      minOrderQty: 10,
      quantity: 100,
    })
    await post("/api/wishlist", { productId: p.id }, buyer.clerkId)
    const r = await post(`/api/wishlist/${p.id}/move-to-cart`, {}, buyer.clerkId)
    expect(r.status).toBe(200)
    expect(await db.wishlistItem.count()).toBe(0)
    const cart = await get<CartView>("/api/cart", buyer.clerkId)
    expect(cart.body.data?.items[0]?.quantity).toBe(10)
  })
})

describe("cart", () => {
  test("add, merge, price and totals come from the server", async () => {
    const { cat, vendor, buyer } = await setup()
    const p = await makeProduct(vendor.id, cat.id, {
      price: 99.5,
      quantity: 100,
    })
    await post("/api/cart/items", { productId: p.id, quantity: 2 }, buyer.clerkId)
    const r = await post<CartView>("/api/cart/items", { productId: p.id, quantity: 3 }, buyer.clerkId)
    expect(r.status).toBe(201)
    expect(r.body.data?.items).toHaveLength(1)
    expect(r.body.data?.items[0]).toMatchObject({
      quantity: 5,
      unitPrice: 99.5,
      lineTotal: 497.5,
    })
    expect(r.body.data?.subtotal).toBe(497.5)
    expect(r.body.data?.itemCount).toBe(5)
  })

  test("client-supplied price is ignored", async () => {
    const { cat, vendor, buyer } = await setup()
    const p = await makeProduct(vendor.id, cat.id, { price: 100 })
    const r = await post<CartView>("/api/cart/items", { productId: p.id, quantity: 1, price: 1 }, buyer.clerkId)
    expect(r.body.data?.items[0]?.unitPrice).toBe(100)
  })

  test("enforces minimum order quantity and stock", async () => {
    const { cat, vendor, buyer } = await setup()
    const p = await makeProduct(vendor.id, cat.id, {
      minOrderQty: 10,
      quantity: 20,
    })
    const tooFew = await post("/api/cart/items", { productId: p.id, quantity: 5 }, buyer.clerkId)
    expect(tooFew.status).toBe(422)
    const tooMany = await post("/api/cart/items", { productId: p.id, quantity: 21 }, buyer.clerkId)
    expect(tooMany.status).toBe(409)
    expect((await post("/api/cart/items", { productId: p.id, quantity: 20 }, buyer.clerkId)).status).toBe(201)
    // adding more on top of what is already in the cart is checked against the *total*
    expect((await post("/api/cart/items", { productId: p.id, quantity: 1 }, buyer.clerkId)).status).toBe(409)
  })

  test("cannot add unpublished products or your own listing", async () => {
    const { cat, vendor, vendorUser, buyer } = await setup()
    const draft = await makeProduct(vendor.id, cat.id, { status: "DRAFT" })
    const live = await makeProduct(vendor.id, cat.id)
    expect((await post("/api/cart/items", { productId: draft.id, quantity: 1 }, buyer.clerkId)).status).toBe(404)
    expect((await post("/api/cart/items", { productId: live.id, quantity: 1 }, vendorUser.clerkId)).status).toBe(409)
  })

  test("IDOR: another user's cart item id behaves as missing", async () => {
    const { cat, vendor, buyer } = await setup()
    const mallory = await makeUser("BUYER")
    const p = await makeProduct(vendor.id, cat.id)
    const added = await post<CartView>("/api/cart/items", { productId: p.id, quantity: 2 }, buyer.clerkId)
    const itemId = added.body.data!.items[0]!.id
    expect((await patch(`/api/cart/items/${itemId}`, { quantity: 9 }, mallory.clerkId)).status).toBe(404)
    expect((await del(`/api/cart/items/${itemId}`, mallory.clerkId)).status).toBe(404)
    expect((await get<CartView>("/api/cart", mallory.clerkId)).body.data?.items).toHaveLength(0)
    expect((await db.cartItem.findUniqueOrThrow({ where: { id: itemId } })).quantity).toBe(2)
  })

  test("items that stop being buyable are flagged and block checkout", async () => {
    const { cat, vendor, buyer } = await setup()
    const p = await makeProduct(vendor.id, cat.id)
    await post("/api/cart/items", { productId: p.id, quantity: 2 }, buyer.clerkId)
    await db.product.update({
      where: { id: p.id },
      data: { status: "ARCHIVED" },
    })
    const cart = await get<CartView>("/api/cart", buyer.clerkId)
    expect(cart.body.data?.items[0]?.issues).toContain("UNAVAILABLE")
    expect(cart.body.data?.canCheckout).toBe(false)
    expect(cart.body.data?.subtotal).toBe(0)
  })
})

describe("checkout & orders", () => {
  test("places an order, decrements stock, empties the cart and snapshots the address", async () => {
    const { cat, vendor, buyer, address } = await setup()
    const p = await makeProduct(vendor.id, cat.id, { price: 250, quantity: 10 })
    await post("/api/cart/items", { productId: p.id, quantity: 4 }, buyer.clerkId)
    const r = await post<{
      id: string
      total: number
      status: string
      items: { quantity: number }[]
    }>("/api/orders", { shippingAddressId: address.id, paymentMethod: "COD" }, buyer.clerkId)
    expect(r.status).toBe(201)
    expect(r.body.data).toMatchObject({ total: 1000, status: "PENDING" })
    expect((await db.inventory.findUniqueOrThrow({ where: { productId: p.id } })).quantity).toBe(6)
    expect((await get<CartView>("/api/cart", buyer.clerkId)).body.data?.items).toHaveLength(0)

    // editing the address later must not rewrite history
    await db.address.update({
      where: { id: address.id },
      data: { line1: "Somewhere else" },
    })
    const order = await get<{ shippingAddress: { line1: string } }>(`/api/orders/${r.body.data!.id}`, buyer.clerkId)
    expect(order.body.data?.shippingAddress.line1).toBe("1 MG Road")
  })

  test("selling out flips the product to OUT_OF_STOCK; cancelling restores it", async () => {
    const { cat, vendor, buyer, address } = await setup()
    const p = await makeProduct(vendor.id, cat.id, { quantity: 3 })
    await post("/api/cart/items", { productId: p.id, quantity: 3 }, buyer.clerkId)
    const placed = await post<{ id: string }>("/api/orders", { shippingAddressId: address.id }, buyer.clerkId)
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("OUT_OF_STOCK")
    const cancelled = await post<{ status: string }>(`/api/orders/${placed.body.data!.id}/cancel`, {}, buyer.clerkId)
    expect(cancelled.body.data?.status).toBe("CANCELLED")
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("PUBLISHED")
    expect((await db.inventory.findUniqueOrThrow({ where: { productId: p.id } })).quantity).toBe(3)
  })

  test("two buyers racing for the last units cannot oversell", async () => {
    const { cat, vendor } = await setup()
    const p = await makeProduct(vendor.id, cat.id, { quantity: 5 })
    const buyers = await Promise.all([makeUser("BUYER"), makeUser("BUYER"), makeUser("BUYER")])
    const addresses = await Promise.all(buyers.map((b) => makeAddress(b.id)))
    for (const b of buyers) {
      expect((await post("/api/cart/items", { productId: p.id, quantity: 4 }, b.clerkId)).status).toBe(201)
    }
    const results = await Promise.all(
      buyers.map((b, i) => post("/api/orders", { shippingAddressId: addresses[i]!.id }, b.clerkId))
    )
    const created = results.filter((r) => r.status === 201)
    expect(created).toHaveLength(1)
    expect(results.filter((r) => r.status === 409)).toHaveLength(2)
    expect((await db.inventory.findUniqueOrThrow({ where: { productId: p.id } })).quantity).toBe(1)
  })

  test("cannot check out with an empty cart, someone else's address, or unavailable payment", async () => {
    const { cat, vendor, buyer, address } = await setup()
    const other = await makeUser("BUYER")
    const otherAddress = await makeAddress(other.id)
    const p = await makeProduct(vendor.id, cat.id)
    expect((await post("/api/orders", { shippingAddressId: address.id }, buyer.clerkId)).status).toBe(422)
    await post("/api/cart/items", { productId: p.id, quantity: 1 }, buyer.clerkId)
    expect((await post("/api/orders", { shippingAddressId: otherAddress.id }, buyer.clerkId)).status).toBe(404)
    expect(
      (await post("/api/orders", { shippingAddressId: address.id, paymentMethod: "ONLINE" }, buyer.clerkId)).status
    ).toBe(422)
  })

  test("IDOR: orders are only visible to their buyer; vendors see only their own lines", async () => {
    const { cat, vendor, vendorUser, buyer, address } = await setup()
    const other = await makeVendor()
    const mallory = await makeUser("BUYER")
    const mine = await makeProduct(vendor.id, cat.id)
    const theirs = await makeProduct(other.vendor.id, cat.id)
    await post("/api/cart/items", { productId: mine.id, quantity: 1 }, buyer.clerkId)
    await post("/api/cart/items", { productId: theirs.id, quantity: 2 }, buyer.clerkId)
    const placed = await post<{ id: string }>("/api/orders", { shippingAddressId: address.id }, buyer.clerkId)
    const orderId = placed.body.data!.id

    expect((await get(`/api/orders/${orderId}`, mallory.clerkId)).status).toBe(404)
    expect((await post(`/api/orders/${orderId}/cancel`, {}, mallory.clerkId)).status).toBe(404)
    expect((await get<unknown[]>("/api/orders", mallory.clerkId)).body.data).toHaveLength(0)

    const lines = await get<{ id: string; title: string; order: Record<string, unknown> }[]>(
      "/api/vendor/orders",
      vendorUser.clerkId
    )
    expect(lines.body.data).toHaveLength(1)
    expect(lines.body.data?.[0]?.title).toBe(mine.title)
    expect(lines.body.data?.[0]?.order).not.toHaveProperty("buyerId")

    // vendor A cannot drive vendor B's line item
    const foreign = await db.orderItem.findFirstOrThrow({
      where: { vendorId: other.vendor.id },
    })
    expect(
      (await patch(`/api/vendor/orders/items/${foreign.id}`, { status: "CONFIRMED" }, vendorUser.clerkId)).status
    ).toBe(404)
  })

  test("vendor fulfilment moves the order forward, only along valid transitions", async () => {
    const { cat, vendor, vendorUser, buyer, address } = await setup()
    const p = await makeProduct(vendor.id, cat.id)
    await post("/api/cart/items", { productId: p.id, quantity: 1 }, buyer.clerkId)
    const placed = await post<{ id: string }>(
      "/api/orders",
      { shippingAddressId: address.id, paymentMethod: "COD" },
      buyer.clerkId
    )
    const item = await db.orderItem.findFirstOrThrow({
      where: { orderId: placed.body.data!.id },
    })

    expect((await patch(`/api/vendor/orders/items/${item.id}`, { status: "SHIPPED" }, vendorUser.clerkId)).status).toBe(
      409
    )
    for (const status of ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]) {
      const r = await patch(
        `/api/vendor/orders/items/${item.id}`,
        { status, trackingNumber: "TRK1" },
        vendorUser.clerkId
      )
      expect(r.status).toBe(200)
    }
    const order = await get<{ status: string; payments: { status: string }[] }>(
      `/api/orders/${placed.body.data!.id}`,
      buyer.clerkId
    )
    expect(order.body.data?.status).toBe("DELIVERED")
    expect(order.body.data?.payments[0]?.status).toBe("PAID")
    expect((await post(`/api/orders/${placed.body.data!.id}/cancel`, {}, buyer.clerkId)).status).toBe(409)
  })
})
