import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SignUp } from "@clerk/nextjs"

import { AuthShell, AuthUnavailable } from "@/components/auth/AuthShell"
import { clerkAppearance } from "@/components/auth/clerkAppearance"
import { routeForTrack } from "@/lib/api/server"
import { isAccountKind, isRole } from "@/lib/auth/types"
import { clerkEnabled } from "@/lib/config"

type Params = { role: string; type: string; rest?: string[] }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { role, type } = await params
  return { title: `Register as ${type.toUpperCase()} ${role}` }
}

const PANEL = {
  vendor: {
    eyebrow: "Sell your surplus",
    title: "Reach verified buyers across India.",
    points: [
      "List surplus, excess and discontinued stock for free",
      "Quotes, bulk deals and direct enquiries in one inbox",
      "Admin verification builds buyer trust in your listings",
    ],
  },
  customer: {
    eyebrow: "Buy smarter",
    title: "Quality materials at better value.",
    points: [
      "Deals near you, filtered by condition and quantity",
      "Post a requirement and let suppliers come to you",
      "Save, compare and request quotes in one tap",
    ],
  },
} as const

export default async function RegisterRolePage({ params }: { params: Promise<Params> }) {
  const { role, type } = await params
  if (!isRole(role) || !isAccountKind(type)) notFound()
  await routeForTrack(role, type, "signup")
  const panel = PANEL[role]

  return (
    <AuthShell {...panel}>
      {clerkEnabled ? (
        <SignUp
          path={`/register/${role}/${type}`}
          routing="path"
          signInUrl="/login"
          forceRedirectUrl={`/onboarding/${role}/${type}`}
          appearance={clerkAppearance}
        />
      ) : (
        <AuthUnavailable />
      )}
    </AuthShell>
  )
}
