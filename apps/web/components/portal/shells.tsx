"use client"

import {
  Bell,
  Boxes,
  ClipboardList,
  FileText,
  FolderTree,
  Heart,
  Inbox,
  LayoutDashboard,
  MailQuestion,
  MapPin,
  Package,
  PlusCircle,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserRound,
  Users,
} from "lucide-react"
import type { SessionUser } from "@workspace/types"

import { PortalHeader } from "./PortalHeader"
import { PortalShell, type NavItem } from "./PortalShell"

// Icons are components, so each shell defines its nav here on the client instead of receiving it from a server layout.
const BUYER_NAV: NavItem[] = [
  { label: "Overview", href: "/buyer", icon: LayoutDashboard, exact: true },
  { label: "Orders", href: "/buyer/orders", icon: ShoppingBag },
  { label: "Cart", href: "/cart", icon: ShoppingCart },
  { label: "Requirements & quotes", href: "/buyer/inquiries", icon: FileText },
  { label: "Wishlist", href: "/buyer/wishlist", icon: Heart },
  { label: "Addresses", href: "/buyer/addresses", icon: MapPin },
  { label: "Notifications", href: "/buyer/notifications", icon: Bell },
  { label: "Profile", href: "/buyer/profile", icon: UserRound },
]

const VENDOR_NAV: NavItem[] = [
  { label: "Overview", href: "/vendor", icon: LayoutDashboard, exact: true },
  { label: "Products", href: "/vendor/products", icon: Boxes },
  { label: "Add product", href: "/vendor/products/new", icon: PlusCircle, exact: true },
  { label: "Orders", href: "/vendor/orders", icon: Package },
  { label: "Inquiries", href: "/vendor/inquiries", icon: Inbox },
  { label: "My quotes", href: "/vendor/quotes", icon: ReceiptText },
  { label: "Notifications", href: "/vendor/notifications", icon: Bell },
  { label: "Business profile", href: "/vendor/profile", icon: Store },
]

const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Vendors", href: "/admin/vendors", icon: ShieldCheck },
  { label: "Products", href: "/admin/products", icon: Boxes },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Orders", href: "/admin/orders", icon: ClipboardList },
  { label: "Messages", href: "/admin/messages", icon: MailQuestion },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Audit log", href: "/admin/audit", icon: ScrollText },
]

export function BuyerShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <>
      <PortalHeader portal="buyer" />
      <PortalShell portalLabel="Buyer" user={user} nav={BUYER_NAV}>
        {children}
      </PortalShell>
    </>
  )
}

export function VendorShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <>
      <PortalHeader portal="vendor" />
      <PortalShell portalLabel="Vendor" user={user} nav={VENDOR_NAV}>
        {children}
      </PortalShell>
    </>
  )
}

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <>
      <PortalHeader portal="admin" />
      <PortalShell portalLabel="Admin" user={user} nav={ADMIN_NAV}>
        {children}
      </PortalShell>
    </>
  )
}
