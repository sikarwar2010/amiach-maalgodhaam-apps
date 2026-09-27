import { ArrowRight, Handshake, MapPinned, PackageCheck, TrendingUp, Users, Wallet } from "lucide-react"
import { Button } from "@/components/ui/Button"

const benefits = [
  { icon: Users, label: "Reach More Buyers" },
  { icon: TrendingUp, label: "Move Slow Stock" },
  { icon: Wallet, label: "Recover Value" },
  { icon: MapPinned, label: "Pan-India Demand" },
  { icon: PackageCheck, label: "Simple Listing" },
  { icon: Handshake, label: "Business Support" },
]

export function SellSurplusCTA() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="grid items-center gap-10 rounded-4xl bg-brand-950 px-6 py-12 sm:px-10 sm:py-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-balance text-white sm:text-3xl">
              Turn Surplus Into Value.
            </h2>
            <p className="mt-3 max-w-md text-white/65">
              Have excess building or interior material? Reach buyers across India through a marketplace built for
              surplus.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/sell-surplus" size="lg">
                Sell Your Surplus
                <ArrowRight size={18} />
              </Button>
              <Button href="/how-it-works" size="lg" variant="dark">
                How Selling Works
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {benefits.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 ring-inset"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/20 text-accent-400">
                  <Icon size={16} />
                </span>
                <span className="text-sm font-semibold text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
