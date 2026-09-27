"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, Building2, ShoppingBag, Store, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const TRACKS = {
  customer: {
    label: "I want to buy",
    icon: ShoppingBag,
    options: [
      {
        type: "b2b",
        icon: Building2,
        title: "Business buyer",
        tag: "B2B",
        desc: "Architects, contractors, builders, dealers and procurement teams. Bulk quotes, GST invoices, requirement matching.",
      },
      {
        type: "b2c",
        icon: UserRound,
        title: "Individual buyer",
        tag: "B2C",
        desc: "Homeowners and renovators. Find surplus tiles, furniture, fittings and more near you.",
      },
    ],
  },
  vendor: {
    label: "I want to sell",
    icon: Store,
    options: [
      {
        type: "b2b",
        icon: Building2,
        title: "Business vendor",
        tag: "B2B",
        desc: "Manufacturers, distributors, dealers and developers with surplus stock. GST-verified badge after review.",
      },
      {
        type: "b2c",
        icon: UserRound,
        title: "Individual seller",
        tag: "B2C",
        desc: "Selling leftover renovation or project material? List it in minutes after a quick ID check.",
      },
    ],
  },
} as const

export function RegisterChooser() {
  const [role, setRole] = useState<keyof typeof TRACKS>("customer")
  const track = TRACKS[role]

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Create your account</h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Tell us how you&apos;ll use Maalgodaam.com — we&apos;ll tailor the onboarding.
      </p>

      <div
        role="tablist"
        aria-label="Account purpose"
        className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-ink-100 p-1"
      >
        {(Object.keys(TRACKS) as (keyof typeof TRACKS)[]).map((key) => {
          const T = TRACKS[key]
          const active = key === role
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setRole(key)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
                active ? "bg-white text-ink-900 shadow-soft-sm" : "text-ink-500 hover:text-ink-700"
              )}
            >
              <T.icon size={16} /> {T.label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" className="mt-4 flex flex-col gap-3">
        {track.options.map(({ type, icon: Icon, title, tag, desc }) => (
          <Link
            key={type}
            href={`/register/${role}/${type}`}
            className="group flex items-start gap-4 rounded-3xl border border-ink-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-800 group-hover:text-white">
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-base font-bold text-ink-900">{title}</span>
                <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent-700">
                  {tag}
                </span>
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-500">{desc}</span>
            </span>
            <ArrowRight
              size={18}
              className="mt-1 shrink-0 text-ink-300 transition-all group-hover:translate-x-1 group-hover:text-brand-700"
            />
          </Link>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </p>
    </div>
  )
}
