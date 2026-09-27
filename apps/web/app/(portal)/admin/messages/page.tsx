import type { Metadata } from "next"

import { AdminMessages } from "@/components/admin/AdminViews"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Messages" }

export default function AdminMessagesPage() {
  return (
    <>
      <PageHeader title="Contact messages" />
      <AdminMessages />
    </>
  )
}
