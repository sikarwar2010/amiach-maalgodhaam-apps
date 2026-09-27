import type { Prisma, PrismaClient } from "@workspace/db"
import type { ProductStatus } from "@workspace/types"
import {
  createProductInput,
  idParam,
  pageQuery,
  productDocumentInput,
  productImageInput,
  reorderImagesInput,
  updateProductInput,
  vendorDocumentInput,
  vendorFulfilmentInput,
  vendorProductListQuery,
  vendorProductStatusInput,
  vendorProfileUpdateInput,
  vendorRegistrationInput,
} from "@workspace/validators"
import { Hono, type Context } from "hono"
import { z } from "zod"

import type { AppEnv } from "../context"
import { audit } from "../lib/audit"
import { conflict, forbidden, notFound, validation } from "../lib/errors"
import { jsonBody, ok, page, pageMeta, params, query, skipTake } from "../lib/http"
import { clientIp } from "../lib/ip"
import { notifyBackOffice } from "../lib/notify"
import { num, numOrNull } from "../lib/money"
import { canTransition, deriveOrderStatus } from "../lib/order-status"
import { withSuffix } from "../lib/slug"
import { currentUser, requireAuth, requireRole } from "../middleware/auth"
import { restoreStock } from "./commerce"

export const vendorRoutes = new Hono<AppEnv>()

/* ------------------------------------------------------------------ */
/* Registration (any signed-in user)                                   */
/* ------------------------------------------------------------------ */

vendorRoutes.post("/register", requireAuth, async (c) => {
  const user = currentUser(c)
  if (user.role !== "BUYER" && user.role !== "VENDOR") {
    throw forbidden("Back-office accounts cannot register as vendors")
  }
  const input = await jsonBody(c, vendorRegistrationInput)
  const db = c.get("db")

  const existing = await db.vendor.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })
  if (existing) throw conflict("You have already registered a vendor account")
  if (input.gstin) {
    const gstinTaken = await db.vendor.findUnique({
      where: { gstin: input.gstin },
      select: { id: true },
    })
    if (gstinTaken) throw conflict("A vendor with this GSTIN is already registered")
  }

  const vendor = await db.$transaction(async (tx) => {
    const created = await tx.vendor.create({
      data: {
        userId: user.id,
        businessName: input.businessName,
        slug: withSuffix(input.businessName),
        vendorType: input.vendorType,
        contactName: input.contactName,
        phone: input.phone,
        email: input.email ?? user.email,
        gstin: input.gstin ?? null,
        pan: input.pan ?? null,
        description: input.description ?? null,
        addressLine: input.addressLine ?? null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        categories: input.categories,
      },
    })
    // Role is decided here by the server; the request body has no say in it.
    if (user.role === "BUYER") {
      await tx.user.update({
        where: { id: user.id },
        data: {
          role: "VENDOR",
          onboarded: true,
          name: user.name ?? input.contactName,
        },
      })
    }
    await audit(tx, {
      actor: user,
      action: "vendor.registered",
      entityType: "Vendor",
      entityId: created.id,
      ip: clientIp(c),
    })
    await notifyBackOffice(tx, {
      type: "VENDOR",
      title: "New vendor awaiting approval",
      body: created.businessName,
      data: { vendorId: created.id },
    })
    return created
  })

  await c
    .get("identity")
    .syncMetadata(user.clerkId, { role: "VENDOR", onboarded: true })
    .catch(() => undefined)

  return ok(c, toVendorDto(vendor), 201)
})

/* ------------------------------------------------------------------ */
/* Everything below is vendor-only                                     */
/* ------------------------------------------------------------------ */

vendorRoutes.use("*", requireRole("VENDOR"))

/**
 * Loads the caller's vendor row. `approved: true` demands an APPROVED vendor; `draft: true` also lets a vendor
 * that is still PENDING prepare drafts (create/edit products, add images) while they wait for verification.
 */
