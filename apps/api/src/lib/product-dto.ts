import type { Prisma } from "@workspace/db"
import type { ProductCardDto, ProductDetailDto } from "@workspace/types"

import { num, numOrNull } from "./money"

/** What every public product query must include so the DTO can be built without extra round trips. */
export const productCardInclude = {
  images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
  category: { select: { id: true, slug: true, name: true } },
  vendor: {
    select: {
      id: true,
      slug: true,
      businessName: true,
      status: true,
      city: true,
      state: true,
    },
  },
  inventory: { select: { quantity: true, reserved: true } },
} as const satisfies Prisma.ProductInclude

export const productDetailInclude = {
  ...productCardInclude,
  subCategory: { select: { id: true, slug: true, name: true } },
  bulkPrices: { orderBy: { minQty: "asc" } },
  documents: { select: { id: true, type: true, name: true, url: true } },
} as const satisfies Prisma.ProductInclude

export type ProductCardRow = Prisma.ProductGetPayload<{
  include: typeof productCardInclude
}>
export type ProductDetailRow = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude
}>

function parseSpecs(value: Prisma.JsonValue): { label: string; value: string }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (typeof entry === "object" && entry !== null && !Array.isArray(entry)) {
      const { label, value: v } = entry
      if (typeof label === "string" && typeof v === "string") return [{ label, value: v }]
    }
    return []
  })
}

export function availableQuantity(row: { inventory: { quantity: number; reserved: number } | null }): number {
  if (!row.inventory) return 0
  return Math.max(0, row.inventory.quantity - row.inventory.reserved)
}

export function discountPct(price: number, marketValue: number | null): number {
  if (!marketValue || marketValue <= price) return 0
  return Math.round(((marketValue - price) / marketValue) * 100)
}

export function toProductCard(row: ProductCardRow): ProductCardDto {
  const price = num(row.price)
  const marketValue = numOrNull(row.marketValue)
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    status: row.status,
    condition: row.condition,
    dealType: row.dealType,
    unit: row.unit,
    price,
    marketValue,
    discountPct: discountPct(price, marketValue),
    currency: row.currency,
    minOrderQty: row.minOrderQty,
    availableQuantity: availableQuantity(row),
    city: row.city,
    state: row.state,
    featured: row.featured,
    image: row.images[0]?.url ?? null,
    category: row.category,
    vendor: {
      id: row.vendor.id,
      slug: row.vendor.slug,
      businessName: row.vendor.businessName,
      verified: row.vendor.status === "APPROVED",
    },
    publishedAt: row.publishedAt?.toISOString() ?? null,
  }
}

export function toProductDetail(row: ProductDetailRow): ProductDetailDto {
  return {
    ...toProductCard(row),
    description: row.description,
    conditionNotes: row.conditionNotes,
    logisticsMethods: row.logisticsMethods,
    specifications: parseSpecs(row.specifications),
    tags: row.tags,
    pincode: row.pincode,
    subCategory: row.subCategory,
    images: row.images.map((i) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      isPrimary: i.isPrimary,
    })),
    bulkPrices: row.bulkPrices.map((b) => ({
      id: b.id,
      minQty: b.minQty,
      maxQty: b.maxQty,
      unitPrice: num(b.unitPrice),
    })),
    documents: row.documents,
    vendor: {
      id: row.vendor.id,
      slug: row.vendor.slug,
      businessName: row.vendor.businessName,
      verified: row.vendor.status === "APPROVED",
      city: row.vendor.city,
      state: row.vendor.state,
    },
  }
}

/** Public catalogue visibility: published (or sold-out) products from approved vendors only. */
export const publiclyVisible = {
  deletedAt: null,
  status: { in: ["PUBLISHED", "OUT_OF_STOCK"] },
  vendor: { status: "APPROVED" },
} as const satisfies Prisma.ProductWhereInput
