import { PageHeader } from "@/components/portal/PortalShell"
import { VendorOverview } from "@/components/vendor/VendorOverview"

export default function VendorHome() {
  return (
    <>
      <PageHeader title="Supplier dashboard" subtitle="Listings, orders and quotes at a glance." />
      <VendorOverview />
    </>
  )
}
