import type { Metadata } from "next"

import { PageHeader } from "@/components/portal/PortalShell"
import { VendorInquiryDetail } from "@/components/vendor/VendorInquiries"

export const metadata: Metadata = { title: "Inquiry" }

export default async function VendorInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <PageHeader title="Inquiry" back={{ href: "/vendor/inquiries", label: "All inquiries" }} />
      <VendorInquiryDetail id={id} />
    </>
  )
}
