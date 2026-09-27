import Link from "next/link"
import Image from "next/image"
import { BadgeCheck, MapPin, Package } from "lucide-react"
import type { ProductDetailDto, PublicVendorDto } from "@workspace/types"

import { Badge } from "@/components/ui/Badge"
import { conditionLabels, conditionTone, dealTypeLabels, unitLabels } from "@/lib/labels"
import { formatNumber } from "@/lib/utils"

export function ProductInfo({ listing, vendor }: { listing: ProductDetailDto; vendor: PublicVendorDto | null }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={conditionTone[listing.condition]}>{conditionLabels[listing.condition]}</Badge>
        <Badge tone="accent">{dealTypeLabels[listing.dealType]}</Badge>
        <span className="inline-flex items-center gap-1 text-xs text-ink-500">
          <MapPin size={13} /> {listing.city}, {listing.state}
        </span>
      </div>

      {listing.brand && (
        <div className="mt-3 text-xs font-semibold tracking-wide text-brand-700 uppercase">{listing.brand}</div>
      )}
      <h1 className="mt-1 text-2xl leading-tight font-extrabold tracking-tight text-ink-900 sm:text-3xl">
        {listing.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-2xl bg-ink-50 px-3.5 py-2.5 text-sm text-ink-700">
          <Package size={16} className="text-ink-400" />
          <span className="font-semibold">
            {formatNumber(listing.availableQuantity)} {unitLabels[listing.unit]}
          </span>
          <span className="text-ink-400">available</span>
        </div>
        <div className="rounded-2xl bg-ink-50 px-3.5 py-2.5 text-sm text-ink-700">
          MOQ:{" "}
          <span className="font-semibold">
            {formatNumber(listing.minOrderQty)} {unitLabels[listing.unit]}
          </span>
        </div>
      </div>

      <Link
        href={`/vendors/${listing.vendor.slug}`}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-ink-100 p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
      >
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-sm font-extrabold text-brand-700 ring-1 ring-ink-100 ring-inset">
          {vendor?.logoUrl ? (
            <Image src={vendor.logoUrl} alt="" fill sizes="44px" className="object-cover" />
          ) : (
            listing.vendor.businessName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold text-ink-900">{listing.vendor.businessName}</span>
            {listing.vendor.verified && (
              <BadgeCheck size={15} className="shrink-0 text-brand-700" aria-label="Verified" />
            )}
          </div>
          <div className="text-xs text-ink-500">
            {listing.vendor.city}, {listing.vendor.state}
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-brand-700">View Supplier</span>
      </Link>
    </div>
  )
}
