import type { Metadata } from "next"

import { BuyerShell } from "@/components/portal/shells"
import { requirePortalAccess } from "@/lib/api/server"

export const metadata: Metadata = {
  title: {
    default: "Buyer dashboard",
    template: "%s | Buyer | MaalGodaam.com",
  },
  robots: { index: false, follow: false },
}

// Portals are per-user and read the session, so they are always rendered on demand.
export const dynamic = "force-dynamic"

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortalAccess("buyer")
  return <BuyerShell user={user}>{children}</BuyerShell>
}
