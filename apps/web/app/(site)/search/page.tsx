import type { Metadata } from "next"

import { CatalogueContent } from "@/components/marketplace/CatalogueContent"
import type { SearchParams } from "@/lib/catalogue-filters"
import { loadCatalogue } from "@/lib/catalogue-loader"

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const q = (await searchParams).q
  const term = Array.isArray(q) ? q[0] : q
  return {
    title: term ? `Results for "${term}"` : "Search Results",
    description: "Search surplus building and interior materials on MaalGodaam.com.",
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const data = await loadCatalogue(await searchParams)
  const term = data.filters.q
  return (
    <CatalogueContent
      {...data}
      basePath="/search"
      crumbs={[{ label: "Search" }]}
      eyebrow="Search"
      title={term ? `Results for "${term}"` : "Search Results"}
    />
  )
}
