import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, MapPin, Package } from "lucide-react"
import type { PublicVendorDto } from "@workspace/types"

import { Badge } from "@/components/ui/Badge"
import { formatNumber } from "@/lib/utils"

/** Only public facts are shown — the API never sends tax ids or contact details for vendors. */
export function SupplierCard({ vendor }: { vendor: PublicVendorDto }) {
  const memberSince = new Date(vendor.createdAt).getFullYear()
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className="group flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-soft-sm ring-1 ring-ink-100 transition-all duration-300 ring-inset hover:-translate-y-1 hover:shadow-soft-lg"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 text-lg font-extrabold text-brand-700 ring-1 ring-ink-100 ring-inset">
          {vendor.logoUrl ? (
            <Image src={vendor.logoUrl} alt={vendor.businessName} fill sizes="56px" className="object-cover" />
          ) : (
            vendor.businessName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold text-ink-900">{vendor.businessName}</h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
            <MapPin size={12} /> {vendor.city}, {vendor.state}
          </div>
        </div>
      </div>

      <Badge tone="brand" icon={<BadgeCheck size={13} />} className="w-fit">
        Verified Supplier
      </Badge>

      {vendor.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {vendor.categories.slice(0, 4).map((c) => (
            <span
              key={c}
              className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium text-ink-600 capitalize"
            >
              {c.replaceAll("-", " ")}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-ink-25 p-3 text-center ring-1 ring-ink-100 ring-inset">
        <div>
          <div className="inline-flex items-center gap-1 text-sm font-extrabold text-ink-900">
            <Package size={13} />
            {formatNumber(vendor.activeListings)}
          </div>
          <div className="text-[10px] tracking-wide text-ink-500 uppercase">Active Listings</div>
        </div>
        <div className="border-l border-ink-200">
          <div className="text-sm font-extrabold text-ink-900">{memberSince}</div>
          <div className="text-[10px] tracking-wide text-ink-500 uppercase">Member Since</div>
        </div>
      </div>

      <span className="mt-auto inline-flex items-center justify-center rounded-xl border border-ink-200 py-2.5 text-sm font-semibold text-ink-900 transition-colors group-hover:border-brand-600 group-hover:text-brand-700">
        View Supplier
      </span>
    </Link>
  )
}
