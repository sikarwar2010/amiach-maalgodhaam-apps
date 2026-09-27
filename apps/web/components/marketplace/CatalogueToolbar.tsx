"use client"

import { useState } from "react"
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react"
import type { CategoryDto, LocationDto } from "@workspace/types"

import { SORT_OPTIONS, type CatalogueFilters } from "@/lib/catalogue-filters"

import { MobileFilterSheet } from "./MobileFilterSheet"
import { useFilterNav } from "./useFilterNav"

export function CatalogueToolbar({
  filters,
  categories,
  locations,
  resultCount,
  locked = [],
}: {
  filters: CatalogueFilters
  categories: CategoryDto[]
  locations: LocationDto[]
  resultCount: number
  locked?: string[]
}) {
  const { setParam, pending } = useFilterNav()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Keyed by the applied query so the box resets when filters are cleared or navigated. */}
        <SearchBox key={filters.q} initial={filters.q} onSubmit={(q) => setParam("q", q || undefined)} />

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 lg:hidden"
        >
          <SlidersHorizontal size={16} /> Filters
        </button>

        <div className="relative shrink-0">
          <label className="sr-only" htmlFor="catalogue-sort">
            Sort results
          </label>
          <select
            id="catalogue-sort"
            value={filters.sort}
            onChange={(e) => setParam("sort", e.target.value === "newest" ? undefined : e.target.value)}
            className="h-full w-full appearance-none rounded-2xl border border-ink-200 bg-white py-3 pr-9 pl-4 text-sm font-medium text-ink-700 focus:border-brand-400 focus:outline-none sm:w-auto"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-400"
          />
        </div>
        <span aria-live="polite" className="sr-only">
          {pending ? "Updating results" : `${resultCount} results`}
        </span>
      </div>

      <MobileFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        categories={categories}
        locations={locations}
        resultCount={resultCount}
        locked={locked}
      />
    </>
  )
}

function SearchBox({ initial, onSubmit }: { initial: string; onSubmit: (query: string) => void }) {
  const [query, setQuery] = useState(initial)
  return (
    <form
      role="search"
      className="flex-1"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(query.trim())
      }}
    >
      <label className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-3">
        <Search size={17} className="shrink-0 text-ink-400" />
        <span className="sr-only">Search this marketplace</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search this marketplace..."
          className="w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
      </label>
    </form>
  )
}
