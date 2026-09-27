import type { Prisma, PrismaClient } from "@workspace/db"
import type { InquiryDto, QuoteDto } from "@workspace/types"
import {
  acceptQuoteInput,
  createInquiryInput,
  idParam,
  inquiryListQuery,
  quoteDecisionInput,
  quoteListQuery,
  submitQuoteInput,
} from "@workspace/validators"
import { Hono, type Context } from "hono"

import type { AppEnv } from "../context"
import { audit } from "../lib/audit"
import { conflict, forbidden, notFound } from "../lib/errors"
import { jsonBody, ok, page, pageMeta, params, query, skipTake } from "../lib/http"
import { clientIp } from "../lib/ip"
import { num, numOrNull, round2 } from "../lib/money"
import { newOrderNumber } from "../lib/order-status"
import { availableQuantity, publiclyVisible } from "../lib/product-dto"
import { currentUser, requireAuth, requireRole } from "../middleware/auth"

type Db = PrismaClient | Prisma.TransactionClient

/** Quotes past their validity are flipped to EXPIRED lazily, before any B2B read/write. */
async function expireStaleQuotes(db: Db): Promise<void> {
  await db.b2BQuote.updateMany({
    where: { status: "SUBMITTED", validUntil: { lt: new Date() } },
    data: { status: "EXPIRED" },
  })
}

/** Re-derives an inquiry's status from its quotes after one of them changes. */
async function refreshInquiryStatus(tx: Prisma.TransactionClient, inquiryId: string): Promise<void> {
  const live = await tx.b2BQuote.count({
    where: { inquiryId, status: "SUBMITTED" },
  })
  await tx.b2BInquiry.updateMany({
    where: { id: inquiryId, status: { in: ["OPEN", "QUOTED"] } },
    data: { status: live > 0 ? "QUOTED" : "OPEN" },
  })
}

const quoteSelect = {
  id: true,
  inquiryId: true,
  unitPrice: true,
  quantity: true,
  totalPrice: true,
  leadTimeDays: true,
  validUntil: true,
  terms: true,
  status: true,
  orderId: true,
  createdAt: true,
} as const satisfies Prisma.B2BQuoteSelect

type QuoteRow = Prisma.B2BQuoteGetPayload<{ select: typeof quoteSelect }>

function toQuoteDto(q: QuoteRow): QuoteDto {
  return {
    id: q.id,
    inquiryId: q.inquiryId,
    unitPrice: num(q.unitPrice),
    quantity: q.quantity,
    totalPrice: num(q.totalPrice),
    leadTimeDays: q.leadTimeDays,
    validUntil: q.validUntil.toISOString(),
    terms: q.terms,
    status: q.status,
    orderId: q.orderId,
    createdAt: q.createdAt.toISOString(),
  }
}

type InquiryRow = Prisma.B2BInquiryGetPayload<{
  include: { product: { select: { id: true; slug: true; title: true } } }
}>

function toInquiryDto(i: InquiryRow): InquiryDto {
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    quantity: i.quantity,
    unit: i.unit,
    targetUnitPrice: numOrNull(i.targetUnitPrice),
    deliveryCity: i.deliveryCity,
    deliveryPincode: i.deliveryPincode,
    neededBy: i.neededBy?.toISOString() ?? null,
    status: i.status,
    vendorId: i.vendorId,
    product: i.product,
    createdAt: i.createdAt.toISOString(),
  }
}

const inquiryInclude = {
  product: { select: { id: true, slug: true, title: true } },
} as const satisfies Prisma.B2BInquiryInclude

/* ------------------------------------------------------------------ */
/* Buyer side                                                          */
/* ------------------------------------------------------------------ */

export const b2bRoutes = new Hono<AppEnv>()
b2bRoutes.use("*", requireAuth)

