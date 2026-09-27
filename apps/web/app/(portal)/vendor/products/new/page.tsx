import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/portal/PortalShell"
import { ProductForm } from "@/components/vendor/ProductForm"
import { getSessionUser } from "@/lib/api/server"
import { listCategories } from "@/lib/api/public"

export const metadata: Metadata = { title: "New product" }

export default async function NewProductPage() {
  const user = await getSessionUser()
  if (user?.vendorStatus !== "APPROVED" && user?.vendorStatus !== "PENDING") redirect("/vendor/products")
  const categories = await listCategories()
  return (
    <>
      <PageHeader
        back={{ href: "/vendor/products", label: "All products" }}
        title="New product"
        subtitle="Saved as a draft — submit it for review when it is ready."
      />
      <ProductForm categories={categories} canSubmit={user?.vendorStatus === "APPROVED"} />
    </>
  )
}
