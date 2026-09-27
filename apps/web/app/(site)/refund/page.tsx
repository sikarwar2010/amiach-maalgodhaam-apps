import type { Metadata } from "next"

export const metadata: Metadata = { title: "Refund & Returns" }

export default function RefundPage() {
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <div className="container-page max-w-3xl pb-24">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Refund &amp; Returns</h1>
          <p className="mt-2 text-sm text-ink-400">Last updated September 2026</p>
          <div className="prose-sm mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-600">
            <p>
              Because surplus, excess and discontinued material is sold as-listed, refunds and returns are handled
              directly between the buyer and supplier based on the condition and specifications stated on the listing.
              This is placeholder content for design purposes and should be replaced with counsel-reviewed policy before
              launch.
            </p>
            <p>
              If a delivered lot does not match its listed manifest, quantity or condition, contact our support team
              within 48 hours of delivery with photos and order details so we can help resolve the issue with the
              supplier.
            </p>
            <p>
              Buy Now orders paid through the platform are eligible for resolution support; Request Quote and Bulk Deal
              transactions are settled under the terms agreed directly with the supplier.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
