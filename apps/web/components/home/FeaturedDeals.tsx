"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import type { DealType, ProductCardDto } from "@workspace/types"

import { MaterialCard } from "@/components/cards/MaterialCard"
import { cn } from "@/lib/utils"

const tabs: { key: "all" | DealType; label: string }[] = [
  { key: "all", label: "All Deals" },
  { key: "BUY_NOW", label: "Buy Now" },
  { key: "REQUEST_QUOTE", label: "Request Quote" },
  { key: "BULK_DEAL", label: "Bulk Deal" },
]

export function FeaturedDeals({ products }: { products: ProductCardDto[] }) {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("all")
  const filtered = active === "all" ? products : products.filter((p) => p.dealType === active)

  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              Exceptional Materials. Exceptional Value.
            </h2>
            <p className="mt-2 max-w-xl text-ink-500">
              Hand-picked surplus lots with strong savings, verified suppliers and clear specifications.
            </p>
          </div>
          <Link
            href="/products"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:inline-flex"
          >
            View full marketplace <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="mt-6 no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="Deal type">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active === tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active === tab.key ? "bg-brand-800 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="mt-6 rounded-3xl border border-dashed border-ink-200 py-12 text-center text-sm text-ink-500">
            No deals of this type right now.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.slice(0, 8).map((listing) => (
              <MaterialCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        <Link
          href="/products"
          className="mt-8 flex items-center justify-center gap-1 text-sm font-semibold text-brand-700 sm:hidden"
        >
          View full marketplace <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  )
}
