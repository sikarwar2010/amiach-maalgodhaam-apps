import { redirect } from "next/navigation"

// Our sign-up chooser lives at /register (kept from the original site).
export default function SignUpRedirect() {
  redirect("/register")
}
