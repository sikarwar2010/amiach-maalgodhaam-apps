import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CatalogueContent } from "@/components/marketplace/CatalogueContent"
import { getCategory, safely } from "@/lib/api/public"
import type { SearchParams } from "@/lib/catalogue-filters"
import { loadCatalogue } from "@/lib/catalogue-loader"

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params
  const category = await safely(() => getCategory(slug), null)
  if (!category) return {}
  return {
    title: category.name,
    description: `Surplus, overstock and discounted ${category.name.toLowerCase()} from verified suppliers across India.${category.description ? ` ${category.description}` : ""}`,
    alternates: { canonical: `/categories/${category.slug}` },
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) notFound()

  const data = await loadCatalogue(await searchParams, {
    category: category.slug,
  })
  return (
    <CatalogueContent
      {...data}
      basePath={`/categories/${category.slug}`}
      eyebrow="Category"
      title={category.name}
      crumbs={[{ label: "Categories", href: "/categories" }, { label: category.name }]}
      locked={["category"]}
    />
  )
}
