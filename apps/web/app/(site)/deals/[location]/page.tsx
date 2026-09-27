import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CatalogueContent } from "@/components/marketplace/CatalogueContent"
import { listLocations, safely } from "@/lib/api/public"
import { slugifyCity, type SearchParams } from "@/lib/catalogue-filters"
import { loadCatalogue } from "@/lib/catalogue-loader"

type Props = {
  params: Promise<{ location: string }>
  searchParams: Promise<SearchParams>
}

async function findLocation(slug: string) {
  const locations = await safely(listLocations, [])
  return locations.find((l) => slugifyCity(l.city) === slug)
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { location: slug } = await params
  const location = await findLocation(slug)
  if (!location) return {}
  return {
    title: `Deals in ${location.city}`,
    description: `Surplus building and interior material deals available in ${location.city}, ${location.state} from verified suppliers.`,
    alternates: { canonical: `/deals/${slug}` },
  }
}

export default async function DealsByLocationPage({ params, searchParams }: Props) {
  const { location: slug } = await params
  const location = await findLocation(slug)
  if (!location) notFound()

  const data = await loadCatalogue(await searchParams, { city: location.city })
  return (
    <CatalogueContent
      {...data}
      basePath={`/deals/${slug}`}
      eyebrow="Deals Around You"
      title={`Deals in ${location.city}`}
      crumbs={[{ label: "Deals", href: "/deals" }, { label: location.city }]}
      locked={["city"]}
      showLocationChips
      activeCity={slug}
    />
  )
}
