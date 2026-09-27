import type { Metadata } from "next"

import { OrderDetail } from "@/components/buyer/OrdersView"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Order details" }

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <PageHeader title="Order details" back={{ href: "/buyer/orders", label: "All orders" }} />
      <OrderDetail id={id} />
    </>
  )
}
