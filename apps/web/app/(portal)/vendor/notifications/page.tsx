import type { Metadata } from "next"

import { NotificationsView } from "@/components/portal/NotificationsView"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Notifications" }

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationsView />
    </>
  )
}
