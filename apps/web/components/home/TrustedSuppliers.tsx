import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import type { PublicVendorDto } from "@workspace/types"
import { SupplierCard } from "@/components/cards/SupplierCard"

export function TrustedSuppliers({ vendors }: { vendors: PublicVendorDto[] }) {
  if (vendors.length === 0) return null
  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Trusted Suppliers</h2>
            <p className="mt-2 max-w-xl text-ink-500">
              Every supplier is vetted before listing goes live, so you can source with confidence.
            </p>
          </div>
          <Link
            href="/vendors"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:inline-flex"
          >
            View supplier directory <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.slice(0, 3).map((vendor) => (
            <SupplierCard key={vendor.id} vendor={vendor} />
          ))}
        </div>

        <Link
          href="/vendors"
          className="mt-8 flex items-center justify-center gap-1 text-sm font-semibold text-brand-700 sm:hidden"
        >
          View supplier directory <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  )
}
