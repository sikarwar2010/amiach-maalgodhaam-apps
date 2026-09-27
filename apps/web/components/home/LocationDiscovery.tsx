"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPin, Navigation, Search } from "lucide-react"
import type { LocationDto } from "@workspace/types"

import { slugifyCity } from "@/lib/catalogue-filters"
import { formatNumber } from "@/lib/utils"

export function LocationDiscovery({ locations }: { locations: LocationDto[] }) {
  const sorted = [...locations].sort((a, b) => b.listingCount - a.listingCount).slice(0, 12)
  const [query, setQuery] = useState("")
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const term = query.trim().toLowerCase()
    const match = term
      ? locations.find((l) => l.city.toLowerCase().includes(term) || l.state.toLowerCase().includes(term))
      : undefined
    router.push(match ? `/deals/${slugifyCity(match.city)}` : "/deals")
  }

  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="overflow-hidden rounded-4xl bg-brand-950 px-6 py-12 sm:px-10 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 ring-1 ring-white/10 ring-inset">
                <Navigation size={13} />
                Location-Based Discovery
              </span>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Find Materials Near You
              </h2>
              <p className="mt-3 max-w-md text-white/60">
                Reduce transport costs and lead times by sourcing from suppliers closer to your project. Search by city
                or state.
              </p>

              <form
                onSubmit={handleSearch}
                className="mt-6 flex items-center gap-2 rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/10 ring-inset"
              >
                <Search size={17} className="ml-2 shrink-0 text-white/50" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="City or state"
                  placeholder="Enter city or state..."
                  className="w-full bg-transparent py-2 text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
                >
                  Search
                </button>
              </form>

              <Link
                href="/deals"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white"
              >
                <MapPin size={14} /> Or browse all {locations.length > 1 ? `${locations.length} cities` : "locations"}
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
              {sorted.map((loc) => (
                <Link
                  key={`${loc.city}-${loc.state}`}
                  href={`/deals/${slugifyCity(loc.city)}`}
                  className="group flex flex-col justify-between rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 transition-all duration-200 ring-inset hover:bg-white/[0.12]"
                >
                  <MapPin size={16} className="text-accent-400" />
                  <div className="mt-6">
                    <div className="text-sm font-bold text-white">{loc.city}</div>
                    <div className="text-xs text-white/50">{loc.state}</div>
                    <div className="mt-2 text-xs font-semibold text-accent-400">
                      {formatNumber(loc.listingCount)} {loc.listingCount === 1 ? "Listing" : "Listings"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
