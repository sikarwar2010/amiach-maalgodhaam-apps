import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { BrandLogo } from "@/components/brand/BrandLogo"

/** Focused chrome for sign-in, registration and onboarding: no marketplace navigation to distract from the task. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-ink-100 bg-white px-4 sm:px-8">
        <Link href="/" aria-label="Maalgodaam.com home">
          <BrandLogo height={28} preload />
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
          <ArrowLeft size={15} /> Back to marketplace
        </Link>
      </header>
      {children}
    </>
  )
}
