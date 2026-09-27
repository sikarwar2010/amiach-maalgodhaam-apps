"use client"

import { useState } from "react"
import { MapPin, Search, Tag } from "lucide-react"
import type { CategoryDto, LocationDto } from "@workspace/types"

import { SmartSearch } from "./SmartSearch"

export function HomeSearchBar({ categories, locations }: { categories: CategoryDto[]; locations: LocationDto[] }) {
  const [open, setOpen] = useState(false)

  return (
    <section className="py-10 sm:py-14">
      <div className="container-page">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-3xl border border-ink-200 bg-white px-5 py-5 text-left shadow-soft-sm transition-shadow hover:shadow-soft sm:px-7 sm:py-6"
        >
          <Search size={22} className="shrink-0 text-brand-700" />
          <span className="flex-1 text-base text-ink-400 sm:text-lg">
            What are you looking for? Try &ldquo;marble tiles&rdquo;, &ldquo;commercial furniture&rdquo;,
            &ldquo;sanitaryware&rdquo;...
          </span>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-ink-50 px-3 py-2 text-xs font-medium text-ink-500 sm:flex">
            <Tag size={13} /> Category
          </span>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-ink-50 px-3 py-2 text-xs font-medium text-ink-500 sm:flex">
            <MapPin size={13} /> Location
          </span>
          <span className="hidden shrink-0 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white sm:inline-flex">
            Search
          </span>
        </button>
      </div>

      <SmartSearch open={open} onClose={() => setOpen(false)} categories={categories} locations={locations} />
    </section>
  )
}
