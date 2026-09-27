import type { Metadata } from "next"

import { AdminShell } from "@/components/portal/shells"
import { requirePortalAccess } from "@/lib/api/server"

export const metadata: Metadata = {
  title: {
    default: "Admin dashboard",
    template: "%s | Admin | MaalGodaam.com",
  },
  robots: { index: false, follow: false },
}

// Portals are per-user and read the session, so they are always rendered on demand.
export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortalAccess("admin")
  return <AdminShell user={user}>{children}</AdminShell>
}
