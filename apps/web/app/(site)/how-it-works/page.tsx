import type { Metadata } from "next"
import { HowItWorks } from "@/components/home/HowItWorks"
import { TrustedSuppliers } from "@/components/home/TrustedSuppliers"
import { WhyMaalGodaam } from "@/components/home/WhyMaalGodaam"
import { Button } from "@/components/ui/Button"
import { listVendors, safely } from "@/lib/api/public"

export const metadata: Metadata = {
  title: "How It Works",
  description: "How buying and selling surplus building & interior materials works on MaalGodaam.com.",
}

// Renders live catalogue data, so it is not prerendered at build time.
export const dynamic = "force-dynamic"

export default async function HowItWorksPage() {
  const vendors = await safely(async () => (await listVendors({ pageSize: 3 })).data, [])
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <div className="container-page text-center">
          <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">How It Works</span>
          <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-balance text-ink-900 sm:text-4xl">
            A simple path to sourcing or selling surplus material.
          </h1>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/products">Explore Materials</Button>
            <Button href="/sell-surplus" variant="outline">
              Sell Your Surplus
            </Button>
          </div>
        </div>

        <HowItWorks />
        <WhyMaalGodaam />
        <TrustedSuppliers vendors={vendors} />
      </main>
    </>
  )
}
