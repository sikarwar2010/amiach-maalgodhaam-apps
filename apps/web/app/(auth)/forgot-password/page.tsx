import { redirect } from "next/navigation"

// Password reset is part of Clerk's sign-in flow ("Forgot password?").
export default function ForgotPasswordPage() {
  redirect("/login")
}
