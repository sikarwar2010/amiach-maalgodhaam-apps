import type { Metadata } from "next"

import { InquiryDetailView } from "@/components/buyer/InquiriesView"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Requirement" }

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <>
      <PageHeader title="Requirement" back={{ href: "/buyer/inquiries", label: "All requirements" }} />
      <InquiryDetailView id={id} />
    </>
  )
}
