import type { Metadata } from "next"

export const metadata: Metadata = { title: "Terms & Conditions" }

export default function TermsPage() {
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <div className="container-page max-w-3xl pb-24">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Terms &amp; Conditions</h1>
          <p className="mt-2 text-sm text-ink-400">Last updated September 2026</p>
          <div className="prose-sm mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-600">
            <p>
              These Terms &amp; Conditions govern access to and use of the MaalGodaam.com marketplace by buyers and
              suppliers of surplus, excess and discontinued building and interior materials. This is placeholder legal
              content for design purposes and should be replaced with counsel-reviewed terms before launch.
            </p>
            <p>
              By creating an account, you agree to provide accurate business information, comply with all applicable
              trade regulations, and honor the terms of any purchase, quote or bulk deal you complete on the platform.
            </p>
            <p>
              MaalGodaam.com is not a party to transactions between buyers and suppliers and does not guarantee the
              condition, quantity or value of any listed material beyond what is represented in the supplier&apos;s
              listing.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
