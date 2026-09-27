import type { Prisma, PrismaClient } from "@workspace/db"
import type { AddressSnapshotDto, CartDto, CartIssueCode, OrderDto, WishlistItemDto } from "@workspace/types"
import {
  addCartItemInput,
  addWishlistItemInput,
  checkoutInput,
  idParam,
  orderListQuery,
  updateCartItemInput,
} from "@workspace/validators"
import { Hono } from "hono"
import { z } from "zod"

import type { AppEnv, CurrentUser } from "../context"
import { audit } from "../lib/audit"
import { conflict, notFound, validation } from "../lib/errors"
import { jsonBody, ok, page, pageMeta, params, query, skipTake } from "../lib/http"
import { clientIp } from "../lib/ip"
import { num, round2 } from "../lib/money"
import { deriveOrderStatus, newOrderNumber } from "../lib/order-status"
import { availableQuantity, productCardInclude, publiclyVisible, toProductCard } from "../lib/product-dto"
import { currentUser, requireAuth } from "../middleware/auth"

type Db = PrismaClient | Prisma.TransactionClient

/* ------------------------------------------------------------------ */
/* Shared purchasing rules                                             */
/* ------------------------------------------------------------------ */

interface PurchasableProduct {
  id: string
  price: Prisma.Decimal
  minOrderQty: number
  title: string
  inventory: { quantity: number; reserved: number } | null
  vendor: { userId: string }
}

interface PurchasableVariant {
  id: string
  price: Prisma.Decimal | null
  stock: number
}

/** Throws a domain error unless `quantity` of this product/variant can be bought right now. */
function assertPurchasable(
  buyer: CurrentUser,
  product: PurchasableProduct,
  variant: PurchasableVariant | null,
  quantity: number
): void {
  if (product.vendor.userId === buyer.id) {
    throw conflict("You cannot buy your own listing")
  }
  if (quantity < product.minOrderQty) {
    throw validation(`Minimum order quantity for "${product.title}" is ${product.minOrderQty}`, [
      { path: "quantity", message: `Must be at least ${product.minOrderQty}` },
    ])
  }
  const available = variant ? variant.stock : availableQuantity(product)
  if (quantity > available) {
    throw conflict(`Only ${available} available for "${product.title}"`)
  }
}

const purchasableInclude = {
  inventory: { select: { quantity: true, reserved: true } },
  vendor: { select: { userId: true } },
} as const satisfies Prisma.ProductInclude

async function findBuyableProduct(db: Db, productId: string) {
  return db.product.findFirst({
    where: { id: productId, ...publiclyVisible, status: "PUBLISHED" },
    include: purchasableInclude,
  })
}

async function findVariant(db: Db, productId: string, variantId: string | undefined) {
  const variantCount = await db.productVariant.count({ where: { productId } })
  if (variantId === undefined) {
    if (variantCount > 0) {
      throw validation("Please choose a variant", [{ path: "variantId", message: "Required" }])
    }
    return null
  }
  const variant = await db.productVariant.findFirst({
    where: { id: variantId, productId },
  })
  if (!variant) throw notFound("Variant")
  return variant
}

/* ------------------------------------------------------------------ */
/* Wishlist                                                            */
/* ------------------------------------------------------------------ */

export const wishlistRoutes = new Hono<AppEnv>()
wishlistRoutes.use("*", requireAuth)

wishlistRoutes.get("/", async (c) => {
  const user = currentUser(c)
  const items = await c.get("db").wishlistItem.findMany({
    where: { wishlist: { userId: user.id }, product: publiclyVisible },
    orderBy: { createdAt: "desc" },
    include: { product: { include: productCardInclude } },
  })
  return ok(
    c,
    items.map((i): WishlistItemDto => ({
      id: i.id,
      addedAt: i.createdAt.toISOString(),
      product: toProductCard(i.product),
    }))
  )
})

