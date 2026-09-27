import { Footer } from "@/components/layout/Footer"
import { FloatingNavbar } from "@/components/layout/FloatingNavbar"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"
import { listCategories, listLocations, safely } from "@/lib/api/public"

/** Public marketplace chrome: floating navbar, footer and the mobile bottom tab bar. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [categories, locations] = await Promise.all([safely(listCategories, []), safely(listLocations, [])])
  return (
    <>
      <FloatingNavbar categories={categories} locations={locations} />
      <div className="pb-24 lg:pb-0">{children}</div>
      <Footer />
      <MobileBottomNav />
    </>
  )
}
