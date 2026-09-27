import { redirect } from "next/navigation"

// Our sign-in lives at /login (kept from the original site).
export default function SignInRedirect() {
  redirect("/login")
}
