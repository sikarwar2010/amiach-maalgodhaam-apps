"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, Home, LayoutGrid, Tag, User } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Explore", href: "/products", icon: LayoutGrid },
  { label: "Deals", href: "/deals", icon: Tag },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Account", href: "/account", icon: User },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-3 bottom-3 z-[70] flex items-center justify-between rounded-3xl border border-white/60 bg-white/90 px-2 py-2 shadow-float backdrop-blur-xl lg:hidden">
      {tabs.map(({ label, href, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-medium transition-colors",
              active ? "text-brand-600" : "text-ink-500"
            )}
          >
            <Icon size={19} className={active ? "fill-brand-100" : ""} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
