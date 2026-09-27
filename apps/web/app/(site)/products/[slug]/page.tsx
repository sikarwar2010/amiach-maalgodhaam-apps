import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { ImageGallery } from "@/components/product/ImageGallery"
import { PricingPanel } from "@/components/product/PricingPanel"
import { ProductInfo } from "@/components/product/ProductInfo"
import { ProductTabs } from "@/components/product/ProductTabs"
import { SimilarMaterials } from "@/components/product/SimilarMaterials"
import { getProduct, getSimilarProducts, getVendor, safely } from "@/lib/api/public"
import { SITE_URL } from "@/lib/config"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const listing = await safely(() => getProduct(slug), null)
  if (!listing) return {}
  const description = listing.description.slice(0, 160)
  return {
    title: listing.title,
    description,
    alternates: { canonical: `/products/${listing.slug}` },
    openGraph: {
      title: listing.title,
      description,
      type: "website",
      ...(listing.image ? { images: [{ url: listing.image }] } : {}),
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const listing = await getProduct(slug)
  if (!listing) notFound()

  const [vendor, related] = await Promise.all([
    safely(() => getVendor(listing.vendor.slug), null),
    safely(() => getSimilarProducts(listing.slug), []),
  ])

  // schema.org Product markup for search engines. JSON is escaped so listing text cannot break out of the script tag.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description.slice(0, 500),
    ...(listing.brand ? { brand: { "@type": "Brand", name: listing.brand } } : {}),
    image: listing.images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/products/${listing.slug}`,
      priceCurrency: listing.currency,
      price: listing.price,
      availability: listing.availableQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: listing.vendor.businessName },
    },
  }).replace(/</g, "\\u003c")

  return (
    <main className="pt-28 sm:pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <div className="container-page">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
          <Link href="/" className="hover:text-ink-700">
            Home
          </Link>
          <ChevronRight size={12} />
          <Link href="/products" className="hover:text-ink-700">
            Catalogue
          </Link>
          <ChevronRight size={12} />
          <Link href={`/categories/${listing.category.slug}`} className="hover:text-ink-700">
            {listing.category.name}
          </Link>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ImageGallery images={listing.images} title={listing.title} />

          <div className="flex flex-col gap-6">
            <ProductInfo listing={listing} vendor={vendor} />
            <PricingPanel listing={listing} />
          </div>
        </div>

        <div className="mt-12">
          <ProductTabs listing={listing} vendor={vendor} />
        </div>

        <div className="mt-14 pb-16">
          <SimilarMaterials listings={related} />
        </div>
      </div>
    </main>
  )
}
