import type { Metadata } from "next"
import Image from "next/image"
import {
  ArrowRight,
  Clock,
  Handshake,
  MapPinned,
  PackageCheck,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { HowItWorks } from "@/components/home/HowItWorks"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Sell Your Surplus",
  description:
    "List surplus, excess and discontinued building & interior materials on MaalGodaam.com and reach verified buyers across India.",
}

const benefits = [
  {
    icon: Users,
    title: "Reach More Buyers",
    description: "Get discovered by an active network of contractors, retailers and homeowners.",
  },
  {
    icon: TrendingUp,
    title: "Move Slow Stock",
    description: "Turn ageing or discontinued inventory into working capital.",
  },
  {
    icon: Wallet,
    title: "Recover Value",
    description: "Price via buy-now, quote or bulk deal to recover more than liquidation channels.",
  },
  {
    icon: MapPinned,
    title: "Pan-India Demand",
    description: "Reach buyers well beyond your local market.",
  },
  {
    icon: PackageCheck,
    title: "Simple Listing",
    description: "Submit inventory details in minutes with a guided form.",
  },
  {
    icon: Handshake,
    title: "Business Support",
    description: "Our team helps verify listings and resolve buyer queries.",
  },
]

export default function SellSurplusPage() {
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <section className="container-page">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-800">
                For Suppliers
              </span>
              <h1 className="mt-4 text-4xl leading-tight font-extrabold tracking-tight text-balance text-ink-900 sm:text-5xl">
                Turn Surplus Into Value.
              </h1>
              <p className="mt-4 max-w-lg text-lg text-ink-500">
                Have excess building or interior material? Reach buyers across India through a marketplace built for
                surplus.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button href="#surplus-form" size="lg">
                  Start Selling <ArrowRight size={18} />
                </Button>
                <Button href="/how-it-works" size="lg" variant="outline">
                  How Selling Works
                </Button>
              </div>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-4xl shadow-soft-xl">
              <Image
                src="https://images.unsplash.com/photo-1592228533283-d78f7c1cf453?w=900&h=700&fit=crop&auto=format&q=80"
                alt="Supplier preparing surplus material for listing"
                fill
                sizes="(min-width: 1024px) 44vw, 92vw"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container-page grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-3xl border border-ink-100 bg-white p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <HowItWorks />

        <section id="surplus-form" className="scroll-mt-28 py-16 sm:py-20">
          <div className="container-page">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
              <div className="rounded-4xl border border-ink-100 bg-white p-6 shadow-soft-sm sm:p-10">
                <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Become a Supplier</h2>
                <p className="mt-2 text-sm text-ink-500">
                  Create a vendor account, complete a short verification, and list your inventory from your supplier
                  dashboard.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      href: "/register/vendor/b2b",
                      title: "Business vendor",
                      tag: "B2B",
                      desc: "Manufacturers, distributors, dealers and developers. GST-verified badge after review.",
                    },
                    {
                      href: "/register/vendor/b2c",
                      title: "Individual seller",
                      tag: "B2C",
                      desc: "Selling leftover renovation or project material? List it after a quick ID check.",
                    },
                  ].map((o) => (
                    <Link
                      key={o.href}
                      href={o.href}
                      className="group flex flex-col gap-2 rounded-3xl border border-ink-200 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base font-bold text-ink-900">{o.title}</span>
                        <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent-700">
                          {o.tag}
                        </span>
                      </span>
                      <span className="text-sm leading-relaxed text-ink-500">{o.desc}</span>
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                        Start registration{" "}
                        <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="mt-6 text-sm text-ink-500">
                  Already registered?{" "}
                  <Link href="/vendor" className="font-semibold text-brand-700 hover:text-brand-800">
                    Go to your supplier dashboard
                  </Link>
                </p>
              </div>

              <div className="flex h-fit flex-col gap-4 lg:sticky lg:top-28">
                <div className="rounded-3xl bg-brand-950 p-6 text-white">
                  <h3 className="text-sm font-bold">What happens next</h3>
                  <ol className="mt-4 flex flex-col gap-4">
                    {[
                      {
                        icon: PackageCheck,
                        text: "We review your submission for completeness",
                      },
                      {
                        icon: ShieldCheck,
                        text: "Our team verifies condition and pricing details",
                      },
                      {
                        icon: Clock,
                        text: "Your listing typically goes live within 1 business day",
                      },
                    ].map(({ text }, i) => (
                      <li key={text} className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-accent-400">
                          {i + 1}
                        </span>
                        <span className="text-sm text-white/75">{text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-3xl border border-ink-100 bg-white p-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
                    <ShieldCheck size={16} className="text-brand-700" />
                    No listing fees
                  </div>
                  <p className="mt-2 text-sm text-ink-500">
                    Listing your surplus inventory is free. We only succeed when you do.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
