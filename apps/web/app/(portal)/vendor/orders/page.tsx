import type { Metadata } from "next"

import { PageHeader } from "@/components/portal/PortalShell"
import { VendorOrders } from "@/components/vendor/VendorOrders"

export const metadata: Metadata = { title: "Orders" }

export default function VendorOrdersPage() {
  return (
    <>
      <PageHeader title="Orders" subtitle="Confirm, ship and deliver the lines that contain your products." />
      <VendorOrders />
    </>
  )
}
