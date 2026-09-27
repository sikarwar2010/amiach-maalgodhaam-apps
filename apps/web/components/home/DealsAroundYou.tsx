"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight, MapPin } from "lucide-react"
import type { LocationDto, ProductCardDto } from "@workspace/types"

import { MaterialCard } from "@/components/cards/MaterialCard"
import { apiRequest } from "@/lib/api/fetcher"
import { slugifyCity } from "@/lib/catalogue-filters"
import { PUBLIC_API_URL } from "@/lib/config"
import { cn } from "@/lib/utils"

export function DealsAroundYou({
  locations,
  initialProducts,
}: {
  locations: LocationDto[]
  initialProducts: ProductCardDto[]
}) {
  const topLocations = [...locations].sort((a, b) => b.listingCount - a.listingCount).slice(0, 6)
  const [selected, setSelected] = useState<string | null>(null)
  const [shown, setShown] = useState(initialProducts)
  const [loading, setLoading] = useState(false)

  const select = async (city: string | null) => {
    setSelected(city)
    if (city === null) {
      setShown(initialProducts)
      return
    }
    setLoading(true)
    try {
      const { data } = await apiRequest<ProductCardDto[]>(PUBLIC_API_URL, "/api/products", {
        query: { city, pageSize: 4 },
      })
      setShown(data)
    } catch {
      setShown([])
    } finally {
      setLoading(false)
    }
  }

  const chip =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors"
  const on = "border-brand-700 bg-brand-800 text-white"
  const off = "border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50"

  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Deals Around You</h2>
            <p className="mt-2 max-w-xl text-ink-500">Discover surplus materials available near your location.</p>
          </div>
          <Link
            href="/deals"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:inline-flex"
          >
            View all deals <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="mt-6 no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => void select(null)} className={cn(chip, !selected ? on : off)}>
            <MapPin size={14} /> All Locations
          </button>
          {topLocations.map((loc) => (
            <button
              key={`${loc.city}-${loc.state}`}
              onClick={() => void select(loc.city)}
              className={cn(chip, selected === loc.city ? on : off)}
            >
              {loc.city}
            </button>
          ))}
        </div>

        <div
          className={cn(
            "mt-6 grid grid-cols-1 gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-4",
            loading && "opacity-50"
          )}
          aria-busy={loading}
        >
          {shown.map((listing) => (
            <MaterialCard key={listing.id} listing={listing} />
          ))}
        </div>

        {shown.length === 0 && !loading && (
          <div className="mt-6 rounded-3xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-500">
            No active deals in this location yet.{" "}
            <Link href="/post-requirement" className="font-semibold text-brand-700 hover:text-brand-800">
              Post a requirement
            </Link>{" "}
            and we&apos;ll help you source it.
          </div>
        )}

        <Link
          href={selected ? `/deals/${slugifyCity(selected)}` : "/deals"}
          className="mt-8 flex items-center justify-center gap-1 text-sm font-semibold text-brand-700 sm:hidden"
        >
          View all deals <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  )
}
