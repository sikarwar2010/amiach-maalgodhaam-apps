import type { Metadata } from "next"

import { PageHeader } from "@/components/portal/PortalShell"
import { WishlistView } from "@/components/wishlist/WishlistView"

export const metadata: Metadata = { title: "Wishlist" }

export default function BuyerWishlistPage() {
  return (
    <>
      <PageHeader title="Wishlist" subtitle="Materials you saved. Move them to your cart when you are ready." />
      <WishlistView />
    </>
  )
}
