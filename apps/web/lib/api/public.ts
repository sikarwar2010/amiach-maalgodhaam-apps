import type {
  CategoryDto,
  LocationDto,
  PlatformStatsDto,
  ProductCardDto,
  ProductDetailDto,
  PublicVendorDto,
  SearchResultDto,
} from "@workspace/types"

import { API_URL } from "../config"
import { ApiError, apiRequest, type ApiResult } from "./fetcher"

/** Public catalogue reads used by server components. No session is involved, so these are cacheable. */
const PUBLIC_TTL = 60

export interface ProductQuery {
  q?: string | undefined
  category?: string | undefined
  subCategory?: string | undefined
  vendor?: string | undefined
  condition?: string[] | undefined
  dealType?: string | undefined
  unit?: string | undefined
  city?: string | undefined
  state?: string | undefined
  minPrice?: number | undefined
  maxPrice?: number | undefined
  inStock?: boolean | undefined
  sort?: string | undefined
  page?: number | undefined
  pageSize?: number | undefined
}

export function listProducts(query: ProductQuery = {}): Promise<ApiResult<ProductCardDto[]>> {
  return apiRequest(API_URL, "/api/products", { query, revalidate: PUBLIC_TTL })
}

export async function getProduct(slug: string): Promise<ProductDetailDto | null> {
  try {
    return (
      await apiRequest<ProductDetailDto>(API_URL, `/api/products/${encodeURIComponent(slug)}`, {
        revalidate: PUBLIC_TTL,
      })
    ).data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function getSimilarProducts(slug: string): Promise<ProductCardDto[]> {
  return (
    await apiRequest<ProductCardDto[]>(API_URL, `/api/products/${encodeURIComponent(slug)}/similar`, {
      revalidate: PUBLIC_TTL,
    })
  ).data
}

export async function getFeaturedProducts(): Promise<ProductCardDto[]> {
  return (
    await apiRequest<ProductCardDto[]>(API_URL, "/api/products/featured", {
      revalidate: PUBLIC_TTL,
    })
  ).data
}

export async function listCategories(): Promise<CategoryDto[]> {
  return (
    await apiRequest<CategoryDto[]>(API_URL, "/api/categories", {
      revalidate: PUBLIC_TTL,
    })
  ).data
}

export async function getCategory(slug: string): Promise<CategoryDto | null> {
  try {
    return (
      await apiRequest<CategoryDto>(API_URL, `/api/categories/${encodeURIComponent(slug)}`, { revalidate: PUBLIC_TTL })
    ).data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export function listVendors(
  query: { q?: string; page?: number; pageSize?: number } = {}
): Promise<ApiResult<PublicVendorDto[]>> {
  return apiRequest(API_URL, "/api/vendors", { query, revalidate: PUBLIC_TTL })
}

export async function getVendor(slug: string): Promise<PublicVendorDto | null> {
  try {
    return (
      await apiRequest<PublicVendorDto>(API_URL, `/api/vendors/${encodeURIComponent(slug)}`, { revalidate: PUBLIC_TTL })
    ).data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function searchAll(q: string, limit = 8): Promise<SearchResultDto> {
  return (
    await apiRequest<SearchResultDto>(API_URL, "/api/search", {
      query: { q, limit },
    })
  ).data
}

export async function listLocations(): Promise<LocationDto[]> {
  return (
    await apiRequest<LocationDto[]>(API_URL, "/api/locations", {
      revalidate: PUBLIC_TTL,
    })
  ).data
}

export async function getPlatformStats(): Promise<PlatformStatsDto> {
  return (
    await apiRequest<PlatformStatsDto>(API_URL, "/api/stats", {
      revalidate: PUBLIC_TTL,
    })
  ).data
}

/** Runs a loader and returns `fallback` when the API is down, so a marketing page never hard-fails. */
export async function safely<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load()
  } catch (error) {
    console.error("[web] data load failed:", error instanceof Error ? error.message : "unknown error")
    return fallback
  }
}