b2bRoutes.post("/inquiries", async (c) => {
  const user = currentUser(c)
  const input = await jsonBody(c, createInquiryInput)
  const db = c.get("db")

  const profile = await db.buyerProfile.findUnique({
    where: { userId: user.id },
  })
  if (!profile || profile.buyerType !== "BUSINESS" || !profile.gstin) {
    throw forbidden("Add your business profile with a GSTIN to request B2B quotes")
  }

  let vendorId: string | null = null
  let productId: string | null = null
  if (input.productId) {
    const product = await db.product.findFirst({
      where: { id: input.productId, ...publiclyVisible },
      select: {
        id: true,
        vendorId: true,
        minOrderQty: true,
        vendor: { select: { userId: true } },
      },
    })
    if (!product) throw notFound("Product")
    if (product.vendor.userId === user.id) throw conflict("You cannot request a quote on your own listing")
    if (input.quantity < product.minOrderQty) {
      throw conflict(`Minimum order quantity for this product is ${product.minOrderQty}`)
    }
    // The vendor is derived from the product, never taken from the request.
    vendorId = product.vendorId
    productId = product.id
  } else if (input.vendorId) {
    const vendor = await db.vendor.findFirst({
      where: { id: input.vendorId, status: "APPROVED" },
      select: { id: true, userId: true },
    })
    if (!vendor) throw notFound("Vendor")
    if (vendor.userId === user.id) throw conflict("You cannot request a quote from yourself")
    vendorId = vendor.id
  }

  const inquiry = await db.$transaction(async (tx) => {
    const created = await tx.b2BInquiry.create({
      data: {
        buyerId: user.id,
        vendorId,
        productId,
        title: input.title,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        targetUnitPrice: input.targetUnitPrice ?? null,
        deliveryCity: input.deliveryCity,
        deliveryPincode: input.deliveryPincode ?? null,
        neededBy: input.neededBy ?? null,
      },
      include: inquiryInclude,
    })
    if (vendorId) {
      const vendor = await tx.vendor.findUnique({
        where: { id: vendorId },
        select: { userId: true },
      })
      if (vendor) {
        await tx.notification.create({
          data: {
            userId: vendor.userId,
            type: "INQUIRY",
            title: "New quote request",
            body: created.title,
            data: { inquiryId: created.id },
          },
        })
      }
    }
    await audit(tx, {
      actor: user,
      action: "inquiry.created",
      entityType: "B2BInquiry",
      entityId: created.id,
      ip: clientIp(c),
    })
    return created
  })
  return ok(c, toInquiryDto(inquiry), 201)
})

b2bRoutes.get("/inquiries", async (c) => {
  const user = currentUser(c)
  const q = query(c, inquiryListQuery)
  const db = c.get("db")
  await expireStaleQuotes(db)
  const where: Prisma.B2BInquiryWhereInput = {
    buyerId: user.id,
    ...(q.status ? { status: q.status } : {}),
  }
  const [total, rows] = await Promise.all([
    db.b2BInquiry.count({ where }),
    db.b2BInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        ...inquiryInclude,
        _count: { select: { quotes: { where: { status: "SUBMITTED" } } } },
      },
      ...skipTake(q),
    }),
  ])
  return page(
    c,
    rows.map(({ _count, ...row }) => ({
      ...toInquiryDto(row),
      openQuotes: _count.quotes,
    })),
    pageMeta(total, q.page, q.pageSize)
  )
})

async function ownInquiry(c: Context<AppEnv>, id: string) {
  const user = currentUser(c)
  const inquiry = await c.get("db").b2BInquiry.findFirst({
    where: { id, buyerId: user.id },
    include: inquiryInclude,
  })
  if (!inquiry) throw notFound("Inquiry")
  return inquiry
}

b2bRoutes.get("/inquiries/:id", async (c) => {
  const { id } = params(c, idParam)
  const db = c.get("db")
  await expireStaleQuotes(db)
  const inquiry = await ownInquiry(c, id)
  const quotes = await db.b2BQuote.findMany({
    where: { inquiryId: id },
    orderBy: { createdAt: "desc" },
    select: {
      ...quoteSelect,
      vendor: { select: { id: true, slug: true, businessName: true } },
    },
  })
  return ok(c, {
    ...toInquiryDto(inquiry),
    quotes: quotes.map(({ vendor, ...q }) => ({ ...toQuoteDto(q), vendor })),
  })
})

