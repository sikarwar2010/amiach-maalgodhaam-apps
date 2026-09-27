import type { Metadata } from "next"

import { OrdersView } from "@/components/buyer/OrdersView"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Orders" }

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Orders" subtitle="Track everything you have bought." />
      <OrdersView />
    </>
  )
}