async function ownVendor(c: Context<AppEnv>, opts: { approved: boolean; draft?: boolean }) {
  const user = currentUser(c)
  const vendor = await c.get("db").vendor.findUnique({ where: { userId: user.id } })
  if (!vendor) throw forbidden("Complete vendor registration first")
  const allowed = vendor.status === "APPROVED" || (opts.draft === true && vendor.status === "PENDING")
  if (opts.approved && !allowed) {
    throw forbidden(
      vendor.status === "PENDING"
        ? "Your vendor account is awaiting approval"
        : `Your vendor account is ${vendor.status.toLowerCase()}`
    )
  }
  return { user, vendor }
}

type VendorRow = Prisma.VendorGetPayload<object>

function toVendorDto(v: VendorRow) {
  return {
    id: v.id,
    slug: v.slug,
    vendorType: v.vendorType,
    businessName: v.businessName,
    contactName: v.contactName,
    phone: v.phone,
    email: v.email,
    gstin: v.gstin,
    pan: v.pan,
    description: v.description,
    logoUrl: v.logoUrl,
    addressLine: v.addressLine,
    city: v.city,
    state: v.state,
    pincode: v.pincode,
    categories: v.categories,
    status: v.status,
    rejectionReason: v.rejectionReason,
    verifiedAt: v.verifiedAt,
    createdAt: v.createdAt,
  }
}

vendorRoutes.get("/profile", async (c) => {
  const { vendor } = await ownVendor(c, { approved: false })
  return ok(c, toVendorDto(vendor))
})