b2bRoutes.post("/inquiries/:id/cancel", async (c) => {
  const user = currentUser(c)
  const { id } = params(c, idParam)
  const db = c.get("db")
  const inquiry = await ownInquiry(c, id)
  if (inquiry.status !== "OPEN" && inquiry.status !== "QUOTED") {
    throw conflict(`A ${inquiry.status.toLowerCase()} inquiry cannot be cancelled`)
  }
  await db.$transaction(async (tx) => {
    await tx.b2BQuote.updateMany({
      where: { inquiryId: id, status: "SUBMITTED" },
      data: { status: "REJECTED", decisionNote: "Inquiry cancelled by buyer" },
    })
    await tx.b2BInquiry.update({ where: { id }, data: { status: "CANCELLED" } })
    await audit(tx, {
      actor: user,
      action: "inquiry.cancelled",
      entityType: "B2BInquiry",
      entityId: id,
      ip: clientIp(c),
    })
  })
  return ok(c, { cancelled: true })
})

/** Loads a quote the caller (as buyer) owns via its inquiry; anything else is "not found". */
async function ownQuote(tx: Db, quoteId: string, buyerId: string) {
  const quote = await tx.b2BQuote.findFirst({
    where: { id: quoteId, inquiry: { buyerId } },
    include: {
      inquiry: { include: { product: { include: { inventory: true } } } },
      vendor: { select: { id: true, userId: true } },
    },
  })
  if (!quote) throw notFound("Quote")
  return quote
}