wishlistRoutes.post("/", async (c) => {
  const user = currentUser(c)
  const { productId } = await jsonBody(c, addWishlistItemInput)
  const db = c.get("db")
  const product = await db.product.findFirst({
    where: { id: productId, ...publiclyVisible },
    select: { id: true },
  })
  if (!product) throw notFound("Product")

  await db.$transaction(async (tx) => {
    const wishlist = await tx.wishlist.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    })
    // The (wishlistId, productId) unique index makes double-adds impossible even under races.
    await tx.wishlistItem.createMany({
      data: [{ wishlistId: wishlist.id, productId }],
      skipDuplicates: true,
    })
  })
  return ok(c, { productId, wishlisted: true }, 201)
})

wishlistRoutes.delete("/:productId", async (c) => {
  const user = currentUser(c)
  const { productId } = params(c, z.object({ productId: idParam.shape.id }))
  const result = await c.get("db").wishlistItem.deleteMany({
    where: { productId, wishlist: { userId: user.id } },
  })
  return ok(c, { removed: result.count })
})

wishlistRoutes.post("/:productId/move-to-cart", async (c) => {
  const user = currentUser(c)
  const { productId } = params(c, z.object({ productId: idParam.shape.id }))
  const db = c.get("db")

  const item = await db.wishlistItem.findFirst({
    where: { productId, wishlist: { userId: user.id } },
  })
  if (!item) throw notFound("Wishlist item")

  await db.$transaction(async (tx) => {
    const product = await findBuyableProduct(tx, productId)
    if (!product) throw notFound("Product")
    const variant = await findVariant(tx, productId, undefined)
    const cart = await tx.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    })
    const existing = await tx.cartItem.findUnique({
      where: {
        cartId_productId_variantKey: {
          cartId: cart.id,
          productId,
          variantKey: "",
        },
      },
    })
    const quantity = existing?.quantity ?? product.minOrderQty
    assertPurchasable(user, product, variant, quantity)
    if (!existing) {
      await tx.cartItem.create({
        data: { cartId: cart.id, productId, variantKey: "", quantity },
      })
    }
    await tx.wishlistItem.delete({ where: { id: item.id } })
  })
  return ok(c, { moved: true })
})

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

export const cartRoutes = new Hono<AppEnv>()
cartRoutes.use("*", requireAuth)

async function buildCartView(db: Db, userId: string): Promise<CartDto> {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: { product: { include: productCardInclude } },
      },
    },
  })
  const items = cart?.items ?? []

  const variantIds = items.flatMap((i) => (i.variantId ? [i.variantId] : []))
  const variants = variantIds.length ? await db.productVariant.findMany({ where: { id: { in: variantIds } } }) : []
  const variantById = new Map(variants.map((v) => [v.id, v]))

  const lines = items.map((item) => {
    const variant = item.variantId ? (variantById.get(item.variantId) ?? null) : null
    const p = item.product
    const unitPrice = num(variant?.price ?? p.price)
    const available = variant ? variant.stock : availableQuantity(p)
    const visible = p.deletedAt === null && p.status === "PUBLISHED" && p.vendor.status === "APPROVED"

    const issues: CartIssueCode[] = []
    if (!visible || (item.variantId && !variant)) issues.push("UNAVAILABLE")
    else {
      if (item.quantity < p.minOrderQty) issues.push("BELOW_MIN_ORDER")
      if (item.quantity > available) issues.push("INSUFFICIENT_STOCK")
    }
    return {
      id: item.id,
      quantity: item.quantity,
      variant: variant ? { id: variant.id, name: variant.name, sku: variant.sku } : null,
      unitPrice,
      lineTotal: round2(unitPrice * item.quantity),
      available,
      issues,
      product: toProductCard(p),
    }
  })

  const subtotal = round2(lines.filter((l) => l.issues.length === 0).reduce((sum, l) => sum + l.lineTotal, 0))
  return {
    items: lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal,
    currency: "INR",
    canCheckout: lines.length > 0 && lines.every((l) => l.issues.length === 0),
  }
}

