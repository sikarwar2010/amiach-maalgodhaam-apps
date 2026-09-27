"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Show } from "@clerk/nextjs"
import { usePathname } from "next/navigation"
import {
  Heart,
  Menu,
  MapPin,
  Search,
  ShoppingCart,
  X,
  ChevronDown,
  LayoutGrid,
  Tag,
  Handshake,
  FileText,
  UserRound,
} from "lucide-react"
import type { CategoryDto, LocationDto } from "@workspace/types"
import { ROLE_HOME } from "@workspace/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { AccountMenu } from "@/components/auth/AccountMenu"
import { SmartSearch } from "@/components/home/SmartSearch"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { useMe } from "@/components/session/MeProvider"
import { clerkEnabled } from "@/lib/config"
import { useSession } from "@/lib/auth/use-session"

const navLinks = [
  { label: "Explore", href: "/products" },
  { label: "Deals", href: "/deals" },
  { label: "Sell Surplus", href: "/sell-surplus" },
  { label: "How It Works", href: "/how-it-works" },
]

/** Signed-out: account icon (leads to sign-in). Signed-in: Clerk's user menu. */
function AccountControl() {
  const icon = (
    <Link
      href="/account"
      aria-label="Account"
      className="hidden h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 sm:flex"
    >
      <UserRound size={18} />
    </Link>
  )
  if (!clerkEnabled) return icon
  return (
    <>
      <Show when="signed-out">{icon}</Show>
      <Show when="signed-in">
        <span className="hidden h-10 w-10 items-center justify-center sm:flex">
          <AccountMenu />
        </span>
      </Show>
    </>
  )
}

export function FloatingNavbar({ categories, locations }: { categories: CategoryDto[]; locations: LocationDto[] }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const session = useSession()
  const { me, cartCount } = useMe()
  const signedIn = session.isLoaded && session.isSignedIn
  const accountHref = signedIn ? (me ? ROLE_HOME[me.role] : "/account") : "/login"
  const accountLabel = signedIn ? "Dashboard" : "Sign In"

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-3 sm:px-5 sm:pt-4">
        <div
          className={cn(
            "pointer-events-auto flex w-full max-w-7xl items-center justify-between gap-2 rounded-[1.75rem] border border-white/60 bg-white/85 px-3 backdrop-blur-xl transition-all duration-300 ease-out sm:px-4",
            scrolled ? "h-14 shadow-float" : "h-[4.5rem] shadow-soft"
          )}
        >
          <Link href="/" aria-label="Maalgodaam.com home" className="flex shrink-0 items-center pl-1">
            <BrandLogo height={scrolled ? 26 : 30} preload className="transition-all duration-300" />
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            <div
              className="relative"
              onMouseEnter={() => setCategoriesOpen(true)}
              onMouseLeave={() => setCategoriesOpen(false)}
            >
              <button className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900">
                Categories
                <ChevronDown size={14} className={cn("transition-transform", categoriesOpen && "rotate-180")} />
              </button>
              {categoriesOpen && (
                <div className="absolute top-full left-1/2 w-[560px] -translate-x-1/2 pt-3">
                  <div className="grid animate-fade-up grid-cols-2 gap-1 rounded-3xl border border-ink-100 bg-white p-3 shadow-soft-xl">
                    {categories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/categories/${c.slug}`}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <LayoutGrid size={14} className="text-ink-400" />
                          {c.name}
                        </span>
                        <span className="text-xs text-ink-400">{c.productCount.toLocaleString("en-IN")}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-ink-100 hover:text-ink-900",
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? "bg-brand-50 text-brand-800"
                    : "text-ink-700"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100"
            >
              <Search size={18} />
            </button>
            <Link
              href="/deals"
              aria-label="Browse deals by location"
              className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap text-ink-600 transition-colors hover:bg-ink-100 md:flex"
            >
              <MapPin size={16} />
              <span className="hidden 2xl:inline">All Locations</span>
            </Link>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 sm:flex"
            >
              <Heart size={18} />
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 sm:flex"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
            <AccountControl />
            <Link
              href={accountHref}
              className="hidden rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap text-ink-700 transition-colors hover:bg-ink-100 xl:inline-flex"
            >
              {accountLabel}
            </Link>
            <Button href="/post-requirement" size="sm" className="hidden xl:inline-flex">
              Post Requirement
            </Button>

            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100 xl:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <SmartSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        categories={categories}
        locations={locations}
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-[95] xl:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 animate-fade-in bg-ink-950/60 backdrop-blur-sm"
          />
          <div className="fixed inset-y-0 right-0 flex w-[85%] max-w-sm animate-scale-in flex-col bg-white p-5 shadow-soft-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-extrabold text-ink-900">Menu</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
              <Link
                href="/products"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-50"
              >
                <LayoutGrid size={18} /> Explore Catalogue
              </Link>
              <Link
                href="/deals"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-50"
              >
                <Tag size={18} /> Deals Around You
              </Link>
              <Link
                href="/sell-surplus"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-50"
              >
                <Handshake size={18} /> Sell Surplus
              </Link>
              <Link
                href="/post-requirement"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-50"
              >
                <FileText size={18} /> Post Requirement
              </Link>
              <Link
                href="/vendors"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-50"
              >
                <Handshake size={18} /> Trusted Suppliers
              </Link>
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-base font-semibold text-ink-900 hover:bg-ink-50"
              >
                <UserRound size={18} /> My Account
              </Link>

              <div className="my-3 h-px bg-ink-100" />

              <div className="px-3 text-xs font-semibold tracking-wide text-ink-400 uppercase">Categories</div>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {categories.slice(0, 8).map((c) => (
                  <Link
                    key={c.id}
                    href={`/categories/${c.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-ink-100 pt-4">
              <Button href="/post-requirement" onClick={() => setMobileOpen(false)}>
                Post Requirement
              </Button>
              <Button href={accountHref} variant="outline" onClick={() => setMobileOpen(false)}>
                {accountLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
