import type { Metadata } from "next"

import { PageHeader } from "@/components/portal/PortalShell"
import { VendorQuotes } from "@/components/vendor/VendorInquiries"

export const metadata: Metadata = { title: "My quotes" }

export default function VendorQuotesPage() {
  return (
    <>
      <PageHeader title="My quotes" />
      <VendorQuotes />
    </>
  )
}