cartRoutes.get("/", async (c) => {
  const user = currentUser(c)
  return ok(c, await buildCartView(c.get("db"), user.id))
})

cartRoutes.post("/items", async (c) => {
  const user = currentUser(c)
  const input = await jsonBody(c, addCartItemInput)
  const db = c.get("db")

  await db.$transaction(async (tx) => {
    const product = await findBuyableProduct(tx, input.productId)
    if (!product) throw notFound("Product")
    const variant = await findVariant(tx, input.productId, input.variantId)
    const cart = await tx.cart.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    })
    const variantKey = variant?.id ?? ""
    const existing = await tx.cartItem.findUnique({
      where: {
        cartId_productId_variantKey: {
          cartId: cart.id,
          productId: product.id,
          variantKey,
        },
      },
    })
    const total = (existing?.quantity ?? 0) + input.quantity
    assertPurchasable(user, product, variant, total)

    await tx.cartItem.upsert({
      where: {
        cartId_productId_variantKey: {
          cartId: cart.id,
          productId: product.id,
          variantKey,
        },
      },
      create: {
        cartId: cart.id,
        productId: product.id,
        variantId: variant?.id ?? null,
        variantKey,
        quantity: input.quantity,
      },
      update: { quantity: total },
    })
  })
  return ok(c, await buildCartView(db, user.id), 201)
})

cartRoutes.patch("/items/:id", async (c) => {
  const user = currentUser(c)
  const { id } = params(c, idParam)
  const { quantity } = await jsonBody(c, updateCartItemInput)
  const db = c.get("db")

  await db.$transaction(async (tx) => {
    // Scoped to the caller's own cart: someone else's item id looks like a missing one.
    const item = await tx.cartItem.findFirst({
      where: { id, cart: { userId: user.id } },
    })
    if (!item) throw notFound("Cart item")
    const product = await findBuyableProduct(tx, item.productId)
    if (!product) throw notFound("Product")
    const variant = item.variantId ? await findVariant(tx, item.productId, item.variantId) : null
    assertPurchasable(user, product, variant, quantity)
    await tx.cartItem.update({ where: { id }, data: { quantity } })
  })
  return ok(c, await buildCartView(db, user.id))
})

cartRoutes.delete("/items/:id", async (c) => {
  const user = currentUser(c)
  const { id } = params(c, idParam)
  const db = c.get("db")
  const result = await db.cartItem.deleteMany({
    where: { id, cart: { userId: user.id } },
  })
  if (result.count === 0) throw notFound("Cart item")
  return ok(c, await buildCartView(db, user.id))
})

cartRoutes.delete("/", async (c) => {
  const user = currentUser(c)
  const db = c.get("db")
  await db.cartItem.deleteMany({ where: { cart: { userId: user.id } } })
  return ok(c, await buildCartView(db, user.id))
})

/* ------------------------------------------------------------------ */
/* Orders (B2C checkout)                                               */
/* ------------------------------------------------------------------ */

export const orderRoutes = new Hono<AppEnv>()
orderRoutes.use("*", requireAuth)

const orderInclude = {
  items: { orderBy: { title: "asc" } },
  payments: true,
} as const satisfies Prisma.OrderInclude

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>

function parseAddress(value: Prisma.JsonValue | null): AddressSnapshotDto | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null
  const str = (v: Prisma.JsonValue | undefined) => (typeof v === "string" ? v : "")
  return {
    fullName: str(value.fullName),
    phone: str(value.phone),
    line1: str(value.line1),
    line2: typeof value.line2 === "string" ? value.line2 : null,
    city: str(value.city),
    state: str(value.state),
    pincode: str(value.pincode),
    country: str(value.country) || "IN",
  }
}

