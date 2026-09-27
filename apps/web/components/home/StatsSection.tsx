import type { PlatformStatsDto } from "@workspace/types"
import { formatCompactCurrency, formatCompactNumber } from "@/lib/utils"

/** Live numbers from the API — nothing here is hard-coded marketing copy. */
export function StatsSection({ stats }: { stats: PlatformStatsDto }) {
  const items = [
    {
      label: "Inventory Value",
      value: formatCompactCurrency(stats.inventoryValue),
    },
    {
      label: "Active Listings",
      value: formatCompactNumber(stats.activeListings),
    },
    {
      label: "Verified Suppliers",
      value: formatCompactNumber(stats.verifiedSuppliers),
    },
    { label: "Categories", value: formatCompactNumber(stats.categories) },
    { label: "Cities", value: formatCompactNumber(stats.cities) },
  ]

  return (
    <section className="py-4 sm:py-6">
      <div className="container-page">
        <div className="grid grid-cols-2 gap-6 rounded-4xl border border-ink-100 bg-white px-6 py-10 shadow-soft-sm sm:grid-cols-3 sm:px-10 lg:grid-cols-5">
          {items.map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <div className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{stat.value}</div>
              <div className="mt-1 text-xs font-medium tracking-wide text-ink-500 uppercase sm:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
