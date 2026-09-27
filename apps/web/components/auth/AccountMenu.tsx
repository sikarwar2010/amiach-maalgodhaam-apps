"use client"

import { UserButton } from "@clerk/nextjs"
import { ROLE_HOME } from "@workspace/auth"
import { Bell, LayoutDashboard, ShoppingBag, Store } from "lucide-react"

import { useMe } from "@/components/session/MeProvider"

/** Clerk's user menu with quick links into the person's own portal(s). Only render when Clerk is enabled. */
export function AccountMenu() {
  const { me } = useMe()
  const role = me?.role
  const isBackOffice = role === "ADMIN" || role === "SUPER_ADMIN" || role === "STAFF"

  return (
    <UserButton>
      <UserButton.MenuItems>
        {me && (
          <UserButton.Link
            label={role === "VENDOR" ? "Supplier dashboard" : isBackOffice ? "Admin console" : "My dashboard"}
            labelIcon={<LayoutDashboard size={16} />}
            href={ROLE_HOME[me.role]}
          />
        )}
        {me && role !== "BUYER" && (
          <UserButton.Link label="My orders (buyer)" labelIcon={<ShoppingBag size={16} />} href="/buyer/orders" />
        )}
        {me && me.vendorStatus !== null && role !== "VENDOR" && (
          <UserButton.Link label="Supplier portal" labelIcon={<Store size={16} />} href="/vendor" />
        )}
        {me && (
          <UserButton.Link
            label={me.unreadNotifications > 0 ? `Notifications (${me.unreadNotifications})` : "Notifications"}
            labelIcon={<Bell size={16} />}
            href={
              isBackOffice
                ? "/admin/notifications"
                : role === "VENDOR"
                  ? "/vendor/notifications"
                  : "/buyer/notifications"
            }
          />
        )}
      </UserButton.MenuItems>
    </UserButton>
  )
}
