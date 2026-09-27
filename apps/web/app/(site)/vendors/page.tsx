import type { Metadata } from "next"

import { SupplierCard } from "@/components/cards/SupplierCard"
import { Pagination } from "@/components/marketplace/Pagination"
import { listVendors, safely } from "@/lib/api/public"
import type { SearchParams } from "@/lib/catalogue-filters"

export const metadata: Metadata = {
  title: "Supplier Directory",
  description:
    "Browse verified suppliers of surplus, excess and overstock building & interior materials on MaalGodaam.com.",
  alternates: { canonical: "/vendors" },
}

export default async function VendorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page
  const page = Math.max(1, Number(raw) || 1)
  const result = await safely(() => listVendors({ page, pageSize: 12 }), {
    data: [],
    meta: undefined,
  })
  const total = result.meta?.total ?? result.data.length

  return (
    <main className="pt-28 sm:pt-32">
      <div className="container-page">
        <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Suppliers</span>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Supplier Directory</h1>
        <p className="mt-2 max-w-xl text-ink-500">
          {total} active {total === 1 ? "supplier" : "suppliers"}, reviewed before listing goes live.
        </p>

        {result.data.length === 0 ? (
          <p className="mt-8 rounded-3xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-500">
            No suppliers to show yet.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((vendor) => (
              <SupplierCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
        <div className="pb-24">
          <Pagination
            page={result.meta?.page ?? 1}
            totalPages={result.meta?.totalPages ?? 1}
            basePath="/vendors"
            params={{}}
          />
        </div>
      </div>
    </main>
  )
}
