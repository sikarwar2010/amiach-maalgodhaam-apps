import type { Metadata } from "next"

import { PageHeader } from "@/components/portal/PortalShell"
import { VendorProducts } from "@/components/vendor/VendorProducts"
import { getSessionUser } from "@/lib/api/server"

export const metadata: Metadata = { title: "Products" }

export default async function VendorProductsPage() {
  const user = await getSessionUser()
  return (
    <>
      <PageHeader title="Products" subtitle="Create, review-submit and manage your listings." />
      <VendorProducts canCreate={user?.vendorStatus === "APPROVED" || user?.vendorStatus === "PENDING"} />
    </>
  )
}
