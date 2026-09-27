import type { Metadata } from "next"
import Image from "next/image"
import { getPlatformStats, safely } from "@/lib/api/public"
import { formatCompactCurrency, formatCompactNumber } from "@/lib/utils"
import { WhyMaalGodaam } from "@/components/home/WhyMaalGodaam"
import { SustainabilitySection } from "@/components/home/SustainabilitySection"

export const metadata: Metadata = { title: "About MaalGodaam.com" }

// Renders live catalogue data, so it is not prerendered at build time.
export const dynamic = "force-dynamic"

export default async function AboutPage() {
  const platformStats = await safely(getPlatformStats, {
    activeListings: 0,
    verifiedSuppliers: 0,
    categories: 0,
    cities: 0,
    inventoryValue: 0,
  })
  const stats = [
    {
      label: "Inventory Value",
      value: formatCompactCurrency(platformStats.inventoryValue),
    },
    {
      label: "Active Listings",
      value: formatCompactNumber(platformStats.activeListings),
    },
    {
      label: "Verified Suppliers",
      value: formatCompactNumber(platformStats.verifiedSuppliers),
    },
  ]
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <section className="container-page">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">About MaalGodaam.com</span>
              <h1 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight text-balance text-ink-900 sm:text-4xl">
                India&apos;s marketplace for quality surplus building materials.
              </h1>
              <p className="mt-4 text-lg text-ink-500">
                MaalGodaam.com connects verified suppliers of surplus, excess and discontinued building and interior
                materials with buyers across India — transparently, and at exceptional value. Build more for less.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-6">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-xl font-extrabold text-ink-900">{s.value}</div>
                    <div className="mt-1 text-xs text-ink-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-4xl shadow-soft-xl">
              <Image
                src="https://images.unsplash.com/photo-1684695749267-233af13276d0?w=900&h=700&fit=crop&auto=format&q=80"
                alt="MaalGodaam materials warehouse"
                fill
                sizes="(min-width: 1024px) 44vw, 92vw"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <WhyMaalGodaam />
        <SustainabilitySection />
      </main>
    </>
  )
}
