import type { Metadata } from "next"
import { VENDOR_STATUSES } from "@workspace/types"

import { AdminVendors } from "@/components/admin/AdminViews"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Vendors" }

export default async function AdminVendorsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  const initial = VENDOR_STATUSES.find((s) => s === status)
  return (
    <>
      <PageHeader title="Vendors" subtitle="Review registrations and documents, then approve, reject or suspend." />
      <AdminVendors {...(initial ? { initialStatus: initial } : {})} />
    </>
  )
}