vendorRoutes.patch("/profile", async (c) => {
  const { user, vendor } = await ownVendor(c, { approved: false })
  const input = await jsonBody(c, vendorProfileUpdateInput)
  if (vendor.status === "SUSPENDED") throw forbidden("Suspended vendors cannot edit their profile")
  if (
    vendor.status === "APPROVED" &&
    ((input.gstin && input.gstin !== vendor.gstin) || (input.pan && input.pan !== vendor.pan))
  ) {
    throw forbidden("Tax identifiers cannot be changed after approval. Contact support.")
  }
  if (input.gstin && input.gstin !== vendor.gstin) {
    const taken = await c.get("db").vendor.findUnique({
      where: { gstin: input.gstin },
      select: { id: true },
    })
    if (taken) throw conflict("A vendor with this GSTIN is already registered")
  }
  const {
    businessName,
    contactName,
    phone,
    email,
    gstin,
    pan,
    description,
    logoUrl,
    addressLine,
    city,
    state,
    pincode,
    categories,
  } = input
  const updated = await c.get("db").$transaction(async (tx) => {
    const row = await tx.vendor.update({
      where: { id: vendor.id },
      data: {
        ...(businessName !== undefined ? { businessName } : {}),
        ...(contactName !== undefined ? { contactName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(gstin !== undefined ? { gstin } : {}),
        ...(pan !== undefined ? { pan } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(addressLine !== undefined ? { addressLine } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(pincode !== undefined ? { pincode } : {}),
        ...(categories !== undefined ? { categories } : {}),
      },
    })
    await audit(tx, {
      actor: user,
      action: "vendor.profile_updated",
      entityType: "Vendor",
      entityId: vendor.id,
      ip: clientIp(c),
    })
    return row
  })
  return ok(c, toVendorDto(updated))
})

/* ------------------------------ documents ------------------------------ */

vendorRoutes.get("/documents", async (c) => {
  const { vendor } = await ownVendor(c, { approved: false })
  return ok(
    c,
    await c.get("db").vendorDocument.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" },
    })
  )
})

vendorRoutes.post("/documents", async (c) => {
  const { user, vendor } = await ownVendor(c, { approved: false })
  const input = await jsonBody(c, vendorDocumentInput)
  const db = c.get("db")
  const doc = await db.vendorDocument.create({
    data: { vendorId: vendor.id, ...input },
  })
  await audit(db, {
    actor: user,
    action: "vendor.document_added",
    entityType: "VendorDocument",
    entityId: doc.id,
    ip: clientIp(c),
  })
  return ok(c, doc, 201)
})

vendorRoutes.delete("/documents/:id", async (c) => {
  const { vendor } = await ownVendor(c, { approved: false })
  const { id } = params(c, idParam)
  const r = await c.get("db").vendorDocument.deleteMany({ where: { id, vendorId: vendor.id } })
  if (r.count === 0) throw notFound("Document")
  return ok(c, { deleted: true })
})

/* ------------------------------ dashboard ------------------------------ */

vendorRoutes.get("/dashboard", async (c) => {
  const { vendor } = await ownVendor(c, { approved: false })
  const db = c.get("db")
  const [productGroups, itemGroups, revenue, openInquiries, pendingQuotes] = await Promise.all([
    db.product.groupBy({
      by: ["status"],
      where: { vendorId: vendor.id, deletedAt: null },
      _count: { _all: true },
    }),
    db.orderItem.groupBy({
      by: ["status"],
      where: { vendorId: vendor.id },
      _count: { _all: true },
    }),
    db.orderItem.aggregate({
      where: { vendorId: vendor.id, status: "DELIVERED" },
      _sum: { lineTotal: true },
    }),
    db.b2BInquiry.count({
      where: {
        status: { in: ["OPEN", "QUOTED"] },
        OR: [{ vendorId: vendor.id }, { vendorId: null }],
      },
    }),
    db.b2BQuote.count({
      where: { vendorId: vendor.id, status: "SUBMITTED" },
    }),
  ])
  return ok(c, {
    vendorStatus: vendor.status,
    products: Object.fromEntries(productGroups.map((g) => [g.status, g._count._all])),
    orderItems: Object.fromEntries(itemGroups.map((g) => [g.status, g._count._all])),
    deliveredRevenue: num(revenue._sum.lineTotal),
    openInquiries,
    pendingQuotes,
  })
})

/* ------------------------------- products ------------------------------ */

const vendorProductInclude = {
  images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
  category: { select: { id: true, slug: true, name: true } },
  subCategory: { select: { id: true, slug: true, name: true } },
  inventory: { select: { quantity: true, reserved: true } },
  bulkPrices: { orderBy: { minQty: "asc" } },
  documents: true,
} as const satisfies Prisma.ProductInclude

type VendorProductRow = Prisma.ProductGetPayload<{
  include: typeof vendorProductInclude
}>

function toVendorProduct(p: VendorProductRow) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    brand: p.brand,
    description: p.description,
    status: p.status,
    rejectionReason: p.rejectionReason,
    condition: p.condition,
    dealType: p.dealType,
    unit: p.unit,
    price: num(p.price),
    marketValue: numOrNull(p.marketValue),
    minOrderQty: p.minOrderQty,
    quantity: p.inventory?.quantity ?? 0,
    city: p.city,
    state: p.state,
    pincode: p.pincode,
    logisticsMethods: p.logisticsMethods,
    conditionNotes: p.conditionNotes,
    specifications: p.specifications,
    tags: p.tags,
    category: p.category,
    subCategory: p.subCategory,
    images: p.images.map((i) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      isPrimary: i.isPrimary,
      position: i.position,
    })),
    bulkPrices: p.bulkPrices.map((b) => ({
      id: b.id,
      minQty: b.minQty,
      maxQty: b.maxQty,
      unitPrice: num(b.unitPrice),
    })),
    documents: p.documents,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

async function assertCategory(db: PrismaClient | Prisma.TransactionClient, categoryId: string, subCategoryId?: string) {
  const category = await db.category.findFirst({
    where: { id: categoryId, isActive: true },
    select: { id: true },
  })
  if (!category) throw validation("Unknown category", [{ path: "categoryId", message: "Category not found" }])
  if (subCategoryId) {
    const sub = await db.subCategory.findFirst({
      where: { id: subCategoryId, categoryId },
      select: { id: true },
    })
    if (!sub) throw validation("Unknown sub-category", [{ path: "subCategoryId", message: "Not in this category" }])
  }
}

