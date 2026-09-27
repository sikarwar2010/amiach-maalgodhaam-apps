import { canAssignRole } from "@workspace/auth"
import type { Prisma } from "@workspace/db"
import {
  adminProductDecisionInput,
  adminProductListQuery,
  adminSetRoleInput,
  adminSetUserStatusInput,
  adminUserListQuery,
  adminVendorDecisionInput,
  adminVendorListQuery,
  auditLogQuery,
  categoryInput,
  categoryUpdateInput,
  idParam,
  orderListQuery,
  pageQuery,
  subCategoryInput,
} from "@workspace/validators"
import { Hono } from "hono"
import { z } from "zod"

import type { AppEnv } from "../context"
import { audit } from "../lib/audit"
import { conflict, forbidden, notFound, validation } from "../lib/errors"
import { jsonBody, ok, page, pageMeta, params, query, skipTake } from "../lib/http"
import { clientIp } from "../lib/ip"
import { num } from "../lib/money"
import { currentUser, requireRole } from "../middleware/auth"
import { toOrderDto } from "./commerce"

export const adminRoutes = new Hono<AppEnv>()

// STAFF may look around and moderate listings; ADMIN (and SUPER_ADMIN) may change accounts and catalogue structure.
adminRoutes.use("*", requireRole("ADMIN", "STAFF"))
const adminOnly = requireRole("ADMIN")

/* ------------------------------ dashboard ------------------------------ */

adminRoutes.get("/dashboard", async (c) => {
  const db = c.get("db")
  const [users, vendors, products, orders, gmv, pendingInquiries] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.vendor.groupBy({ by: ["status"], _count: { _all: true } }),
    db.product.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    db.order.count(),
    db.order.aggregate({
      where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { total: true },
    }),
    db.b2BInquiry.count({ where: { status: { in: ["OPEN", "QUOTED"] } } }),
  ])
  return ok(c, {
    users: Object.fromEntries(users.map((g) => [g.role, g._count._all])),
    vendors: Object.fromEntries(vendors.map((g) => [g.status, g._count._all])),
    products: Object.fromEntries(products.map((g) => [g.status, g._count._all])),
    orders,
    grossOrderValue: num(gmv._sum.total),
    openInquiries: pendingInquiries,
  })
})

/* -------------------------------- users -------------------------------- */

adminRoutes.get("/users", async (c) => {
  const q = query(c, adminUserListQuery)
  const db = c.get("db")
  const where: Prisma.UserWhereInput = {
    ...(q.role ? { role: q.role } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.q
      ? {
          OR: [{ email: { contains: q.q, mode: "insensitive" } }, { name: { contains: q.q, mode: "insensitive" } }],
        }
      : {}),
  }
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        onboarded: true,
        createdAt: true,
      },
      ...skipTake(q),
    }),
  ])
  return page(c, rows, pageMeta(total, q.page, q.pageSize))
})

adminRoutes.patch("/users/:id/role", adminOnly, async (c) => {
  const actor = currentUser(c)
  const { id } = params(c, idParam)
  const { role } = await jsonBody(c, adminSetRoleInput)
  const db = c.get("db")

  if (id === actor.id) throw forbidden("You cannot change your own role")
  if (!canAssignRole(actor.role, role)) throw forbidden("You cannot grant that role")
  const target = await db.user.findUnique({ where: { id } })
  if (!target) throw notFound("User")
  // An ADMIN must not be able to demote or otherwise touch a peer/superior.
  if (!canAssignRole(actor.role, target.role)) throw forbidden("You cannot modify this user's role")

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    })
    await audit(tx, {
      actor,
      action: "user.role_changed",
      entityType: "User",
      entityId: id,
      metadata: { from: target.role, to: role },
      ip: clientIp(c),
    })
    return row
  })
  await c
    .get("identity")
    .syncMetadata(target.clerkId, { role, onboarded: target.onboarded })
    .catch(() => undefined)
  return ok(c, updated)
})

adminRoutes.patch("/users/:id/status", adminOnly, async (c) => {
  const actor = currentUser(c)
  const { id } = params(c, idParam)
  const { status } = await jsonBody(c, adminSetUserStatusInput)
  const db = c.get("db")
  if (id === actor.id) throw forbidden("You cannot change your own status")
  const target = await db.user.findUnique({ where: { id } })
  if (!target || target.status === "DELETED") throw notFound("User")
  if (!canAssignRole(actor.role, target.role)) throw forbidden("You cannot modify this user")

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, status: true },
    })
    await audit(tx, {
      actor,
      action: "user.status_changed",
      entityType: "User",
      entityId: id,
      metadata: { from: target.status, to: status },
      ip: clientIp(c),
    })
    return row
  })
  return ok(c, updated)
})

/* ------------------------------- vendors ------------------------------- */

adminRoutes.get("/vendors", async (c) => {
  const q = query(c, adminVendorListQuery)
  const db = c.get("db")
  const where: Prisma.VendorWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.q ? { businessName: { contains: q.q, mode: "insensitive" } } : {}),
  }
  const [total, rows] = await Promise.all([
    db.vendor.count({ where }),
    db.vendor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { products: true } } },
      ...skipTake(q),
    }),
  ])
  return page(
    c,
    rows.map(({ _count, ...v }) => ({ ...v, productCount: _count.products })),
    pageMeta(total, q.page, q.pageSize)
  )
})