b2bRoutes.post("/quotes/:id/accept", async (c) => {
  const user = currentUser(c)
  const { id } = params(c, idParam)
  const input = await jsonBody(c, acceptQuoteInput)
  const db = c.get("db")
  await expireStaleQuotes(db)

  const order = await db.$transaction(async (tx) => {
    const quote = await ownQuote(tx, id, user.id)
    if (quote.status !== "SUBMITTED")
      throw conflict(`This quote is ${quote.status.toLowerCase()} and can no longer be accepted`)
    if (quote.inquiry.status !== "OPEN" && quote.inquiry.status !== "QUOTED") {
      throw conflict("This inquiry is closed")
    }

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

    const product = quote.inquiry.product
    if (product) {
      const r = await tx.inventory.updateMany({
        where: { productId: product.id, quantity: { gte: quote.quantity } },
        data: { quantity: { decrement: quote.quantity } },
      })
      if (r.count === 0) {
        throw conflict(
          `Only ${product.inventory ? availableQuantity({ inventory: product.inventory }) : 0} units are available right now`
        )
      }
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

    const snap = (a: NonNullable<typeof shipping>): Prisma.InputJsonObject => ({
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      country: a.country,
    })
    const total = num(quote.totalPrice)
    const created = await tx.order.create({
      data: {
        orderNumber: newOrderNumber(),
        buyerId: user.id,
        channel: "B2B",
        subtotal: total,
        total,
        shippingAddress: snap(shipping),
        ...(billing ? { billingAddress: snap(billing) } : {}),
        items: {
          create: [
            {
              productId: product?.id ?? null,
              vendorId: quote.vendorId,
              title: quote.inquiry.title,
              unit: quote.inquiry.unit,
              unitPrice: quote.unitPrice,
              quantity: quote.quantity,
              lineTotal: total,
            },
          ],
        },
        payments: { create: [{ method: "BANK_TRANSFER", amount: total }] },
      },
    })

    await tx.b2BQuote.update({
      where: { id },
      data: { status: "ACCEPTED", orderId: created.id },
    })
    await tx.b2BQuote.updateMany({
      where: {
        inquiryId: quote.inquiryId,
        id: { not: id },
        status: "SUBMITTED",
      },
      data: { status: "REJECTED", decisionNote: "Another quote was accepted" },
    })
    await tx.b2BInquiry.update({
      where: { id: quote.inquiryId },
      data: { status: "ACCEPTED" },
    })
    await tx.notification.create({
      data: {
        userId: quote.vendor.userId,
        type: "QUOTE",
        title: "Your quote was accepted",
        body: `Order ${created.orderNumber} has been placed.`,
        data: { orderId: created.id, quoteId: id },
      },
    })
    await audit(tx, {
      actor: user,
      action: "quote.accepted",
      entityType: "B2BQuote",
      entityId: id,
      metadata: { orderId: created.id, total },
      ip: clientIp(c),
    })
    return created
  })
  return ok(c, { orderId: order.id, orderNumber: order.orderNumber }, 201)
})

b2bRoutes.post("/quotes/:id/reject", async (c) => {
  const user = currentUser(c)
  const { id } = params(c, idParam)
  const input = await jsonBody(c, quoteDecisionInput)
  const db = c.get("db")
  await db.$transaction(async (tx) => {
    const quote = await ownQuote(tx, id, user.id)
    if (quote.status !== "SUBMITTED")
      throw conflict(`This quote is ${quote.status.toLowerCase()} and can no longer be rejected`)
    await tx.b2BQuote.update({
      where: { id },
      data: { status: "REJECTED", decisionNote: input.reason ?? null },
    })
    await refreshInquiryStatus(tx, quote.inquiryId)
    await tx.notification.create({
      data: {
        userId: quote.vendor.userId,
        type: "QUOTE",
        title: "Your quote was declined",
        body: quote.inquiry.title,
        data: { quoteId: id },
      },
    })
    await audit(tx, {
      actor: user,
      action: "quote.rejected",
      entityType: "B2BQuote",
      entityId: id,
      ip: clientIp(c),
    })
  })
  return ok(c, { rejected: true })
})

/* ------------------------------------------------------------------ */
/* Vendor side (mounted under /api/vendor/b2b)                         */
/* ------------------------------------------------------------------ */

export const vendorB2bRoutes = new Hono<AppEnv>()
vendorB2bRoutes.use("*", requireRole("VENDOR"))

async function approvedVendor(c: Context<AppEnv>) {
  const user = currentUser(c)
  const vendor = await c.get("db").vendor.findUnique({ where: { userId: user.id } })
  if (!vendor) throw forbidden("Complete vendor registration first")
  if (vendor.status !== "APPROVED") throw forbidden("Your vendor account is awaiting approval")
  return { user, vendor }
}

/** Direct RFQs addressed to this vendor, plus open requirements any approved vendor may answer. */
function visibleTo(vendorId: string): Prisma.B2BInquiryWhereInput {
  return {
    OR: [{ vendorId }, { vendorId: null, status: { in: ["OPEN", "QUOTED"] } }],
  }
}

/** Buyer identity is intentionally absent: vendors learn who the buyer is only via an accepted order. */
function toVendorInquiryDto(i: InquiryRow & { buyer: { buyerProfile: { buyerType: string } | null } }) {
  return {
    ...toInquiryDto(i),
    buyerType: i.buyer.buyerProfile?.buyerType ?? "BUSINESS",
  }
}

vendorB2bRoutes.get("/inquiries", async (c) => {
  const { vendor } = await approvedVendor(c)
  const q = query(c, inquiryListQuery)
  const db = c.get("db")
  await expireStaleQuotes(db)
  const where: Prisma.B2BInquiryWhereInput = {
    AND: [visibleTo(vendor.id), q.status ? { status: q.status } : {}],
  }
  const [total, rows] = await Promise.all([
    db.b2BInquiry.count({ where }),
    db.b2BInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        ...inquiryInclude,
        buyer: { select: { buyerProfile: { select: { buyerType: true } } } },
        quotes: { where: { vendorId: vendor.id }, select: quoteSelect },
      },
      ...skipTake(q),
    }),
  ])
  return page(
    c,
    rows.map(({ quotes, ...row }) => ({
      ...toVendorInquiryDto(row),
      myQuote: quotes[0] ? toQuoteDto(quotes[0]) : null,
    })),
    pageMeta(total, q.page, q.pageSize)
  )
})

vendorB2bRoutes.get("/inquiries/:id", async (c) => {
  const { vendor } = await approvedVendor(c)
  const { id } = params(c, idParam)
  const db = c.get("db")
  await expireStaleQuotes(db)
  const row = await db.b2BInquiry.findFirst({
    where: { AND: [{ id }, visibleTo(vendor.id)] },
    include: {
      ...inquiryInclude,
      buyer: { select: { buyerProfile: { select: { buyerType: true } } } },
      quotes: { where: { vendorId: vendor.id }, select: quoteSelect },
    },
  })
  if (!row) throw notFound("Inquiry")
  const { quotes, ...rest } = row
  return ok(c, {
    ...toVendorInquiryDto(rest),
    myQuote: quotes[0] ? toQuoteDto(quotes[0]) : null,
  })
})

