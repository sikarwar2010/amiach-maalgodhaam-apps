import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { listCategories, safely } from "@/lib/api/public"
import { formatNumber } from "@/lib/utils"

export const metadata: Metadata = {
  title: "All Categories",
  description: "Browse surplus tiles, furniture, sanitaryware, plywood, flooring, lighting and more on MaalGodaam.com.",
  alternates: { canonical: "/categories" },
}

// Renders live catalogue data, so it is not prerendered at build time.
export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const categories = await safely(listCategories, [])

  return (
    <main className="pt-28 sm:pt-32">
      <div className="container-page pb-24">
        <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Categories</span>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Everything You Need to Build Better
        </h1>
        <p className="mt-2 max-w-xl text-ink-500">Quality surplus material across every category.</p>

        {categories.length === 0 ? (
          <p className="mt-10 rounded-3xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-500">
            Categories are being set up. Please check back soon.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="group relative flex h-56 overflow-hidden rounded-3xl shadow-soft-sm ring-1 ring-ink-100 ring-inset"
              >
                {c.imageUrl && (
                  <Image
                    src={c.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent" />
                <div className="relative mt-auto flex w-full items-end justify-between p-5">
                  <div>
                    <h2 className="text-lg font-bold text-white">{c.name}</h2>
                    {c.description && <p className="text-xs text-white/75">{c.description}</p>}
                    <p className="mt-1 text-[11px] text-white/60">{formatNumber(c.productCount)} listings</p>
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="text-white/80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
