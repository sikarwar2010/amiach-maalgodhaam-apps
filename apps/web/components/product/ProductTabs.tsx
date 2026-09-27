"use client"

import { useState } from "react"
import { Truck } from "lucide-react"
import type { ProductDetailDto, PublicVendorDto } from "@workspace/types"

import { logisticsLabels, unitLabels } from "@/lib/labels"
import { cn, formatNumber } from "@/lib/utils"

const tabs = ["Description", "Specifications", "Condition", "Shipping", "Supplier Info"] as const

export function ProductTabs({ listing, vendor }: { listing: ProductDetailDto; vendor: PublicVendorDto | null }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Description")
  const unit = unitLabels[listing.unit]

  const rows: { label: string; value: string }[] = [
    ...listing.specifications,
    {
      label: "Quantity Available",
      value: `${formatNumber(listing.availableQuantity)} ${unit}`,
    },
    {
      label: "Minimum Order Quantity",
      value: `${formatNumber(listing.minOrderQty)} ${unit}`,
    },
  ]

  return (
    <div className="rounded-3xl border border-ink-100 bg-white">
      <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-ink-100 px-3 sm:px-4">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "relative shrink-0 px-4 py-4 text-sm font-semibold transition-colors",
              tab === t ? "text-ink-900" : "text-ink-400 hover:text-ink-600"
            )}
          >
            {t}
            {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent-500" />}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="p-5 sm:p-6">
        {tab === "Description" && (
          <p className="text-sm leading-relaxed whitespace-pre-line text-ink-600">{listing.description}</p>
        )}

        {tab === "Specifications" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <tbody className="divide-y divide-ink-100">
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="py-3 pr-6 font-medium text-ink-500">
                      {row.label}
                    </th>
                    <td className="py-3 text-ink-800">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listing.documents.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1.5 text-sm">
                {listing.documents.map((d) => (
                  <li key={d.id}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {d.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "Condition" && (
          <p className="text-sm leading-relaxed text-ink-600">
            {listing.conditionNotes ??
              "This listing follows MaalGodaam's standard condition framework. Contact the supplier for a full condition report."}
          </p>
        )}

        {tab === "Shipping" &&
          (listing.logisticsMethods.length === 0 ? (
            <p className="text-sm text-ink-500">Shipping is arranged directly with the supplier.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {listing.logisticsMethods.map((method) => (
                <div
                  key={method}
                  className="flex items-center gap-2.5 rounded-xl bg-ink-50 px-3.5 py-3 text-sm text-ink-700"
                >
                  <Truck size={16} className="text-ink-400" />
                  {logisticsLabels[method]}
                </div>
              ))}
            </div>
          ))}

        {tab === "Supplier Info" && (
          <div className="flex flex-col gap-2 text-sm text-ink-600">
            <p>{vendor?.description ?? `${listing.vendor.businessName} is a verified supplier on MaalGodaam.com.`}</p>
            {vendor && (
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-lg font-extrabold text-ink-900">{formatNumber(vendor.activeListings)}</div>
                  <div className="text-xs text-ink-500">Active Listings</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-ink-900">
                    {vendor.city}, {vendor.state}
                  </div>
                  <div className="text-xs text-ink-500">Based in</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-ink-900">{new Date(vendor.createdAt).getFullYear()}</div>
                  <div className="text-xs text-ink-500">Member since</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
