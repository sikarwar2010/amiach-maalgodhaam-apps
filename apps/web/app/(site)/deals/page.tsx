import type { Metadata } from "next"

import { CatalogueContent } from "@/components/marketplace/CatalogueContent"
import type { SearchParams } from "@/lib/catalogue-filters"
import { loadCatalogue } from "@/lib/catalogue-loader"

export const metadata: Metadata = {
  title: "Deals Around You",
  description:
    "Discover surplus building and interior material deals available near your location, from verified suppliers across India.",
  alternates: { canonical: "/deals" },
}

export default async function DealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const data = await loadCatalogue(await searchParams)
  return (
    <CatalogueContent
      {...data}
      basePath="/deals"
      crumbs={[{ label: "Deals" }]}
      eyebrow="Marketplace"
      title="Deals Around You"
      showLocationChips
    />
  )
}
