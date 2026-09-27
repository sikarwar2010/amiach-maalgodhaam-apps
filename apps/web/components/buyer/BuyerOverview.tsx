"use client"

import Link from "next/link"
import { FileText, Heart, PackageSearch, ShoppingCart } from "lucide-react"
import type { CartDto, InquiryDto, OrderDto, WishlistItemDto } from "@workspace/types"

import { Button } from "@/components/ui/Button"
import { EmptyState, LoadingRows, Panel, StatCard, StatusBadge } from "@/components/portal/ui"
import { useResource } from "@/lib/api/use-resource"
import { formatCurrency } from "@/lib/utils"

export function BuyerOverview() {
  const orders = useResource<OrderDto[]>("/api/orders", { pageSize: 5 })
  const inquiries = useResource<InquiryDto[]>("/api/b2b/inquiries", {
    pageSize: 5,
  })
  const wishlist = useResource<WishlistItemDto[]>("/api/wishlist")
  const cart = useResource<CartDto>("/api/cart")

  const openInquiries = (inquiries.data ?? []).filter((i) => i.status === "OPEN" || i.status === "QUOTED")

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Orders" value={orders.meta?.total ?? 0} icon={PackageSearch} />
        <StatCard
          label="Open requirements"
          value={openInquiries.length}
          icon={FileText}
          hint="Awaiting quotes or your decision"
        />
        <StatCard label="Saved materials" value={wishlist.data?.length ?? 0} icon={Heart} />
        <StatCard label="Cart items" value={cart.data?.itemCount ?? 0} icon={ShoppingCart} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Recent orders"
          action={
            <Link href="/buyer/orders" className="text-sm font-semibold text-brand-700">
              View all
            </Link>
          }
        >
          {orders.loading ? (
            <LoadingRows rows={3} />
          ) : (orders.data ?? []).length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No orders yet"
              text="When you place an order it will show up here."
              action={<Button href="/products">Explore materials</Button>}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {(orders.data ?? []).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link
                      href={`/buyer/orders/${o.id}`}
                      className="text-sm font-semibold text-ink-900 hover:text-brand-700"
                    >
                      {o.orderNumber}
                    </Link>
                    <div className="text-xs text-ink-500">
                      {new Date(o.placedAt).toLocaleDateString("en-IN")} · {formatCurrency(o.total)}
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="My requirements"
          action={
            <Button href="/post-requirement" size="sm">
              Post new
            </Button>
          }
        >
          {inquiries.loading ? (
            <LoadingRows rows={3} />
          ) : (inquiries.data ?? []).length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No requirements yet"
              text="Tell us what you need and suppliers will send quotes."
              action={<Button href="/post-requirement">Post requirement</Button>}
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {(inquiries.data ?? []).map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/buyer/inquiries/${i.id}`}
                    className="min-w-0 truncate text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {i.title}
                  </Link>
                  <StatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
