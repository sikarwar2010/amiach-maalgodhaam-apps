import type { Metadata } from "next"

import { AdminAudit } from "@/components/admin/AdminViews"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Audit log" }

export default function AdminAuditPage() {
  return (
    <>
      <PageHeader title="Audit log" subtitle="Who did what, and when." />
      <AdminAudit />
    </>
  )
}
