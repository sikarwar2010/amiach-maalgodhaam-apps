import Image from "next/image"
import { Leaf, Recycle, ShieldCheck, Sparkles } from "lucide-react"

const points = [
  { icon: Recycle, label: "Less Waste" },
  { icon: Sparkles, label: "More Value" },
  { icon: Leaf, label: "Better Resource Use" },
  { icon: ShieldCheck, label: "Smarter Procurement" },
]

export function SustainabilitySection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="grid items-center gap-10 overflow-hidden rounded-4xl bg-leaf-50 lg:grid-cols-2">
          <div className="p-6 sm:p-10 lg:p-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-leaf-800 ring-1 ring-leaf-200 ring-inset">
              <Leaf size={13} /> Sustainability
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-balance text-leaf-900 sm:text-3xl">
              Give Good Materials a Second Life.
            </h2>
            <p className="mt-3 max-w-md text-leaf-800/70">
              Surplus does not mean inferior. Reuse quality materials, reduce waste and build more responsibly — without
              compromising on quality.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {points.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-2xl bg-white/70 p-3.5 ring-1 ring-leaf-200 ring-inset"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-leaf-700 text-white">
                    <Icon size={16} />
                  </span>
                  <span className="text-sm font-semibold text-leaf-900">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full lg:aspect-auto lg:h-full lg:min-h-[420px]">
            <Image
              src="https://images.unsplash.com/photo-1609105075502-1e3a54264ff0?w=900&h=900&fit=crop&auto=format&q=80"
              alt="Reclaimed architectural materials staged for reuse"
              fill
              sizes="(min-width: 1024px) 45vw, 92vw"
              className="object-cover opacity-90 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-leaf-700/35" />
          </div>
        </div>
      </div>
    </section>
  )
}
