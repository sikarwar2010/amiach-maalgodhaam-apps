import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ROLE_HOME } from "@workspace/auth"

import { getSessionUser } from "@/lib/api/server"

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
}
export const dynamic = "force-dynamic"

/** /account is a router: it sends each person to the right portal (or to sign-in / onboarding). */
export default async function AccountPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login?redirect_url=/account")
  if (!user.onboarded && user.role === "BUYER") redirect("/register")
  redirect(ROLE_HOME[user.role])
}
