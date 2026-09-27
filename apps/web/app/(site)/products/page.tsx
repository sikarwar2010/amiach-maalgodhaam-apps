import type { Metadata } from "next"

import { CatalogueContent } from "@/components/marketplace/CatalogueContent"
import type { SearchParams } from "@/lib/catalogue-filters"
import { loadCatalogue } from "@/lib/catalogue-loader"

export const metadata: Metadata = {
  title: "Explore Materials",
  description:
    "Search surplus, overstock, discontinued and clearance building & interior materials from verified suppliers across India.",
  alternates: { canonical: "/products" },
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const data = await loadCatalogue(await searchParams)
  return <CatalogueContent {...data} basePath="/products" crumbs={[{ label: "Catalogue" }]} />
}
