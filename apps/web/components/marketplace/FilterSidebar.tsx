"use client"

import { SlidersHorizontal, X } from "lucide-react"
import type { CategoryDto, LocationDto } from "@workspace/types"

import { activeFilterCount, type CatalogueFilters } from "@/lib/catalogue-filters"

import { FilterPanel } from "./FilterPanel"
import { useFilterNav } from "./useFilterNav"

export function FilterSidebar({
  filters,
  categories,
  locations,
  locked = [],
}: {
  filters: CatalogueFilters
  categories: CategoryDto[]
  locations: LocationDto[]
  locked?: string[]
}) {
  const { clearAll } = useFilterNav()
  const count = activeFilterCount(filters, locked)

  return (
    <aside className="hidden w-72 shrink-0 lg:block" aria-label="Filters">
      <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-3xl border border-ink-100 bg-white p-5 shadow-soft-sm">
        <div className="flex items-center justify-between pb-4">
          <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <SlidersHorizontal size={16} /> Filters
          </span>
          {count > 0 && (
            <button
              onClick={() => clearAll()}
              className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>
        <FilterPanel filters={filters} categories={categories} locations={locations} locked={locked} />
      </div>
    </aside>
  )
}