adminRoutes.get("/vendors/:id", async (c) => {
  const { id } = params(c, idParam)
  const vendor = await c.get("db").vendor.findUnique({
    where: { id },
    include: {
      documents: true,
      user: { select: { id: true, email: true, name: true } },
    },
  })
  if (!vendor) throw notFound("Vendor")
  return ok(c, vendor)
})

adminRoutes.post("/vendors/:id/decision", adminOnly, async (c) => {
  const actor = currentUser(c)
  const { id } = params(c, idParam)
  const input = await jsonBody(c, adminVendorDecisionInput)
  const db = c.get("db")
  if (input.status === "REJECTED" && !input.reason) {
    throw validation("Please give a reason for rejection", [{ path: "reason", message: "Required" }])
  }
  const vendor = await db.vendor.findUnique({ where: { id } })
  if (!vendor) throw notFound("Vendor")
  if (vendor.status === input.status) throw conflict(`Vendor is already ${input.status.toLowerCase()}`)

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.vendor.update({
      where: { id },
      data: {
        status: input.status,
        rejectionReason: input.status === "APPROVED" ? null : (input.reason ?? null),
        verifiedAt: input.status === "APPROVED" ? new Date() : vendor.verifiedAt,
      },
    })
    if (input.status === "SUSPENDED") {
      // A suspended vendor's listings must leave the public catalogue immediately.
      await tx.product.updateMany({
        where: { vendorId: id, status: { in: ["PUBLISHED", "OUT_OF_STOCK"] } },
        data: { status: "ARCHIVED" },
      })
    }
    await tx.notification.create({
      data: {
        userId: vendor.userId,
        type: "VENDOR",
        title: `Your vendor account was ${input.status.toLowerCase()}`,
        body: input.reason ?? null,
      },
    })
    await audit(tx, {
      actor,
      action: "vendor.decision",
      entityType: "Vendor",
      entityId: id,
      metadata: {
        from: vendor.status,
        to: input.status,
        reason: input.reason ?? null,
      },
      ip: clientIp(c),
    })
    return row
  })
  return ok(c, updated)
})

/* ------------------------------- products ------------------------------ */

adminRoutes.get("/products", async (c) => {
  const q = query(c, adminProductListQuery)
  const db = c.get("db")
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(q.status ? { status: q.status } : {}),
    ...(q.vendorId ? { vendorId: q.vendorId } : {}),
    ...(q.q ? { title: { contains: q.q, mode: "insensitive" } } : {}),
  }
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        price: true,
        unit: true,
        condition: true,
        updatedAt: true,
        vendor: { select: { id: true, businessName: true, status: true } },
        category: { select: { id: true, name: true } },
        inventory: { select: { quantity: true } },
      },
      ...skipTake(q),
    }),
  ])
  return page(
    c,
    rows.map((p) => ({
      ...p,
      price: num(p.price),
      quantity: p.inventory?.quantity ?? 0,
    })),
    pageMeta(total, q.page, q.pageSize)
  )
})

adminRoutes.post("/products/:id/decision", async (c) => {
  const actor = currentUser(c)
  const { id } = params(c, idParam)
  const input = await jsonBody(c, adminProductDecisionInput)
  const db = c.get("db")

  if (input.status === "REJECTED" && !input.reason) {
    throw validation("Please give a reason for rejection", [{ path: "reason", message: "Required" }])
  }
  const product = await db.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      vendor: { select: { userId: true, status: true } },
      inventory: { select: { quantity: true } },
    },
  })
  if (!product) throw notFound("Product")
  if ((input.status === "PUBLISHED" || input.status === "REJECTED") && product.status !== "PENDING_REVIEW") {
    throw conflict("Only products pending review can be approved or rejected")
  }
  if (input.status === "PUBLISHED" && product.vendor.status !== "APPROVED") {
    throw conflict("The vendor is not approved, so this product cannot be published")
  }

  const finalStatus =
    input.status === "PUBLISHED" && (product.inventory?.quantity ?? 0) === 0 ? "OUT_OF_STOCK" : input.status
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.product.update({
      where: { id },
      data: {
        status: finalStatus,
        rejectionReason: input.status === "REJECTED" ? (input.reason ?? null) : null,
        ...(input.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      },
      select: { id: true, slug: true, title: true, status: true },
    })
    await tx.notification.create({
      data: {
        userId: product.vendor.userId,
        type: "PRODUCT",
        title: `"${product.title}" was ${input.status.toLowerCase()}`,
        body: input.reason ?? null,
        data: { productId: id },
      },
    })
    await audit(tx, {
      actor,
      action: "product.decision",
      entityType: "Product",
      entityId: id,
      metadata: {
        from: product.status,
        to: finalStatus,
        reason: input.reason ?? null,
      },
      ip: clientIp(c),
    })
    return row
  })
  return ok(c, updated)
})

/* ------------------------------ categories ----------------------------- */

