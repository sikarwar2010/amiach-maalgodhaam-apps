import { BuyerOverview } from "@/components/buyer/BuyerOverview"
import { PageHeader } from "@/components/portal/PortalShell"

export default function BuyerHome() {
  return (
    <>
      <PageHeader title="Buyer dashboard" subtitle="Orders, requirements and saved materials in one place." />
      <BuyerOverview />
    </>
  )
}
