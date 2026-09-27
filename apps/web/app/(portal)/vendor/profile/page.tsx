import type { Metadata } from "next"

import { PageHeader } from "@/components/portal/PortalShell"
import { VendorProfile } from "@/components/vendor/VendorProfile"

export const metadata: Metadata = { title: "Business profile" }

export default function VendorProfilePage() {
  return (
    <>
      <PageHeader title="Business profile" subtitle="Your public supplier details and verification documents." />
      <VendorProfile />
    </>
  )
}