vendorB2bRoutes.post("/inquiries/:id/quote", async (c) => {
  const { user, vendor } = await approvedVendor(c)
  const { id } = params(c, idParam)
  const input = await jsonBody(c, submitQuoteInput)
  const db = c.get("db")
  await expireStaleQuotes(db)

  const quote = await db.$transaction(async (tx) => {
    const inquiry = await tx.b2BInquiry.findFirst({
      where: { AND: [{ id }, visibleTo(vendor.id)] },
    })
    if (!inquiry) throw notFound("Inquiry")
    if (inquiry.status !== "OPEN" && inquiry.status !== "QUOTED") throw conflict("This inquiry is closed")
    if (inquiry.buyerId === user.id) throw conflict("You cannot quote your own inquiry")

    const existing = await tx.b2BQuote.findUnique({
      where: { inquiryId_vendorId: { inquiryId: id, vendorId: vendor.id } },
    })
    if (existing && existing.status !== "WITHDRAWN" && existing.status !== "EXPIRED") {
      throw conflict(`You already have a ${existing.status.toLowerCase()} quote on this inquiry`)
    }
    const data = {
      unitPrice: input.unitPrice,
      quantity: input.quantity,
      totalPrice: round2(input.unitPrice * input.quantity),
      leadTimeDays: input.leadTimeDays,
      validUntil: input.validUntil,
      terms: input.terms ?? null,
      status: "SUBMITTED" as const,
      decisionNote: null,
    }
    const saved = existing
      ? await tx.b2BQuote.update({
          where: { id: existing.id },
          data,
          select: quoteSelect,
        })
      : await tx.b2BQuote.create({
          data: { inquiryId: id, vendorId: vendor.id, ...data },
          select: quoteSelect,
        })

    await tx.b2BInquiry.update({ where: { id }, data: { status: "QUOTED" } })
    await tx.notification.create({
      data: {
        userId: inquiry.buyerId,
        type: "QUOTE",
        title: "You received a quote",
        body: inquiry.title,
        data: { inquiryId: id, quoteId: saved.id },
      },
    })
    await audit(tx, {
      actor: user,
      action: "quote.submitted",
      entityType: "B2BQuote",
      entityId: saved.id,
      ip: clientIp(c),
    })
    return saved
  })
  return ok(c, toQuoteDto(quote), 201)
})

vendorB2bRoutes.get("/quotes", async (c) => {
  const { vendor } = await approvedVendor(c)
  const q = query(c, quoteListQuery)
  const db = c.get("db")
  await expireStaleQuotes(db)
  const where: Prisma.B2BQuoteWhereInput = {
    vendorId: vendor.id,
    ...(q.status ? { status: q.status } : {}),
  }
  const [total, rows] = await Promise.all([
    db.b2BQuote.count({ where }),
    db.b2BQuote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        ...quoteSelect,
        inquiry: {
          select: { id: true, title: true, quantity: true, unit: true },
        },
      },
      ...skipTake(q),
    }),
  ])
  return page(
    c,
    rows.map(({ inquiry, ...r }) => ({ ...toQuoteDto(r), inquiry })),
    pageMeta(total, q.page, q.pageSize)
  )
})

vendorB2bRoutes.post("/quotes/:id/withdraw", async (c) => {
  const { user, vendor } = await approvedVendor(c)
  const { id } = params(c, idParam)
  const db = c.get("db")
  await db.$transaction(async (tx) => {
    const quote = await tx.b2BQuote.findFirst({
      where: { id, vendorId: vendor.id },
    })
    if (!quote) throw notFound("Quote")
    if (quote.status !== "SUBMITTED") throw conflict(`A ${quote.status.toLowerCase()} quote cannot be withdrawn`)
    await tx.b2BQuote.update({ where: { id }, data: { status: "WITHDRAWN" } })
    await refreshInquiryStatus(tx, quote.inquiryId)
    await audit(tx, {
      actor: user,
      action: "quote.withdrawn",
      entityType: "B2BQuote",
      entityId: id,
      ip: clientIp(c),
    })
  })
  return ok(c, { withdrawn: true })
})
