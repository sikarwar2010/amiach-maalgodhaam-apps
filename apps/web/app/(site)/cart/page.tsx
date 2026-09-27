import type { Metadata } from "next"

import { CartView } from "@/components/cart/CartView"

export const metadata: Metadata = { title: "Cart", robots: { index: false } }

export default function CartPage() {
  return (
    <main className="pt-28 sm:pt-32">
      <div className="container-page pb-24">
        <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Your Account</span>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Cart</h1>
        <CartView />
      </div>
    </main>
  )
}
