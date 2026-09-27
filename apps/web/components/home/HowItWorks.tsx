"use client"

import { useState } from "react"
import {
  Boxes,
  Handshake,
  PackageCheck,
  Rocket,
  Scale,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"

const buyerSteps = [
  {
    icon: Search,
    title: "Search",
    description: "Find materials by category, location, brand or application.",
  },
  {
    icon: Boxes,
    title: "Discover",
    description: "Browse surplus, overstock and clearance listings from verified suppliers.",
  },
  {
    icon: Scale,
    title: "Compare",
    description: "Evaluate market value, savings and supplier ratings side by side.",
  },
  {
    icon: ShoppingBag,
    title: "Request / Buy",
    description: "Buy now, request a quote, or start a bulk deal conversation.",
  },
  {
    icon: Truck,
    title: "Receive",
    description: "Coordinate transport and receive your materials on site.",
  },
]

const sellerSteps = [
  {
    icon: Upload,
    title: "Submit Inventory",
    description: "Share details of your surplus, excess or discontinued stock.",
  },
  {
    icon: ShieldCheck,
    title: "Verify Details",
    description: "Our team reviews condition, quantity and pricing details.",
  },
  {
    icon: Rocket,
    title: "Publish",
    description: "Your listing goes live to a pan-India network of buyers.",
  },
  {
    icon: Handshake,
    title: "Connect With Buyers",
    description: "Respond to quote requests and bulk deal enquiries.",
  },
  {
    icon: PackageCheck,
    title: "Complete Sale",
    description: "Finalise terms and hand off with platform support.",
  },
]

export function HowItWorks() {
  const [tab, setTab] = useState<"buyers" | "sellers">("buyers")
  const steps = tab === "buyers" ? buyerSteps : sellerSteps

  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">How MaalGodaam Works</h2>
          <p className="mt-3 text-ink-500">A streamlined path for both sides of the marketplace.</p>

          <div className="mx-auto mt-6 inline-flex rounded-full bg-ink-100 p-1">
            {(["buyers", "sellers"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-semibold capitalize transition-colors",
                  tab === key ? "bg-white text-ink-900 shadow-soft-sm" : "text-ink-500"
                )}
              >
                For {key}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-12">
          <div aria-hidden className="absolute top-6 right-0 left-0 hidden h-px bg-ink-200 lg:block" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step, i) => (
              <div key={step.title} className="relative flex flex-col items-start">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-800 text-white shadow-soft-sm">
                  <step.icon size={20} />
                </div>
                <span className="mt-3 text-xs font-semibold text-accent-600">Step {i + 1}</span>
                <h3 className="mt-1 text-sm font-bold text-ink-900">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
