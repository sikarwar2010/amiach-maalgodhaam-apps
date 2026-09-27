import type { Metadata } from "next"

import { AdminUsers } from "@/components/admin/AdminViews"
import { PageHeader } from "@/components/portal/PortalShell"
import { getSessionUser } from "@/lib/api/server"

export const metadata: Metadata = { title: "Users" }

export default async function AdminUsersPage() {
  const me = await getSessionUser()
  return (
    <>
      <PageHeader title="Users" subtitle="Roles and account status. Only a super admin can create admins." />
      <AdminUsers meId={me?.id ?? ""} />
    </>
  )
}
