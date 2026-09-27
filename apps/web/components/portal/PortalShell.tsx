"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, LogOut, type LucideIcon } from "lucide-react"
import { PORTAL_ACCESS } from "@workspace/auth"
import type { SessionUser } from "@workspace/types"

import { Badge } from "@/components/ui/Badge"
import { useSession } from "@/lib/auth/use-session"
import { cn } from "@/lib/utils"

import { StatusBadge } from "./ui"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Exact match only (used for the overview link). */
  exact?: boolean
}

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  BUYER: "Buyer",
  VENDOR: "Vendor",
  ADMIN: "Company Admin",
  SUPER_ADMIN: "Super Admin",
  STAFF: "Staff",
}

/** Sidebar layout shared by the buyer, vendor and admin portals. The role guard runs in each portal's server layout. */
export function PortalShell({
  portalLabel,
  user,
  nav,
  children,
}: {
  portalLabel: string
  user: SessionUser
  nav: NavItem[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { signOut } = useSession()
  const active = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
  const displayName = user.name ?? user.email
  // Portals this person may also open (a vendor can shop, an admin can see everything).
  const PORTAL_LABELS: Record<string, string> = {
    "/buyer": "Buyer portal",
    "/vendor": "Supplier portal",
    "/admin": "Admin console",
  }
  const switchTo = PORTAL_ACCESS.filter(
    (p) =>
      p.roles.includes(user.role) &&
      !pathname.startsWith(p.prefix) &&
      !(p.prefix === "/vendor" && user.vendorStatus === null)
  ).map((p) => ({ href: p.prefix, label: PORTAL_LABELS[p.prefix] ?? p.prefix }))

  return (
    <main className="container-page pt-24 pb-28 sm:pt-28">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <div className="hidden rounded-3xl border border-ink-100 bg-white p-4 shadow-soft-xs lg:block">
            <div className="flex items-center gap-3 border-b border-ink-100 pb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-800 text-sm font-bold text-white">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-ink-900">{displayName}</div>
                <div className="truncate text-xs text-ink-500">{portalLabel}</div>
              </div>
            </div>
            <nav aria-label={`${portalLabel} navigation`} className="mt-3 flex flex-col gap-0.5">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active(item) ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active(item) ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                  )}
                >
                  <item.icon size={17} /> {item.label}
                </Link>
              ))}
            </nav>
            {switchTo.length > 0 && (
              <div className="mt-3 border-t border-ink-100 pt-3">
                <div className="px-3 pb-1 text-[11px] font-bold tracking-wide text-ink-400 uppercase">Switch to</div>
                {switchTo.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                  >
                    {p.label}
                  </Link>
                ))}
              </div>
            )}
            <button
              onClick={() => void signOut()}
              className="mt-3 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
            >
              <LogOut size={17} /> Sign out
            </button>
          </div>

          <nav
            aria-label={`${portalLabel} navigation`}
            className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
          >
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item) ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium",
                  active(item) ? "border-brand-700 bg-brand-800 text-white" : "border-ink-200 bg-white text-ink-600"
                )}
              >
                <item.icon size={15} /> {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{ROLE_LABEL[user.role]}</Badge>
            {user.vendorStatus && portalLabel === "Vendor" && <StatusBadge status={user.vendorStatus} />}
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  /** Where the previous level of this page lives. */
  back?: { href: string; label: string }
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            <ArrowLeft size={14} /> {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