adminRoutes.get("/categories", async (c) => {
  const rows = await c.get("db").category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      subCategories: { orderBy: { name: "asc" } },
      _count: { select: { products: true } },
    },
  })
  return ok(
    c,
    rows.map(({ _count, ...r }) => ({ ...r, productCount: _count.products }))
  )
})

adminRoutes.post("/categories", adminOnly, async (c) => {
  const actor = currentUser(c)
  const input = await jsonBody(c, categoryInput)
  const db = c.get("db")
  if (
    await db.category.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    })
  ) {
    throw conflict("A category with this slug already exists")
  }
  const created = await db.category.create({
    data: {
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  })
  await audit(db, {
    actor,
    action: "category.created",
    entityType: "Category",
    entityId: created.id,
    ip: clientIp(c),
  })
  return ok(c, created, 201)
})

adminRoutes.patch("/categories/:id", adminOnly, async (c) => {
  const actor = currentUser(c)
  const { id } = params(c, idParam)
  const input = await jsonBody(c, categoryUpdateInput)
  const db = c.get("db")
  const existing = await db.category.findUnique({ where: { id } })
  if (!existing) throw notFound("Category")
  if (
    input.slug &&
    input.slug !== existing.slug &&
    (await db.category.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    }))
  ) {
    throw conflict("A category with this slug already exists")
  }
  const updated = await db.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  })
  await audit(db, {
    actor,
    action: "category.updated",
    entityType: "Category",
    entityId: id,
    ip: clientIp(c),
  })
  return ok(c, updated)
})

adminRoutes.delete("/categories/:id", adminOnly, async (c) => {
  const actor = currentUser(c)
  const { id } = params(c, idParam)
  const db = c.get("db")
  const inUse = await db.product.count({ where: { categoryId: id } })
  if (inUse > 0) throw conflict("This category still has products. Deactivate it instead.")
  const r = await db.category.deleteMany({ where: { id } })
  if (r.count === 0) throw notFound("Category")
  await audit(db, {
    actor,
    action: "category.deleted",
    entityType: "Category",
    entityId: id,
    ip: clientIp(c),
  })
  return ok(c, { deleted: true })
})

adminRoutes.post("/categories/:id/subcategories", adminOnly, async (c) => {
  const { id } = params(c, idParam)
  const input = await jsonBody(c, subCategoryInput)
  const db = c.get("db")
  if (!(await db.category.findUnique({ where: { id }, select: { id: true } }))) throw notFound("Category")
  if (
    await db.subCategory.findUnique({
      where: { categoryId_slug: { categoryId: id, slug: input.slug } },
      select: { id: true },
    })
  ) {
    throw conflict("A sub-category with this slug already exists here")
  }
  return ok(
    c,
    await db.subCategory.create({
      data: { categoryId: id, slug: input.slug, name: input.name },
    }),
    201
  )
})

adminRoutes.delete("/categories/:id/subcategories/:subId", adminOnly, async (c) => {
  const { id, subId } = params(c, z.object({ id: idParam.shape.id, subId: idParam.shape.id }))
  const db = c.get("db")
  const inUse = await db.product.count({ where: { subCategoryId: subId } })
  if (inUse > 0) throw conflict("This sub-category still has products")
  const r = await db.subCategory.deleteMany({
    where: { id: subId, categoryId: id },
  })
  if (r.count === 0) throw notFound("Sub-category")
  return ok(c, { deleted: true })
})

/* --------------------------- orders & audit log -------------------------- */

adminRoutes.get("/orders", async (c) => {
  const q = query(c, orderListQuery)
  const db = c.get("db")
  const where: Prisma.OrderWhereInput = q.status ? { status: q.status } : {}
  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      include: { items: { orderBy: { title: "asc" } }, payments: true },
      ...skipTake(q),
    }),
  ])
  return page(c, rows.map(toOrderDto), pageMeta(total, q.page, q.pageSize))
})

adminRoutes.get("/audit-logs", async (c) => {
  const q = query(c, auditLogQuery)
  const db = c.get("db")
  const where: Prisma.AuditLogWhereInput = {
    ...(q.action ? { action: q.action } : {}),
    ...(q.entityType ? { entityType: q.entityType } : {}),
    ...(q.actorId ? { actorId: q.actorId } : {}),
  }
  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { id: true, email: true } } },
      ...skipTake(q),
    }),
  ])
  return page(c, rows, pageMeta(total, q.page, q.pageSize))
})

/* ----------------------------- contact inbox ----------------------------- */

adminRoutes.get("/contact-messages", async (c) => {
  const q = query(c, pageQuery)
  const db = c.get("db")
  const [total, rows] = await Promise.all([
    db.contactMessage.count(),
    db.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      ...skipTake(q),
    }),
  ])
  return page(c, rows, pageMeta(total, q.page, q.pageSize))
})

adminRoutes.post("/contact-messages/:id/handled", async (c) => {
  const { id } = params(c, idParam)
  const r = await c.get("db").contactMessage.updateMany({
    where: { id, handledAt: null },
    data: { handledAt: new Date() },
  })
  if (r.count === 0) throw notFound("Message")
  return ok(c, { handled: true })
})
