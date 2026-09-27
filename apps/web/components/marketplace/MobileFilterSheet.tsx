"use client"

import { useEffect } from "react"
import { SlidersHorizontal, X } from "lucide-react"
import type { CategoryDto, LocationDto } from "@workspace/types"

import { Button } from "@/components/ui/Button"
import { activeFilterCount, type CatalogueFilters } from "@/lib/catalogue-filters"

import { FilterPanel } from "./FilterPanel"
import { useFilterNav } from "./useFilterNav"

export function MobileFilterSheet({
  open,
  onClose,
  filters,
  categories,
  locations,
  resultCount,
  locked = [],
}: {
  open: boolean
  onClose: () => void
  filters: CatalogueFilters
  categories: CategoryDto[]
  locations: LocationDto[]
  resultCount: number
  locked?: string[]
}) {
  const { clearAll } = useFilterNav()

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null
  const count = activeFilterCount(filters, locked)

  return (
    <div className="fixed inset-0 z-[95] flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <button
        aria-label="Close filters"
        onClick={onClose}
        className="fixed inset-0 animate-fade-in bg-ink-950/60 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[85vh] w-full animate-fade-up flex-col rounded-t-4xl bg-white shadow-soft-xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <span className="flex items-center gap-2 text-base font-bold text-ink-900">
            <SlidersHorizontal size={17} /> Filters
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-2">
          <FilterPanel filters={filters} categories={categories} locations={locations} locked={locked} />
        </div>
        <div className="flex items-center gap-2.5 border-t border-ink-100 px-5 py-4">
          {count > 0 && (
            <button onClick={() => clearAll()} className="shrink-0 text-sm font-semibold text-ink-500">
              Clear all
            </button>
          )}
          <Button onClick={onClose} className="w-full">
            Show {resultCount} Results
          </Button>
        </div>
      </div>
    </div>
  )
}
