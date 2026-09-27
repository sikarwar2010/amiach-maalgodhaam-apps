"use client"

import Link from "next/link"
import { Show } from "@clerk/nextjs"
import { Bell, Store, ShoppingCart } from "lucide-react"

import { AccountMenu } from "@/components/auth/AccountMenu"
import { BrandLogo } from "@/components/brand/BrandLogo"
import { useMe } from "@/components/session/MeProvider"
import { clerkEnabled } from "@/lib/config"

const LABEL = { buyer: "Buyer portal", vendor: "Supplier portal", admin: "Admin console" } as const

/** Compact fixed header for the buyer, vendor and admin portals (their own chrome, separate from the storefront). */
export function PortalHeader({ portal }: { portal: keyof typeof LABEL }) {
  const { cartCount, me } = useMe()
  const unread = me?.unreadNotifications ?? 0
  const icon =
    "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100"

  return (
    <header className="fixed inset-x-0 top-0 z-[80] border-b border-ink-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-8xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Maalgodaam.com home">
            <BrandLogo height={26} preload />
          </Link>
          <span className="hidden rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800 sm:inline">
            {LABEL[portal]}
          </span>
        </div>
        <nav aria-label="Portal shortcuts" className="flex items-center gap-1">
          <Link href="/products" className={`${icon} w-auto gap-1.5 px-3 text-sm font-medium`}>
            <Store size={16} /> <span className="hidden sm:inline">Marketplace</span>
          </Link>
          <Link
            href={`/${portal}/notifications`}
            aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
            className={icon}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          {portal !== "admin" && (
            <Link href="/cart" aria-label="Cart" className={icon}>
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          )}
          {clerkEnabled && (
            <Show when="signed-in">
              <span className="ml-1 flex h-10 w-10 items-center justify-center">
                <AccountMenu />
              </span>
            </Show>
          )}
        </nav>
      </div>
    </header>
  )
}