vendorRoutes.get("/products", async (c) => {
  const { vendor } = await ownVendor(c, { approved: false })
  const q = query(c, vendorProductListQuery)
  const db = c.get("db")
  const where: Prisma.ProductWhereInput = {
    vendorId: vendor.id,
    deletedAt: null,
    ...(q.status ? { status: q.status } : {}),
    ...(q.q ? { title: { contains: q.q, mode: "insensitive" } } : {}),
  }
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: vendorProductInclude,
      ...skipTake(q),
    }),
  ])
  return page(c, rows.map(toVendorProduct), pageMeta(total, q.page, q.pageSize))
})

vendorRoutes.post("/products", async (c) => {
  const { user, vendor } = await ownVendor(c, { approved: true, draft: true })
  const input = await jsonBody(c, createProductInput)
  const db = c.get("db")

  const created = await db.$transaction(async (tx) => {
    await assertCategory(tx, input.categoryId, input.subCategoryId)
    const product = await tx.product.create({
      data: {
        // vendorId always comes from the authenticated vendor — the body's value (if any) is ignored by the schema.
        vendorId: vendor.id,
        categoryId: input.categoryId,
        subCategoryId: input.subCategoryId ?? null,
        slug: withSuffix(input.title),
        title: input.title,
        brand: input.brand ?? null,
        description: input.description,
        condition: input.condition,
        dealType: input.dealType,
        unit: input.unit,
        price: input.price,
        marketValue: input.marketValue ?? null,
        minOrderQty: input.minOrderQty,
        city: input.city,
        state: input.state,
        pincode: input.pincode ?? null,
        logisticsMethods: input.logisticsMethods,
        conditionNotes: input.conditionNotes ?? null,
        specifications: input.specifications,
        tags: input.tags.map((t) => t.toLowerCase()),
        inventory: { create: { quantity: input.quantity } },
        images: {
          create: input.images.map((img, position) => ({
            url: img.url,
            alt: img.alt ?? null,
            position,
            isPrimary: position === 0,
          })),
        },
        bulkPrices: {
          create: input.bulkPrices.map((b) => ({
            minQty: b.minQty,
            maxQty: b.maxQty ?? null,
            unitPrice: b.unitPrice,
          })),
        },
      },
      include: vendorProductInclude,
    })
    await audit(tx, {
      actor: user,
      action: "product.created",
      entityType: "Product",
      entityId: product.id,
      ip: clientIp(c),
    })
    return product
  })
  return ok(c, toVendorProduct(created), 201)
})

async function ownProduct(c: Context<AppEnv>, vendorId: string, id: string) {
  // (id, vendorId) together: a product belonging to another vendor is reported as "not found".
  const p = await c.get("db").product.findFirst({
    where: { id, vendorId, deletedAt: null },
    include: vendorProductInclude,
  })
  if (!p) throw notFound("Product")
  return p
}

vendorRoutes.get("/products/:id", async (c) => {
  const { vendor } = await ownVendor(c, { approved: false })
  const { id } = params(c, idParam)
  return ok(c, toVendorProduct(await ownProduct(c, vendor.id, id)))
})

/** Fields whose change on a live listing must be re-reviewed. */
const REVIEWED_FIELDS = ["title", "description", "brand", "categoryId", "condition"] as const

