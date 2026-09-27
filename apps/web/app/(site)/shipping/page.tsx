import type { Metadata } from "next"

export const metadata: Metadata = { title: "Shipping & Transport" }

export default function ShippingPage() {
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <div className="container-page max-w-3xl pb-24">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Shipping &amp; Transport</h1>
          <p className="mt-2 text-sm text-ink-400">Last updated September 2026</p>
          <div className="prose-sm mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-600">
            <p>
              MaalGodaam.com is not a logistics provider. Transport for surplus material is arranged directly between
              the buyer and the supplier, using one of the logistics methods listed on each listing — transport arranged
              by the supplier, self pickup, freight, or local delivery. This is placeholder content for design purposes
              and should be replaced with counsel-reviewed policy before launch.
            </p>
            <p>
              Estimated transport costs shown at checkout are indicative only. Final transport costs, timelines and
              responsibility are confirmed directly with the supplier before dispatch.
            </p>
            <p>
              Given the bulk and dimensional nature of building materials, buyers are encouraged to confirm packaging,
              loading access and delivery vehicle requirements with the supplier ahead of transport.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
