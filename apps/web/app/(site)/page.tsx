import { BulkProcurementSection } from "@/components/home/BulkProcurementSection"
import { CategoryGrid } from "@/components/home/CategoryGrid"
import { DealsAroundYou } from "@/components/home/DealsAroundYou"
import { FaqSection } from "@/components/home/FaqSection"
import { FeaturedDeals } from "@/components/home/FeaturedDeals"
import { HeroSection } from "@/components/home/HeroSection"
import { HomeSearchBar } from "@/components/home/HomeSearchBar"
import { HowItWorks } from "@/components/home/HowItWorks"
import { LocationDiscovery } from "@/components/home/LocationDiscovery"
import { Newsletter } from "@/components/home/Newsletter"
import { PromoBanner } from "@/components/home/PromoBanner"
import { QuickActions } from "@/components/home/QuickActions"
import { SellSurplusCTA } from "@/components/home/SellSurplusCTA"
import { StatsSection } from "@/components/home/StatsSection"
import { SustainabilitySection } from "@/components/home/SustainabilitySection"
import { TrustedSuppliers } from "@/components/home/TrustedSuppliers"
import { WhyMaalGodaam } from "@/components/home/WhyMaalGodaam"
import {
  getFeaturedProducts,
  getPlatformStats,
  listCategories,
  listLocations,
  listProducts,
  listVendors,
  safely,
} from "@/lib/api/public"

// Reads live catalogue data, so it must not be prerendered at build time.
export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [categories, locations, stats, featured, latest, vendors] = await Promise.all([
    safely(listCategories, []),
    safely(listLocations, []),
    safely(getPlatformStats, {
      activeListings: 0,
      verifiedSuppliers: 0,
      categories: 0,
      cities: 0,
      inventoryValue: 0,
    }),
    safely(getFeaturedProducts, []),
    safely(async () => (await listProducts({ pageSize: 4 })).data, []),
    safely(async () => (await listVendors({ pageSize: 3 })).data, []),
  ])

  // Fall back to the newest listings when nothing has been flagged as featured yet.
  const dealProducts = featured.length > 0 ? featured : latest

  return (
    <main>
      <HeroSection spotlight={dealProducts[0]} cityCount={stats.cities} />
      <HomeSearchBar categories={categories} locations={locations} />
      <QuickActions />
      <StatsSection stats={stats} />
      <CategoryGrid categories={categories} />
      <DealsAroundYou locations={locations} initialProducts={latest} />
      <FeaturedDeals products={dealProducts} />
      <LocationDiscovery locations={locations} />
      <BulkProcurementSection categories={categories} />
      <SellSurplusCTA />
      <TrustedSuppliers vendors={vendors} />
      <WhyMaalGodaam />
      <SustainabilitySection />
      <HowItWorks />
      <PromoBanner />
      <FaqSection />
      <Newsletter />
    </main>
  )
}