vendorRoutes.patch("/products/:id", async (c) => {
  const { user, vendor } = await ownVendor(c, { approved: true, draft: true })
  const { id } = params(c, idParam)
  const input = await jsonBody(c, updateProductInput)
  const db = c.get("db")
  const current = await ownProduct(c, vendor.id, id)

  const updated = await db.$transaction(async (tx) => {
    const categoryId = input.categoryId ?? current.categoryId
    if (input.categoryId || input.subCategoryId)
      await assertCategory(tx, categoryId, input.subCategoryId ?? current.subCategoryId ?? undefined)

    const price = input.price ?? num(current.price)
    const marketValue = input.marketValue ?? numOrNull(current.marketValue)
    if (marketValue !== null && marketValue < price) {
      throw validation("Market value should not be lower than the selling price", [
        { path: "marketValue", message: "Lower than price" },
      ])
    }
    const quantity = input.quantity ?? current.inventory?.quantity ?? 0
    const minOrderQty = input.minOrderQty ?? current.minOrderQty
    if (minOrderQty > quantity) {
      throw validation("Minimum order quantity cannot exceed available quantity", [
        { path: "minOrderQty", message: "Exceeds quantity" },
      ])
    }

    const reviewNeeded =
      current.status === "PUBLISHED" && REVIEWED_FIELDS.some((f) => input[f] !== undefined && input[f] !== current[f])

    let status: ProductStatus = current.status
    if (reviewNeeded) status = "PENDING_REVIEW"
    else if (current.status === "PUBLISHED" && quantity === 0) status = "OUT_OF_STOCK"
    else if (current.status === "OUT_OF_STOCK" && quantity > 0) status = "PUBLISHED"

    if (input.bulkPrices) {
      await tx.b2BPrice.deleteMany({ where: { productId: id } })
      await tx.b2BPrice.createMany({
        data: input.bulkPrices.map((b) => ({
          productId: id,
          minQty: b.minQty,
          maxQty: b.maxQty ?? null,
          unitPrice: b.unitPrice,
        })),
      })
    }
    if (input.quantity !== undefined) {
      await tx.inventory.upsert({
        where: { productId: id },
        create: { productId: id, quantity: input.quantity },
        update: { quantity: input.quantity },
      })
    }
    if (input.images) {
      await tx.productImage.deleteMany({ where: { productId: id } })
      await tx.productImage.createMany({
        data: input.images.map((img, position) => ({
          productId: id,
          url: img.url,
          alt: img.alt ?? null,
          position,
          isPrimary: position === 0,
        })),
      })
    }

    const {
      title,
      brand,
      description,
      condition,
      dealType,
      unit,
      city,
      state,
      pincode,
      logisticsMethods,
      conditionNotes,
      specifications,
      tags,
    } = input
    return tx.product.update({
      where: { id },
      data: {
        status,
        ...(title !== undefined ? { title } : {}),
        ...(brand !== undefined ? { brand } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.subCategoryId !== undefined ? { subCategoryId: input.subCategoryId } : {}),
        ...(condition !== undefined ? { condition } : {}),
        ...(dealType !== undefined ? { dealType } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.marketValue !== undefined ? { marketValue: input.marketValue } : {}),
        ...(input.minOrderQty !== undefined ? { minOrderQty: input.minOrderQty } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(pincode !== undefined ? { pincode } : {}),
        ...(logisticsMethods !== undefined ? { logisticsMethods } : {}),
        ...(conditionNotes !== undefined ? { conditionNotes } : {}),
        ...(specifications !== undefined ? { specifications } : {}),
        ...(tags !== undefined ? { tags: tags.map((t) => t.toLowerCase()) } : {}),
      },
      include: vendorProductInclude,
    })
  })
  await audit(db, {
    actor: user,
    action: "product.updated",
    entityType: "Product",
    entityId: id,
    ip: clientIp(c),
  })
  return ok(c, toVendorProduct(updated))
})

vendorRoutes.post("/products/:id/status", async (c) => {
  const { user, vendor } = await ownVendor(c, { approved: true })
  const { id } = params(c, idParam)
  const { status } = await jsonBody(c, vendorProductStatusInput)
  const db = c.get("db")
  const current = await ownProduct(c, vendor.id, id)

  const allowed: Record<ProductStatus, readonly ProductStatus[]> = {
    DRAFT: ["PENDING_REVIEW", "ARCHIVED"],
    REJECTED: ["PENDING_REVIEW", "DRAFT", "ARCHIVED"],
    PENDING_REVIEW: ["DRAFT", "ARCHIVED"],
    PUBLISHED: ["ARCHIVED"],
    OUT_OF_STOCK: ["ARCHIVED"],
    ARCHIVED: ["DRAFT"],
  }
  if (!allowed[current.status].includes(status)) {
    throw conflict(
      `A ${current.status.toLowerCase().replace("_", " ")} product cannot move to ${status.toLowerCase().replace("_", " ")}`
    )
  }
  if (status === "PENDING_REVIEW" && current.images.length === 0) {
    throw validation("Add at least one image before submitting for review", [{ path: "images", message: "Required" }])
  }
  const updated = await db.product.update({
    where: { id },
    data: {
      status,
      ...(status === "PENDING_REVIEW" ? { rejectionReason: null } : {}),
    },
    include: vendorProductInclude,
  })
  if (status === "PENDING_REVIEW") {
    await notifyBackOffice(db, {
      type: "PRODUCT",
      title: "Product submitted for review",
      body: `${updated.title} — ${vendor.businessName}`,
      data: { productId: id },
    })
  }
  await audit(db, {
    actor: user,
    action: "product.status_changed",
    entityType: "Product",
    entityId: id,
    metadata: { from: current.status, to: status },
    ip: clientIp(c),
  })
  return ok(c, toVendorProduct(updated))
})

vendorRoutes.delete("/products/:id", async (c) => {
  const { user, vendor } = await ownVendor(c, { approved: false })
  const { id } = params(c, idParam)
  await ownProduct(c, vendor.id, id)
  const db = c.get("db")
  // Soft delete: order history keeps its snapshots, and the row stays for audit.
  await db.product.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  })
  await audit(db, {
    actor: user,
    action: "product.deleted",
    entityType: "Product",
    entityId: id,
    ip: clientIp(c),
  })
  return ok(c, { deleted: true })
})

