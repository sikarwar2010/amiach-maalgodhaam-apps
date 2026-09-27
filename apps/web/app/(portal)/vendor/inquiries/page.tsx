import type { Metadata } from "next"

import { PageHeader } from "@/components/portal/PortalShell"
import { VendorInquiries } from "@/components/vendor/VendorInquiries"

export const metadata: Metadata = { title: "Inquiries" }

export default function VendorInquiriesPage() {
  return (
    <>
      <PageHeader title="Inquiries" subtitle="Buyer requests for quotes — direct to you or open to all suppliers." />
      <VendorInquiries />
    </>
  )
}
