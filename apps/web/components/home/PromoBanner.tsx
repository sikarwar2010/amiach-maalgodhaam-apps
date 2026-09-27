import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/Button"

export function PromoBanner() {
  return (
    <section className="py-8 sm:py-10">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-4xl bg-brand-950">
          <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
            <Image
              src="https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?w=1600&h=900&fit=crop&auto=format&q=80"
              alt="Architectural interior built with quality surplus materials"
              fill
              sizes="100vw"
              className="object-cover opacity-45 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/85 to-brand-950/40" />
          </div>
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-lg px-6 sm:px-12">
              <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-white sm:text-4xl">
                Build Smart.
                <br />
                Save More.
                <br />
                Waste Less.
              </h2>
              <p className="mt-4 max-w-sm text-white/70">
                Build with quality surplus materials that are better for your budget and better for the planet.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/products" size="lg">
                  Explore Materials
                  <ArrowRight size={18} />
                </Button>
                <Button href="/sell-surplus" size="lg" variant="dark">
                  Sell Surplus
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
