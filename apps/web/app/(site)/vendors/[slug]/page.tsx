import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { BadgeCheck, MapPin } from "lucide-react"

import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { MaterialCard } from "@/components/cards/MaterialCard"
import { Badge } from "@/components/ui/Badge"
import { getVendor, listProducts, safely } from "@/lib/api/public"
import { formatNumber } from "@/lib/utils"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const vendor = await safely(() => getVendor(slug), null)
  if (!vendor) return {}
  return {
    title: vendor.businessName,
    description: vendor.description ?? `${vendor.businessName} on MaalGodaam.com.`,
    alternates: { canonical: `/vendors/${vendor.slug}` },
  }
}

export default async function VendorProfilePage({ params }: Props) {
  const { slug } = await params
  const vendor = await getVendor(slug)
  if (!vendor) notFound()

  const products = await safely(() => listProducts({ vendor: vendor.slug, pageSize: 24 }), {
    data: [],
    meta: undefined,
  })

  return (
    <main className="pt-28 sm:pt-32">
      <div className="container-page">
        <Breadcrumbs items={[{ label: "Suppliers", href: "/vendors" }, { label: vendor.businessName }]} />
        <div className="overflow-hidden rounded-4xl bg-brand-950">
          <div className="relative h-32 sm:h-40">
            <Image src="/brand/warehouse-t.png" alt="" fill sizes="100vw" className="object-cover opacity-30" />
          </div>
          <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:pb-8">
            <div className="-mt-10 flex items-end gap-4 sm:-mt-12">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 text-2xl font-extrabold text-brand-700 ring-4 ring-brand-950 sm:h-24 sm:w-24">
                {vendor.logoUrl ? (
                  <Image src={vendor.logoUrl} alt={vendor.businessName} fill sizes="96px" className="object-cover" />
                ) : (
                  vendor.businessName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-extrabold text-white sm:text-2xl">{vendor.businessName}</h1>
                  <BadgeCheck size={18} className="text-accent-400" aria-label="Verified" />
                </div>
                <div className="mt-1 flex items-center gap-1 text-sm text-white/60">
                  <MapPin size={13} /> {vendor.city}, {vendor.state}
                </div>
              </div>
            </div>
            <Badge tone="accent" icon={<BadgeCheck size={13} />} className="w-fit">
              Verified Supplier
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            {
              label: "Active Listings",
              value: formatNumber(vendor.activeListings),
            },
            { label: "Based in", value: vendor.city },
            {
              label: "Member Since",
              value: String(new Date(vendor.createdAt).getFullYear()),
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-ink-100 bg-white p-4 text-center">
              <div className="text-xl font-extrabold text-ink-900">{stat.value}</div>
              <div className="mt-0.5 text-xs text-ink-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {vendor.description && (
          <p className="mt-6 max-w-3xl rounded-2xl border border-ink-100 bg-white p-5 text-sm leading-relaxed text-ink-600">
            {vendor.description}
          </p>
        )}

        <div className="mt-10 pb-24">
          <h2 className="text-xl font-extrabold tracking-tight text-ink-900">
            Active Listings ({products.meta?.total ?? products.data.length})
          </h2>
          {products.data.length === 0 ? (
            <p className="mt-5 rounded-3xl border border-dashed border-ink-200 py-12 text-center text-sm text-ink-500">
              This supplier has no active listings right now.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.data.map((listing) => (
                <MaterialCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
