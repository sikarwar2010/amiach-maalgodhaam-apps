import type { Prisma } from "@workspace/db"
import { PRODUCT_CONDITIONS, type ProductCondition } from "@workspace/types"
import { pageQuery, productListQuery, searchQuery, slugParam, type ProductListQuery } from "@workspace/validators"
import { Hono } from "hono"
import { z } from "zod"

import type { AppEnv } from "../context"
import { notFound } from "../lib/errors"
import { ok, page, pageMeta, params, query, skipTake } from "../lib/http"
import {
  productCardInclude,
  productDetailInclude,
  publiclyVisible,
  toProductCard,
  toProductDetail,
} from "../lib/product-dto"

export const catalogRoutes = new Hono<AppEnv>()

/* ----------------------------- categories ----------------------------- */

catalogRoutes.get("/categories", async (c) => {
  const db = c.get("db")
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      subCategories: {
        orderBy: { name: "asc" },
        select: { id: true, slug: true, name: true },
      },
      _count: { select: { products: { where: publiclyVisible } } },
    },
  })
  return ok(
    c,
    categories.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      imageUrl: cat.imageUrl,
      productCount: cat._count.products,
      subCategories: cat.subCategories,
    }))
  )
})

catalogRoutes.get("/categories/:slug", async (c) => {
  const { slug } = params(c, slugParam)
  const cat = await c.get("db").category.findFirst({
    where: { slug, isActive: true },
    include: {
      subCategories: {
        orderBy: { name: "asc" },
        select: { id: true, slug: true, name: true },
      },
      _count: { select: { products: { where: publiclyVisible } } },
    },
  })
  if (!cat) throw notFound("Category")
  return ok(c, {
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    description: cat.description,
    imageUrl: cat.imageUrl,
    productCount: cat._count.products,
    subCategories: cat.subCategories,
  })
})

/* ------------------------------ products ------------------------------ */

function buildProductWhere(q: ProductListQuery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [publiclyVisible]

  if (q.q) {
    and.push({
      OR: [
        { title: { contains: q.q, mode: "insensitive" } },
        { brand: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
        { tags: { has: q.q.toLowerCase() } },
        { category: { name: { contains: q.q, mode: "insensitive" } } },
      ],
    })
  }
  if (q.category) and.push({ category: { slug: q.category } })
  if (q.subCategory) and.push({ subCategory: { slug: q.subCategory } })
  if (q.vendor) and.push({ vendor: { slug: q.vendor } })
  if (q.condition?.length) {
    const conditions = q.condition.filter((v): v is ProductCondition =>
      (PRODUCT_CONDITIONS as readonly string[]).includes(v)
    )
    if (conditions.length) and.push({ condition: { in: conditions } })
  }
  if (q.dealType) and.push({ dealType: q.dealType })
  if (q.unit) and.push({ unit: q.unit })
  if (q.city) and.push({ city: { equals: q.city, mode: "insensitive" } })
  if (q.state) and.push({ state: { equals: q.state, mode: "insensitive" } })
  if (q.minPrice !== undefined) and.push({ price: { gte: q.minPrice } })
  if (q.maxPrice !== undefined) and.push({ price: { lte: q.maxPrice } })
  if (q.inStock === true) {
    and.push({
      status: "PUBLISHED",
      inventory: { is: { quantity: { gt: 0 } } },
    })
  }
  return { AND: and }
}

function buildProductOrder(sort: ProductListQuery["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { id: "asc" }]
    case "price_desc":
      return [{ price: "desc" }, { id: "asc" }]
    case "popular":
      return [{ wishlistItems: { _count: "desc" } }, { publishedAt: "desc" }, { id: "asc" }]
    case "discount":
      // Ordering by a computed percentage isn't expressible in Prisma; the highest-value stock first is
      // a stable proxy, and the exact discount is still returned per item.
      return [{ marketValue: "desc" }, { publishedAt: "desc" }, { id: "asc" }]
    case "newest":
    default:
      return [{ publishedAt: "desc" }, { id: "asc" }]
  }
}

catalogRoutes.get("/products", async (c) => {
  const q = query(c, productListQuery)
  const db = c.get("db")
  const where = buildProductWhere(q)
  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: buildProductOrder(q.sort),
      include: productCardInclude,
      ...skipTake(q),
    }),
  ])
  return page(c, rows.map(toProductCard), pageMeta(total, q.page, q.pageSize))
})

catalogRoutes.get("/products/featured", async (c) => {
  const rows = await c.get("db").product.findMany({
    where: { ...publiclyVisible, featured: true },
    orderBy: { publishedAt: "desc" },
    take: 12,
    include: productCardInclude,
  })
  return ok(c, rows.map(toProductCard))
})

