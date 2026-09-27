import type { CategoryDto, LocationDto, PageMeta, ProductCardDto } from "@workspace/types"

import { listCategories, listLocations, listProducts, safely, type ProductQuery } from "./api/public"
import { parseFilters, toApiQuery, type CatalogueFilters, type SearchParams } from "./catalogue-filters"

export interface CatalogueData {
  filters: CatalogueFilters
  products: ProductCardDto[]
  meta: PageMeta
  categories: CategoryDto[]
  locations: LocationDto[]
}

const emptyMeta: PageMeta = { page: 1, pageSize: 12, total: 0, totalPages: 1 }

/** Shared loader for every catalogue-style page: parses the URL, then lets the API filter, sort and page. */
export async function loadCatalogue(
  searchParams: SearchParams,
  preset: Partial<ProductQuery> = {}
): Promise<CatalogueData> {
  const filters = parseFilters(searchParams)
  const [result, categories, locations] = await Promise.all([
    safely(() => listProducts(toApiQuery(filters, preset)), {
      data: [] as ProductCardDto[],
      meta: emptyMeta as PageMeta | undefined,
    }),
    safely(listCategories, []),
    safely(listLocations, []),
  ])
  return {
    filters,
    products: result.data,
    meta: result.meta ?? emptyMeta,
    categories,
    locations,
  }
}
