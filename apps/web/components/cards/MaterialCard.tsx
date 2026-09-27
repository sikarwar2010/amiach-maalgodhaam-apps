import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, MapPin, Package } from "lucide-react"
import type { DealType, ProductCardDto } from "@workspace/types"

import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { WishlistButton } from "@/components/ui/WishlistButton"
import { conditionLabels, conditionTone, dealTypeLabels, unitLabelSingular, unitLabels } from "@/lib/labels"
import { formatCurrency, formatNumber } from "@/lib/utils"

const dealCtaLabel: Record<DealType, string> = {
  BUY_NOW: "View Deal",
  REQUEST_QUOTE: "Request Quote",
  BULK_DEAL: "View Bulk Deal",
  CONTACT_SUPPLIER: "Contact Supplier",
}

export function MaterialCard({ listing }: { listing: ProductCardDto }) {
  const soldOut = listing.status === "OUT_OF_STOCK" || listing.availableQuantity <= 0

  return (
    <Link
      href={`/products/${listing.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-soft-sm ring-1 ring-ink-100 transition-all duration-300 ring-inset hover:-translate-y-1 hover:shadow-soft-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
        {listing.image && (
          <Image
            src={listing.image}
            alt={listing.title}
            fill
            sizes="(min-width: 1280px) 23vw, (min-width: 768px) 45vw, 92vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        )}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={conditionTone[listing.condition]}>{conditionLabels[listing.condition]}</Badge>
            {soldOut && <Badge tone="dark">Sold out</Badge>}
          </div>
          <WishlistButton size="sm" productId={listing.id} />
        </div>
        <div className="absolute inset-x-3 bottom-3">
          <Badge tone="dark">{dealTypeLabels[listing.dealType]}</Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          {listing.brand && (
            <div className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{listing.brand}</div>
          )}
          <h3 className="mt-0.5 line-clamp-2 text-[15px] leading-snug font-bold text-ink-900">{listing.title}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Package size={13} /> {formatNumber(listing.availableQuantity)} {unitLabels[listing.unit]}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} /> {listing.city}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-ink-500">
          <span>
            Sold by <span className="font-semibold text-ink-700">{listing.vendor.businessName}</span>
          </span>
          {listing.vendor.verified && <BadgeCheck size={13} className="text-brand-600" aria-label="Verified" />}
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-ink-100 pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-ink-400 line-through">
              {listing.marketValue ? formatCurrency(listing.marketValue) : " "}
            </span>
            {listing.discountPct > 0 && (
              <span className="text-xs font-semibold text-accent-600">Save {listing.discountPct}%</span>
            )}
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium tracking-wide text-ink-500 uppercase">MaalGodaam Price</div>
              <div className="text-xl font-extrabold text-brand-800">
                {formatCurrency(listing.price)}
                <span className="ml-1 text-xs font-semibold text-ink-500">/ {unitLabelSingular[listing.unit]}</span>
              </div>
            </div>
            <Button size="sm" variant={listing.dealType === "BUY_NOW" ? "primary" : "outline"}>
              {dealCtaLabel[listing.dealType]}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
