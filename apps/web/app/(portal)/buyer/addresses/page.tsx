import type { Metadata } from "next"

import { AddressesView } from "@/components/buyer/AddressesView"
import { PageHeader } from "@/components/portal/PortalShell"

export const metadata: Metadata = { title: "Addresses" }

export default function AddressesPage() {
  return (
    <>
      <PageHeader title="Delivery addresses" />
      <AddressesView />
    </>
  )
}
