import { PRODUCT_CONDITIONS, DEAL_TYPES, MATERIAL_UNITS } from "@workspace/types"
import type { DealType, MaterialUnit, ProductCondition } from "@workspace/types"

import type { ProductQuery } from "./api/public"

export type SearchParams = Record<string, string | string[] | undefined>

export const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "discount", label: "Biggest Savings" },
  { key: "popular", label: "Most Wishlisted" },
] as const
export type SortKey = (typeof SORT_OPTIONS)[number]["key"]

export const PAGE_SIZE = 12

/** Every catalogue filter lives in the URL, so results are shareable and rendered on the server. */
export interface CatalogueFilters {
  q: string
  category: string | undefined
  conditions: ProductCondition[]
  dealType: DealType | undefined
  unit: MaterialUnit | undefined
  city: string | undefined
  minPrice: number | undefined
  maxPrice: number | undefined
  sort: SortKey
  page: number
}

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v)

function num(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

export function parseFilters(sp: SearchParams): CatalogueFilters {
  const sort = first(sp.sort)
  const dealType = first(sp.dealType)
  const unit = first(sp.unit)
  const page = Number(first(sp.page))
  return {
    q: first(sp.q)?.trim() ?? "",
    category: first(sp.category) || undefined,
    conditions: (first(sp.condition)?.split(",") ?? []).filter((c): c is ProductCondition =>
      (PRODUCT_CONDITIONS as readonly string[]).includes(c)
    ),
    dealType: (DEAL_TYPES as readonly string[]).includes(dealType ?? "") ? (dealType as DealType) : undefined,
    unit: (MATERIAL_UNITS as readonly string[]).includes(unit ?? "") ? (unit as MaterialUnit) : undefined,
    city: first(sp.city) || undefined,
    minPrice: num(first(sp.minPrice)),
    maxPrice: num(first(sp.maxPrice)),
    sort: SORT_OPTIONS.some((o) => o.key === sort) ? (sort as SortKey) : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

/** Filters → API query. `preset` locks a facet (e.g. the category page pins its category). */
export function toApiQuery(f: CatalogueFilters, preset: Partial<ProductQuery> = {}): ProductQuery {
  return {
    q: f.q || undefined,
    category: f.category,
    condition: f.conditions.length ? f.conditions : undefined,
    dealType: f.dealType,
    unit: f.unit,
    city: f.city,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    sort: f.sort,
    page: f.page,
    pageSize: PAGE_SIZE,
    ...preset,
  }
}

export function activeFilterCount(f: CatalogueFilters, locked: string[] = []): number {
  return (
    (f.category && !locked.includes("category") ? 1 : 0) +
    f.conditions.length +
    (f.dealType ? 1 : 0) +
    (f.unit ? 1 : 0) +
    (f.city && !locked.includes("city") ? 1 : 0) +
    (f.minPrice !== undefined || f.maxPrice !== undefined ? 1 : 0)
  )
}

export function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
