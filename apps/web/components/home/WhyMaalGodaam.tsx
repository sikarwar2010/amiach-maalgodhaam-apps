import { BadgeCheck, Boxes, Leaf, MapPinned, ShieldCheck, Wallet } from "lucide-react"

const points = [
  {
    icon: BadgeCheck,
    title: "Authentic Surplus Stock",
    description:
      "Every listing is what it claims to be — verified surplus, excess or discontinued stock, not misrepresented goods.",
  },
  {
    icon: Wallet,
    title: "Better Value",
    description: "Source quality materials at meaningfully lower prices than standard market rates.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Sourcing",
    description: "Suppliers are reviewed before their listings go live, so you can buy with confidence.",
  },
  {
    icon: MapPinned,
    title: "Pan-India Procurement",
    description: "Discover inventory from suppliers across major cities and industrial hubs nationwide.",
  },
  {
    icon: Boxes,
    title: "Bulk Availability",
    description: "From single pallets to truckloads — find quantities that match your project scale.",
  },
  {
    icon: Leaf,
    title: "Sustainable Choice",
    description: "Give quality materials a second life and reduce construction waste along the way.",
  },
]

export function WhyMaalGodaam() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Why MaalGodaam?</h2>
          <p className="mt-3 text-ink-500">A marketplace built around trust, value and scale.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {points.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-3xl border border-ink-100 bg-white p-6 transition-shadow duration-300 hover:shadow-soft"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 text-base font-bold text-ink-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
