import Link from "next/link"
import { MapPin } from "lucide-react"
import type { LocationDto } from "@workspace/types"

import { slugifyCity } from "@/lib/catalogue-filters"
import { cn } from "@/lib/utils"

export function LocationChipRow({
  locations,
  activeCity,
}: {
  locations: LocationDto[]
  activeCity?: string | undefined
}) {
  const chip =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors"
  const on = "border-brand-700 bg-brand-800 text-white"
  const off = "border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-brand-50"
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      <Link href="/deals" className={cn(chip, !activeCity ? on : off)}>
        <MapPin size={14} /> All Locations
      </Link>
      {locations.map((l) => (
        <Link
          key={`${l.city}-${l.state}`}
          href={`/deals/${slugifyCity(l.city)}`}
          className={cn(chip, activeCity && slugifyCity(l.city) === activeCity ? on : off)}
        >
          {l.city}
        </Link>
      ))}
    </div>
  )
}
