import type { Metadata } from "next"

import { InquiriesView } from "@/components/buyer/InquiriesView"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Requirements & quotes" }

export default function InquiriesPage() {
  return (
    <>
      <PageHeader title="Requirements & quotes" subtitle="Compare supplier quotes and turn one into an order." />
      <InquiriesView />
    </>
  )
}