catalogRoutes.get("/products/:slug", async (c) => {
  const { slug } = params(c, slugParam)
  const row = await c.get("db").product.findFirst({
    where: { slug, ...publiclyVisible },
    include: productDetailInclude,
  })
  if (!row) throw notFound("Product")
  return ok(c, toProductDetail(row))
})

catalogRoutes.get("/products/:slug/similar", async (c) => {
  const { slug } = params(c, slugParam)
  const db = c.get("db")
  const base = await db.product.findFirst({
    where: { slug, ...publiclyVisible },
    select: { id: true, categoryId: true },
  })
  if (!base) throw notFound("Product")
  const rows = await db.product.findMany({
    where: {
      ...publiclyVisible,
      categoryId: base.categoryId,
      id: { not: base.id },
    },
    orderBy: { publishedAt: "desc" },
    take: 8,
    include: productCardInclude,
  })
  return ok(c, rows.map(toProductCard))
})

/* ------------------------------- vendors ------------------------------ */

const publicVendorSelect = {
  id: true,
  slug: true,
  businessName: true,
  description: true,
  logoUrl: true,
  city: true,
  state: true,
  categories: true,
  verifiedAt: true,
  createdAt: true,
} as const satisfies Prisma.VendorSelect

catalogRoutes.get("/vendors", async (c) => {
  const q = query(c, pageQuery.extend({ q: z.string().trim().max(120).optional() }))
  const db = c.get("db")
  const where: Prisma.VendorWhereInput = {
    status: "APPROVED",
    ...(q.q ? { businessName: { contains: q.q, mode: "insensitive" } } : {}),
  }
  const [total, rows] = await Promise.all([
    db.vendor.count({ where }),
    db.vendor.findMany({
      where,
      orderBy: [{ verifiedAt: "desc" }, { businessName: "asc" }],
      select: {
        ...publicVendorSelect,
        _count: {
          select: {
            products: { where: { deletedAt: null, status: "PUBLISHED" } },
          },
        },
      },
      ...skipTake(q),
    }),
  ])
  return page(
    c,
    rows.map(({ _count, ...v }) => ({
      ...v,
      activeListings: _count.products,
      verified: true,
    })),
    pageMeta(total, q.page, q.pageSize)
  )
})

/** Public vendor profile. Deliberately excludes GSTIN, PAN, phone, email and documents. */
catalogRoutes.get("/vendors/:slug", async (c) => {
  const { slug } = params(c, slugParam)
  const row = await c.get("db").vendor.findFirst({
    where: { slug, status: "APPROVED" },
    select: {
      ...publicVendorSelect,
      _count: {
        select: {
          products: { where: { deletedAt: null, status: "PUBLISHED" } },
        },
      },
    },
  })
  if (!row) throw notFound("Vendor")
  const { _count, ...vendor } = row
  return ok(c, { ...vendor, activeListings: _count.products, verified: true })
})

/* ------------------------- search & discovery ------------------------- */

catalogRoutes.get("/search", async (c) => {
  const { q, limit } = query(c, searchQuery)
  const db = c.get("db")
  const [products, categories, vendors] = await Promise.all([
    db.product.findMany({
      where: {
        ...publiclyVisible,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { tags: { has: q.toLowerCase() } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      include: productCardInclude,
    }),
    db.category.findMany({
      where: { isActive: true, name: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, slug: true, name: true },
    }),
    db.vendor.findMany({
      where: {
        status: "APPROVED",
        businessName: { contains: q, mode: "insensitive" },
      },
      take: 5,
      select: { id: true, slug: true, businessName: true },
    }),
  ])
  return ok(c, { products: products.map(toProductCard), categories, vendors })
})

catalogRoutes.get("/locations", async (c) => {
  const groups = await c.get("db").product.groupBy({
    by: ["city", "state"],
    where: publiclyVisible,
    _count: { _all: true },
    orderBy: { _count: { city: "desc" } },
    take: 50,
  })
  return ok(
    c,
    groups.map((g) => ({
      city: g.city,
      state: g.state,
      listingCount: g._count._all,
    }))
  )
})

catalogRoutes.get("/stats", async (c) => {
  const db = c.get("db")
  const [activeListings, verifiedSuppliers, categories, cities, inventory] = await Promise.all([
    db.product.count({ where: publiclyVisible }),
    db.vendor.count({ where: { status: "APPROVED" } }),
    db.category.count({ where: { isActive: true } }),
    db.product.groupBy({ by: ["city"], where: publiclyVisible }).then((g) => g.length),
    db.product.findMany({
      where: publiclyVisible,
      select: { price: true, inventory: { select: { quantity: true } } },
    }),
  ])
  const inventoryValue = inventory.reduce((sum, p) => sum + Number(p.price) * (p.inventory?.quantity ?? 0), 0)
  return ok(c, {
    activeListings,
    verifiedSuppliers,
    categories,
    cities,
    inventoryValue: Math.round(inventoryValue),
  })
})
