import type { Metadata } from "next"
import { SignIn } from "@clerk/nextjs"

import { AuthShell, AuthUnavailable } from "@/components/auth/AuthShell"
import { clerkAppearance } from "@/components/auth/clerkAppearance"
import { redirectIfSignedIn } from "@/lib/api/server"
import { clerkEnabled } from "@/lib/config"

export const metadata: Metadata = { title: "Sign In" }

export default async function LoginPage() {
  await redirectIfSignedIn()
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Source surplus. Sell surplus. One account."
      points={[
        "Track quotes, requirements and orders in one place",
        "Suppliers manage listings, enquiries and verification",
        "Business buyers get GST invoices and bulk pricing",
      ]}
    >
      {clerkEnabled ? (
        <SignIn
          path="/login"
          routing="path"
          signUpUrl="/register"
          fallbackRedirectUrl="/account"
          appearance={clerkAppearance}
        />
      ) : (
        <AuthUnavailable />
      )}
    </AuthShell>
  )
}
