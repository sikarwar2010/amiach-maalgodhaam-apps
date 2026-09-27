import { z } from "zod"
import {
  DEAL_TYPES,
  LOGISTICS_METHODS,
  MATERIAL_UNITS,
  PRODUCT_CONDITIONS,
  PRODUCT_DOCUMENT_TYPES,
  PRODUCT_STATUSES,
} from "@workspace/types"

import { csvList, cuid, httpsUrl, longText, money, nameText, pageQuery, positiveInt, slug } from "./common"

export const productImageInput = z.object({
  url: httpsUrl,
  alt: z.string().trim().max(200).optional(),
})

export const bulkPriceTierInput = z.object({
  minQty: positiveInt,
  maxQty: positiveInt.optional(),
  unitPrice: money.positive(),
})

export const productDocumentInput = z.object({
  type: z.enum(PRODUCT_DOCUMENT_TYPES),
  name: nameText,
  url: httpsUrl,
})

// Field shapes WITHOUT defaults. Zod applies defaults even inside `.partial()`, which would silently reset
// untouched fields on every edit (images, tags, tiers…), so update schemas are built from this default-free shape
// and only the create schema layers the defaults on top.
const productShape = {
  title: z.string().trim().min(3).max(200),
  brand: nameText.optional(),
  description: longText.min(10),
  categoryId: cuid,
  subCategoryId: cuid.optional(),
  condition: z.enum(PRODUCT_CONDITIONS),
  dealType: z.enum(DEAL_TYPES),
  unit: z.enum(MATERIAL_UNITS),
  price: money.positive(),
  marketValue: money.positive().optional(),
  minOrderQty: positiveInt,
  quantity: z.number().int().min(0).max(100_000_000),
  city: nameText,
  state: nameText,
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .optional(),
  logisticsMethods: z.array(z.enum(LOGISTICS_METHODS)).max(4),
  conditionNotes: longText.optional(),
  specifications: z.array(z.object({ label: nameText, value: z.string().trim().min(1).max(500) })).max(40),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  images: z.array(productImageInput).max(12),
  bulkPrices: z.array(bulkPriceTierInput).max(10),
}

const productBase = z.object(productShape).extend({
  dealType: productShape.dealType.default("BUY_NOW"),
  minOrderQty: productShape.minOrderQty.default(1),
  logisticsMethods: productShape.logisticsMethods.default([]),
  specifications: productShape.specifications.default([]),
  tags: productShape.tags.default([]),
  images: productShape.images.default([]),
  bulkPrices: productShape.bulkPrices.default([]),
})

export const createProductInput = productBase.superRefine((v, ctx) => {
  if (v.marketValue !== undefined && v.marketValue < v.price) {
    ctx.addIssue({
      code: "custom",
      path: ["marketValue"],
      message: "Market value should not be lower than the selling price",
    })
  }
  if (v.minOrderQty > v.quantity) {
    ctx.addIssue({
      code: "custom",
      path: ["minOrderQty"],
      message: "Minimum order quantity cannot exceed available quantity",
    })
  }
  const seen = new Set<number>()
  for (const [i, tier] of v.bulkPrices.entries()) {
    if (seen.has(tier.minQty)) {
      ctx.addIssue({
        code: "custom",
        path: ["bulkPrices", i, "minQty"],
        message: "Duplicate tier",
      })
    }
    seen.add(tier.minQty)
    if (tier.maxQty !== undefined && tier.maxQty < tier.minQty) {
      ctx.addIssue({
        code: "custom",
        path: ["bulkPrices", i, "maxQty"],
        message: "maxQty must be at least minQty",
      })
    }
  }
})
export type CreateProductInput = z.infer<typeof createProductInput>

/** Partial update: only the fields actually sent are present (no defaults are injected). */
export const updateProductInput = z.object(productShape).partial()
export type UpdateProductInput = z.infer<typeof updateProductInput>

/** Statuses a vendor may set directly. Publishing always goes through review. */
export const vendorProductStatusInput = z.object({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ARCHIVED"]),
})
export type VendorProductStatusInput = z.infer<typeof vendorProductStatusInput>

export const reorderImagesInput = z.object({
  imageIds: z.array(cuid).min(1).max(12),
  primaryImageId: cuid.optional(),
})

export const productSort = z.enum(["newest", "price_asc", "price_desc", "discount", "popular"])
export type ProductSort = z.infer<typeof productSort>

/** Public catalogue query — every filter is applied server-side. */
export const productListQuery = pageQuery.extend({
  q: z.string().trim().max(120).optional(),
  category: slug.optional(),
  subCategory: slug.optional(),
  vendor: slug.optional(),
  condition: csvList.optional(),
  dealType: z.enum(DEAL_TYPES).optional(),
  unit: z.enum(MATERIAL_UNITS).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  sort: productSort.default("newest"),
})
export type ProductListQuery = z.infer<typeof productListQuery>

export const vendorProductListQuery = pageQuery.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
})

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(20).default(8),
})

const categoryShape = {
  name: nameText,
  slug: slug,
  description: z.string().trim().max(500).optional(),
  imageUrl: httpsUrl.optional(),
  sortOrder: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
}
export const categoryInput = z.object(categoryShape).extend({
  sortOrder: categoryShape.sortOrder.default(0),
  isActive: categoryShape.isActive.default(true),
})
/** Partial update without injected defaults (renaming must not re-activate or re-order a category). */
export const categoryUpdateInput = z.object(categoryShape).partial()
export type CategoryInput = z.infer<typeof categoryInput>

export const subCategoryInput = z.object({
  name: nameText,
  slug: slug,
})
