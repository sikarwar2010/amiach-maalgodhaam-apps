"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, PackageSearch } from "lucide-react"
import type { CategoryDto } from "@workspace/types"
import { Button } from "@/components/ui/Button"

export function BulkProcurementSection({ categories }: { categories: CategoryDto[] }) {
  const [material, setMaterial] = useState("")
  const [category, setCategory] = useState("")
  const router = useRouter()

  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="grid items-center gap-10 rounded-4xl border border-ink-100 bg-white p-6 shadow-soft-sm sm:p-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
              <PackageSearch size={20} />
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Buying in Bulk?</h2>
            <p className="mt-3 max-w-md text-ink-500">
              Tell us what you need and our sourcing network can help you find the right material at the right value.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const params = new URLSearchParams()
              if (material) params.set("material", material)
              if (category) params.set("category", category)
              router.push(`/post-requirement?${params.toString()}`)
            }}
            className="flex flex-col gap-3 rounded-3xl bg-ink-25 p-5 ring-1 ring-ink-100 ring-inset"
          >
            <div>
              <label htmlFor="bulk-material" className="text-xs font-medium text-ink-600">
                What material do you need?
              </label>
              <input
                id="bulk-material"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="e.g. Vitrified floor tiles"
                className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="bulk-category" className="text-xs font-medium text-ink-600">
                Category
              </label>
              <select
                id="bulk-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm focus:border-brand-400 focus:outline-none"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="lg" className="mt-1">
              Post Your Requirement <ArrowRight size={18} />
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
