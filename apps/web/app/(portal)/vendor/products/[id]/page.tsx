import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { DealType, LogisticsMethod, MaterialUnit, ProductCondition } from "@workspace/types"

import { PageHeader } from "@/components/portal/PortalShell"
import { ProductForm, type ProductFormValues } from "@/components/vendor/ProductForm"
import { listCategories } from "@/lib/api/public"
import { ApiError } from "@/lib/api/fetcher"
import { getSessionUser, serverApi } from "@/lib/api/server"

export const metadata: Metadata = { title: "Edit product" }

interface VendorProductDto {
  id: string
  title: string
  brand: string | null
  description: string
  condition: ProductCondition
  dealType: DealType
  unit: MaterialUnit
  price: number
  marketValue: number | null
  minOrderQty: number
  quantity: number
  city: string
  state: string
  pincode: string | null
  logisticsMethods: LogisticsMethod[]
  conditionNotes: string | null
  specifications: { label: string; value: string }[]
  tags: string[]
  category: { id: string }
  subCategory: { id: string } | null
  images: { url: string; alt: string | null }[]
  bulkPrices: { minQty: number; maxQty: number | null; unitPrice: number }[]
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let product: VendorProductDto
  try {
    product = (await serverApi<VendorProductDto>(`/api/vendor/products/${encodeURIComponent(id)}`)).data
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound()
    throw error
  }
  const [categories, user] = await Promise.all([listCategories(), getSessionUser()])

  const initial: ProductFormValues = {
    id: product.id,
    title: product.title,
    brand: product.brand ?? "",
    description: product.description,
    categoryId: product.category.id,
    subCategoryId: product.subCategory?.id ?? "",
    condition: product.condition,
    dealType: product.dealType,
    unit: product.unit,
    price: String(product.price),
    marketValue: product.marketValue === null ? "" : String(product.marketValue),
    minOrderQty: String(product.minOrderQty),
    quantity: String(product.quantity),
    city: product.city,
    state: product.state,
    pincode: product.pincode ?? "",
    logisticsMethods: product.logisticsMethods,
    conditionNotes: product.conditionNotes ?? "",
    specifications: product.specifications,
    tags: product.tags.join(", "),
    images: product.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
    bulkPrices: product.bulkPrices.map((b) => ({
      minQty: String(b.minQty),
      maxQty: b.maxQty === null ? "" : String(b.maxQty),
      unitPrice: String(b.unitPrice),
    })),
  }

  return (
    <>
      <PageHeader
        back={{ href: "/vendor/products", label: "All products" }}
        title="Edit product"
        subtitle="Changing the title, description, brand, category or condition of a live listing sends it back for review."
      />
      <ProductForm initial={initial} categories={categories} canSubmit={user?.vendorStatus === "APPROVED"} />
    </>
  )
}
