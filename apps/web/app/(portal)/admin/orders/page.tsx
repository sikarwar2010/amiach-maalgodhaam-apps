import type { Metadata } from "next"

import { AdminOrders } from "@/components/admin/AdminViews"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Orders" }

export default function AdminOrdersPage() {
  return (
    <>
      <PageHeader title="Orders" />
      <AdminOrders />
    </>
  )
}
