"use client"

import Link from "next/link"
import { Boxes, Clock, Inbox, Package, ReceiptText, ShieldAlert, Wallet } from "lucide-react"
import type { VendorStatus } from "@workspace/types"

import { Button } from "@/components/ui/Button"
import { ErrorNote, LoadingRows, Panel, StatCard } from "@/components/portal/ui"
import { useResource } from "@/lib/api/use-resource"
import { formatCurrency } from "@/lib/utils"

interface Dashboard {
  vendorStatus: VendorStatus
  products: Record<string, number>
  orderItems: Record<string, number>
  deliveredRevenue: number
  openInquiries: number
  pendingQuotes: number
}

const sum = (o: Record<string, number>, keys?: string[]) =>
  Object.entries(o).reduce((n, [k, v]) => (keys && !keys.includes(k) ? n : n + v), 0)

export function VendorOverview() {
  const dash = useResource<Dashboard>("/api/vendor/dashboard")

  if (dash.error) return <ErrorNote message={dash.error.message} onRetry={() => void dash.reload()} />
  if (dash.loading || !dash.data) return <LoadingRows />
  const d = dash.data

  return (
    <div className="flex flex-col gap-6">
      {d.vendorStatus === "PENDING" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-3xl border border-accent-200 bg-accent-50 p-5 text-sm text-accent-900"
        >
          <Clock size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Your account is awaiting verification.</p>
            <p className="mt-1">
              Our team reviews new suppliers within 1–2 business days. You can finish your{" "}
              <Link href="/vendor/profile" className="font-bold underline">
                business profile and documents
              </Link>{" "}
              meanwhile; you can already prepare product drafts, which you can submit for review once approved.
            </p>
          </div>
        </div>
      )}
      {(d.vendorStatus === "REJECTED" || d.vendorStatus === "SUSPENDED") && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-3xl border border-danger-500/30 bg-danger-50 p-5 text-sm text-danger-600"
        >
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Your supplier account is {d.vendorStatus.toLowerCase()}.</p>
            <p className="mt-1">
              See your{" "}
              <Link href="/vendor/profile" className="font-bold underline">
                business profile
              </Link>{" "}
              for the reason, or contact support.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Live listings"
          value={d.products.PUBLISHED ?? 0}
          icon={Boxes}
          hint={`${d.products.PENDING_REVIEW ?? 0} in review`}
        />
        <StatCard
          label="Order lines"
          value={sum(d.orderItems)}
          icon={Package}
          hint={`${d.orderItems.PENDING ?? 0} awaiting confirmation`}
        />
        <StatCard label="Open inquiries" value={d.openInquiries} icon={Inbox} />
        <StatCard label="Delivered revenue" value={formatCurrency(d.deliveredRevenue)} icon={Wallet} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Listings by status"
          action={
            d.vendorStatus === "APPROVED" || d.vendorStatus === "PENDING" ? (
              <Button href="/vendor/products/new" size="sm">
                New product
              </Button>
            ) : undefined
          }
        >
          {Object.keys(d.products).length === 0 ? (
            <p className="text-sm text-ink-500">You have not created any products yet.</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {Object.entries(d.products).map(([status, count]) => (
                <li key={status} className="flex justify-between py-2.5 first:pt-0 last:pb-0">
                  <span className="text-ink-600 capitalize">{status.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="font-bold text-ink-900">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title="Quotes"
          action={
            <Link href="/vendor/quotes" className="text-sm font-semibold text-brand-700">
              View all
            </Link>
          }
        >
          <div className="flex items-center gap-3 text-sm text-ink-600">
            <ReceiptText size={18} className="text-brand-700" />
            <span>
              <span className="font-bold text-ink-900">{d.pendingQuotes}</span> quotes awaiting the buyer&apos;s
              decision
            </span>
          </div>
          <p className="mt-3 text-xs text-ink-500">
            Respond to buyer requirements from{" "}
            <Link href="/vendor/inquiries" className="font-semibold text-brand-700 underline">
              Inquiries
            </Link>
            .
          </p>
        </Panel>
      </div>
    </div>
  )
}
