import Link from "next/link"
import { PackageSearch } from "lucide-react"

import { BrandLogo } from "@/components/brand/BrandLogo"
import { Button } from "@/components/ui/Button"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Link href="/" aria-label="Maalgodaam.com home" className="mb-8">
        <BrandLogo height={30} />
      </Link>
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-700">
        <PackageSearch size={28} />
      </span>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-ink-500">
        This page may have moved, or the listing may have sold out or been removed.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href="/products" size="lg">
          Explore Materials
        </Button>
        <Button href="/" size="lg" variant="outline">
          Home
        </Button>
        <Button href="/account" size="lg" variant="ghost">
          My dashboard
        </Button>
      </div>
    </main>
  )
}