/* ---------------------- product images & documents --------------------- */

vendorRoutes.post("/products/:id/images", async (c) => {
  const { vendor } = await ownVendor(c, { approved: true, draft: true })
  const { id } = params(c, idParam)
  const input = await jsonBody(c, productImageInput)
  const product = await ownProduct(c, vendor.id, id)
  if (product.images.length >= 12) throw conflict("A product can have at most 12 images")
  const image = await c.get("db").productImage.create({
    data: {
      productId: id,
      url: input.url,
      alt: input.alt ?? null,
      position: product.images.length,
      isPrimary: product.images.length === 0,
    },
  })
  return ok(c, image, 201)
})

vendorRoutes.put("/products/:id/images/order", async (c) => {
  const { vendor } = await ownVendor(c, { approved: true, draft: true })
  const { id } = params(c, idParam)
  const input = await jsonBody(c, reorderImagesInput)
  const product = await ownProduct(c, vendor.id, id)
  const existing = new Set(product.images.map((i) => i.id))
  if (input.imageIds.length !== existing.size || !input.imageIds.every((i) => existing.has(i))) {
    throw validation("imageIds must list every image of this product exactly once")
  }
  const primary = input.primaryImageId ?? input.imageIds[0]
  if (!primary || !existing.has(primary)) throw validation("primaryImageId must be one of this product's images")
  await c.get("db").$transaction(
    input.imageIds.map((imageId, position) =>
      c.get("db").productImage.update({
        where: { id: imageId },
        data: { position, isPrimary: imageId === primary },
      })
    )
  )
  return ok(c, toVendorProduct(await ownProduct(c, vendor.id, id)))
})

vendorRoutes.delete("/products/:id/images/:imageId", async (c) => {
  const { vendor } = await ownVendor(c, { approved: true, draft: true })
  const { id, imageId } = params(c, z.object({ id: idParam.shape.id, imageId: idParam.shape.id }))
  const product = await ownProduct(c, vendor.id, id)
  const target = product.images.find((i) => i.id === imageId)
  if (!target) throw notFound("Image")
  const db = c.get("db")
  await db.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: imageId } })
    if (target.isPrimary) {
      const next = product.images.find((i) => i.id !== imageId)
      if (next)
        await tx.productImage.update({
          where: { id: next.id },
          data: { isPrimary: true },
        })
    }
  })
  return ok(c, { deleted: true })
})

