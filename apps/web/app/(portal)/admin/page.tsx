import { AdminOverview } from "@/components/admin/AdminViews"
import { PageHeader } from "@/components/portal/PortalShell"

export default function AdminHome() {
  return (
    <>
      <PageHeader title="Company admin" subtitle="Marketplace health and moderation queues." />
      <AdminOverview />
    </>
  )
}