export function toOrderDto(order: OrderRow): OrderDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    channel: order.channel,
    status: order.status,
    subtotal: num(order.subtotal),
    shippingFee: num(order.shippingFee),
    tax: num(order.tax),
    total: num(order.total),
    currency: order.currency,
    shippingAddress: parseAddress(order.shippingAddress) ?? {
      fullName: "",
      phone: "",
      line1: "",
      line2: null,
      city: "",
      state: "",
      pincode: "",
      country: "IN",
    },
    billingAddress: parseAddress(order.billingAddress),
    notes: order.notes,
    placedAt: order.placedAt.toISOString(),
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      title: i.title,
      unit: i.unit,
      unitPrice: num(i.unitPrice),
      quantity: i.quantity,
      lineTotal: num(i.lineTotal),
      status: i.status,
      trackingNumber: i.trackingNumber,
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      method: p.method,
      status: p.status,
      amount: num(p.amount),
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
  }
}

function addressSnapshot(a: {
  fullName: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  country: string
}): Prisma.InputJsonObject {
  return {
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    country: a.country,
  }
}

orderRoutes.post("/", async (c) => {
  const user = currentUser(c)
  const input = await jsonBody(c, checkoutInput)
  const db = c.get("db")

  if (input.paymentMethod === "ONLINE") {
    throw validation("Online payments are not available yet. Choose Cash on Delivery or Bank Transfer.", [
      { path: "paymentMethod", message: "Not available" },
    ])
  }

  const order = await db.$transaction(async (tx) => {
    const [shipping, billing] = await Promise.all([
      tx.address.findFirst({
        where: { id: input.shippingAddressId, userId: user.id },
      }),
      input.billingAddressId
        ? tx.address.findFirst({
            where: { id: input.billingAddressId, userId: user.id },
          })
        : Promise.resolve(null),
    ])
    if (!shipping) throw notFound("Shipping address")
    if (input.billingAddressId && !billing) throw notFound("Billing address")

    const cart = await tx.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    })
    if (!cart || cart.items.length === 0) throw validation("Your cart is empty")

    const lines: {
      productId: string
      variantId: string | null
      vendorId: string
      title: string
      unit: OrderRow["items"][number]["unit"]
      unitPrice: number
      quantity: number
    }[] = []
    const notifyVendorUsers = new Set<string>()

    for (const item of cart.items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, ...publiclyVisible, status: "PUBLISHED" },
        include: {
          ...purchasableInclude,
          vendor: { select: { id: true, userId: true } },
        },
      })
      if (!product) throw conflict("An item in your cart is no longer available")
      const variant = item.variantId
        ? await tx.productVariant.findFirst({
            where: { id: item.variantId, productId: product.id },
          })
        : null
      if (item.variantId && !variant) throw conflict("An item in your cart is no longer available")
      assertPurchasable(user, product, variant, item.quantity)

      // Atomic, conditional decrement: two buyers racing for the last units cannot both succeed.
      if (variant) {
        const r = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
        if (r.count === 0) throw conflict(`"${product.title}" just went out of stock`)
      } else {
        const r = await tx.inventory.updateMany({
          where: {
            productId: product.id,
            quantity: {
              gte: item.quantity + (product.inventory?.reserved ?? 0),
            },
          },
          data: { quantity: { decrement: item.quantity } },
        })
        if (r.count === 0) throw conflict(`"${product.title}" just went out of stock`)
        const left = await tx.inventory.findUnique({
          where: { productId: product.id },
        })
        if (left && left.quantity - left.reserved <= 0) {
          await tx.product.update({
            where: { id: product.id },
            data: { status: "OUT_OF_STOCK" },
          })
        }
      }

      lines.push({
        productId: product.id,
        variantId: variant?.id ?? null,
        vendorId: product.vendor.id,
        title: variant ? `${product.title} — ${variant.name}` : product.title,
        unit: product.unit,
        unitPrice: num(variant?.price ?? product.price),
        quantity: item.quantity,
      })
      notifyVendorUsers.add(product.vendor.userId)
    }

    const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))
    // Prices are GST-inclusive and freight is arranged with the vendor, so neither is added here.
    const created = await tx.order.create({
      data: {
        orderNumber: newOrderNumber(),
        buyerId: user.id,
        channel: "B2C",
        subtotal,
        shippingFee: 0,
        tax: 0,
        total: subtotal,
        shippingAddress: addressSnapshot(shipping),
        ...(billing ? { billingAddress: addressSnapshot(billing) } : {}),
        notes: input.notes ?? null,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            vendorId: l.vendorId,
            variantId: l.variantId,
            title: l.title,
            unit: l.unit,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            lineTotal: round2(l.unitPrice * l.quantity),
          })),
        },
        payments: {
          create: [{ method: input.paymentMethod, amount: subtotal }],
        },
      },
      include: orderInclude,
    })

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
    if (notifyVendorUsers.size) {
      await tx.notification.createMany({
        data: [...notifyVendorUsers].map((userId) => ({
          userId,
          type: "ORDER" as const,
          title: "New order received",
          body: `Order ${created.orderNumber} includes your listings.`,
          data: { orderId: created.id },
        })),
      })
    }
    await audit(tx, {
      actor: user,
      action: "order.placed",
      entityType: "Order",
      entityId: created.id,
      metadata: {
        orderNumber: created.orderNumber,
        total: subtotal,
        items: lines.length,
      },
      ip: clientIp(c),
    })
    return created
  })

  return ok(c, toOrderDto(order), 201)
})

