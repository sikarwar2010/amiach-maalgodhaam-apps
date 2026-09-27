import Link from "next/link"
import { LayoutGrid } from "lucide-react"
import type { CategoryDto, LocationDto, PageMeta, ProductCardDto } from "@workspace/types"

import { MaterialCard } from "@/components/cards/MaterialCard"
import type { CatalogueFilters } from "@/lib/catalogue-filters"

import { Breadcrumbs, type Crumb } from "@/components/layout/Breadcrumbs"
import { CatalogueToolbar } from "./CatalogueToolbar"
import { FilterSidebar } from "./FilterSidebar"
import { LocationChipRow } from "./LocationChipRow"
import { Pagination } from "./Pagination"

/**
 * Server-rendered catalogue view. Filtering, sorting and paging all happened in the API;
 * this only lays out what came back and wires the (client) controls to the URL.
 */
export function CatalogueContent({
  products,
  meta,
  filters,
  categories,
  locations,
  basePath,
  title = "Browse Materials",
  eyebrow = "Explore Materials",
  description,
  locked = [],
  showLocationChips = false,
  activeCity,
  crumbs,
}: {
  products: ProductCardDto[]
  meta: PageMeta
  filters: CatalogueFilters
  categories: CategoryDto[]
  locations: LocationDto[]
  basePath: string
  title?: string
  eyebrow?: string
  description?: string | undefined
  /** Facets fixed by the route itself, e.g. `["category"]` on a category page. */
  locked?: string[]
  showLocationChips?: boolean
  activeCity?: string | undefined
  crumbs?: Crumb[]
}) {
  const carried: Record<string, string | undefined> = {
    q: filters.q || undefined,
    category: locked.includes("category") ? undefined : filters.category,
    condition: filters.conditions.join(",") || undefined,
    dealType: filters.dealType,
    unit: filters.unit,
    city: locked.includes("city") ? undefined : filters.city,
    minPrice: filters.minPrice?.toString(),
    maxPrice: filters.maxPrice?.toString(),
    sort: filters.sort === "newest" ? undefined : filters.sort,
  }

  return (
    <main className="pt-28 sm:pt-32">
      <div className="container-page">
        {crumbs && <Breadcrumbs items={crumbs} />}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{eyebrow}</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
          <p className="text-sm text-ink-500">
            {description ?? `${meta.total} active ${meta.total === 1 ? "listing" : "listings"} matching your criteria`}
          </p>
        </div>

        {showLocationChips && (
          <div className="mt-5">
            <LocationChipRow locations={locations} activeCity={activeCity} />
          </div>
        )}

        <CatalogueToolbar
          filters={filters}
          categories={categories}
          locations={locations}
          resultCount={meta.total}
          locked={locked}
        />

        <div className="mt-6 flex gap-8 pb-20">
          <FilterSidebar filters={filters} categories={categories} locations={locations} locked={locked} />

          <div className="min-w-0 flex-1">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink-200 py-24 text-center">
                <LayoutGrid size={32} className="text-ink-300" />
                <h3 className="mt-4 text-lg font-bold text-ink-900">No listings match</h3>
                <p className="mt-1 max-w-sm text-sm text-ink-500">
                  Try adjusting or clearing your filters, or post a requirement and let our sourcing network help.
                </p>
                <Link
                  href="/post-requirement"
                  className="mt-5 rounded-xl bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
                >
                  Post a Requirement
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((listing) => (
                    <MaterialCard key={listing.id} listing={listing} />
                  ))}
                </div>
                <Pagination page={meta.page} totalPages={meta.totalPages} basePath={basePath} params={carried} />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
