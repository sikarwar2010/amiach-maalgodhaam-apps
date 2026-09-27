import type { Metadata } from "next"

import { VendorShell } from "@/components/portal/shells"
import { requirePortalAccess } from "@/lib/api/server"

export const metadata: Metadata = {
  title: {
    default: "Vendor dashboard",
    template: "%s | Vendor | MaalGodaam.com",
  },
  robots: { index: false, follow: false },
}

// Portals are per-user and read the session, so they are always rendered on demand.
export const dynamic = "force-dynamic"

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortalAccess("vendor")
  return <VendorShell user={user}>{children}</VendorShell>
}