orderRoutes.get("/", async (c) => {
  const user = currentUser(c)
  const q = query(c, orderListQuery)
  const db = c.get("db")
  const where: Prisma.OrderWhereInput = {
    buyerId: user.id,
    ...(q.status ? { status: q.status } : {}),
  }
  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      include: orderInclude,
      ...skipTake(q),
    }),
  ])
  return page(c, rows.map(toOrderDto), pageMeta(total, q.page, q.pageSize))
})

orderRoutes.get("/:id", async (c) => {
  const user = currentUser(c)
  const { id } = params(c, idParam)
  const order = await c.get("db").order.findFirst({
    where: { id, buyerId: user.id },
    include: orderInclude,
  })
  if (!order) throw notFound("Order")
  return ok(c, toOrderDto(order))
})

orderRoutes.post("/:id/cancel", async (c) => {
  const user = currentUser(c)
  const { id } = params(c, idParam)
  const db = c.get("db")

  const cancelled = await db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id, buyerId: user.id },
      include: { items: true },
    })
    if (!order) throw notFound("Order")
    if (order.items.some((i) => i.status !== "PENDING" && i.status !== "CONFIRMED")) {
      throw conflict("This order is already being processed and can no longer be cancelled")
    }
    await restoreStock(tx, order.items)
    await tx.orderItem.updateMany({
      where: { orderId: id },
      data: { status: "CANCELLED" },
    })
    await tx.payment.updateMany({
      where: { orderId: id, status: "PENDING" },
      data: { status: "FAILED" },
    })
    const updated = await tx.order.update({
      where: { id },
      data: { status: deriveOrderStatus(["CANCELLED"]) },
      include: orderInclude,
    })
    await audit(tx, {
      actor: user,
      action: "order.cancelled",
      entityType: "Order",
      entityId: id,
      ip: clientIp(c),
    })
    return updated
  })
  return ok(c, toOrderDto(cancelled))
})

/** Puts stock back for cancelled line items (also used by vendor-side cancellation). */
export async function restoreStock(
  tx: Prisma.TransactionClient,
  items: {
    productId: string | null
    variantId: string | null
    quantity: number
  }[]
): Promise<void> {
  for (const item of items) {
    if (!item.productId) continue
    if (item.variantId) {
      await tx.productVariant.updateMany({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      })
    } else {
      await tx.inventory.updateMany({
        where: { productId: item.productId },
        data: { quantity: { increment: item.quantity } },
      })
      await tx.product.updateMany({
        where: { id: item.productId, status: "OUT_OF_STOCK", deletedAt: null },
        data: { status: "PUBLISHED" },
      })
    }
  }
}
