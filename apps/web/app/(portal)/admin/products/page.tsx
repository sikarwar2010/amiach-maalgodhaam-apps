import type { Metadata } from "next"
import { PRODUCT_STATUSES } from "@workspace/types"

import { AdminProducts } from "@/components/admin/AdminViews"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Products" }

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const initial = PRODUCT_STATUSES.find((s) => s === status)
  return (
    <>
      <PageHeader title="Products" subtitle="Moderate listings before they go live." />
      <AdminProducts {...(initial ? { initialStatus: initial } : {})} />
    </>
  )
}
