import { Suspense } from "react"
import type { Metadata } from "next"
import { PackageSearch } from "lucide-react"
import { RequirementForm } from "@/components/forms/RequirementForm"
import { listCategories, listLocations, safely } from "@/lib/api/public"

export const metadata: Metadata = {
  title: "Post Your Requirement",
  description:
    "Tell MaalGodaam.com what building or interior material you need and get matched with trusted suppliers across India.",
}

export default async function PostRequirementPage() {
  const [categories, locations] = await Promise.all([safely(listCategories, []), safely(listLocations, [])])
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <div className="container-page pb-24">
          <div className="mx-auto max-w-xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
              <PackageSearch size={20} />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              Post Your Requirement
            </h1>
            <p className="mt-2 text-ink-500">
              Tell us what you need and our sourcing network can help you find the right material at the right value.
            </p>

            <div className="mt-8 rounded-4xl border border-ink-100 bg-white p-6 shadow-soft-sm sm:p-8">
              <Suspense fallback={null}>
                <RequirementForm categories={categories} locations={locations} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