vendorRoutes.post("/products/:id/documents", async (c) => {
  const { vendor } = await ownVendor(c, { approved: true, draft: true })
  const { id } = params(c, idParam)
  const input = await jsonBody(c, productDocumentInput)
  await ownProduct(c, vendor.id, id)
  return ok(c, await c.get("db").productDocument.create({ data: { productId: id, ...input } }), 201)
})

vendorRoutes.delete("/products/:id/documents/:docId", async (c) => {
  const { vendor } = await ownVendor(c, { approved: true, draft: true })
  const { id, docId } = params(c, z.object({ id: idParam.shape.id, docId: idParam.shape.id }))
  await ownProduct(c, vendor.id, id)
  const r = await c.get("db").productDocument.deleteMany({ where: { id: docId, productId: id } })
  if (r.count === 0) throw notFound("Document")
  return ok(c, { deleted: true })
})

/* -------------------------------- orders -------------------------------- */

/** A vendor sees only their own line items — never other vendors' lines or the buyer's contact details. */
vendorRoutes.get("/orders", async (c) => {
  const { vendor } = await ownVendor(c, { approved: false })
  const q = query(
    c,
    pageQuery.extend({
      status: z
        .enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"])
        .optional(),
    })
  )
  const db = c.get("db")
  const where: Prisma.OrderItemWhereInput = {
    vendorId: vendor.id,
    ...(q.status ? { status: q.status } : {}),
  }
  const [total, rows] = await Promise.all([
    db.orderItem.count({ where }),
    db.orderItem.findMany({
      where,
      orderBy: { order: { placedAt: "desc" } },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            placedAt: true,
            shippingAddress: true,
            notes: true,
          },
        },
      },
      ...skipTake(q),
    }),
  ])
  return page(
    c,
    rows.map((i) => ({
      id: i.id,
      title: i.title,
      unit: i.unit,
      unitPrice: num(i.unitPrice),
      quantity: i.quantity,
      lineTotal: num(i.lineTotal),
      status: i.status,
      trackingNumber: i.trackingNumber,
      order: i.order,
    })),
    pageMeta(total, q.page, q.pageSize)
  )
})

vendorRoutes.patch("/orders/items/:id", async (c) => {
  const { user, vendor } = await ownVendor(c, { approved: false })
  const { id } = params(c, idParam)
  const input = await jsonBody(c, vendorFulfilmentInput)
  const db = c.get("db")

  const result = await db.$transaction(async (tx) => {
    const item = await tx.orderItem.findFirst({
      where: { id, vendorId: vendor.id },
      include: { order: true },
    })
    if (!item) throw notFound("Order item")
    if (!canTransition(item.status, input.status)) {
      throw conflict(`Cannot move an item from ${item.status} to ${input.status}`)
    }
    if (input.status === "CANCELLED") await restoreStock(tx, [item])

    await tx.orderItem.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.trackingNumber ? { trackingNumber: input.trackingNumber } : {}),
      },
    })
    const siblings = await tx.orderItem.findMany({
      where: { orderId: item.orderId },
      select: { status: true },
    })
    const orderStatus = deriveOrderStatus(siblings.map((s) => s.status))
    await tx.order.update({
      where: { id: item.orderId },
      data: { status: orderStatus },
    })
    if (orderStatus === "DELIVERED") {
      await tx.payment.updateMany({
        where: { orderId: item.orderId, method: "COD", status: "PENDING" },
        data: { status: "PAID", paidAt: new Date() },
      })
    }
    await tx.notification.create({
      data: {
        userId: item.order.buyerId,
        type: "ORDER",
        title: `Order ${item.order.orderNumber} updated`,
        body: `${item.title} is now ${input.status.toLowerCase()}.`,
        data: { orderId: item.orderId },
      },
    })
    await audit(tx, {
      actor: user,
      action: "order_item.status_changed",
      entityType: "OrderItem",
      entityId: id,
      metadata: { from: item.status, to: input.status },
      ip: clientIp(c),
    })
    return { itemStatus: input.status, orderStatus }
  })
  return ok(c, result)
})
