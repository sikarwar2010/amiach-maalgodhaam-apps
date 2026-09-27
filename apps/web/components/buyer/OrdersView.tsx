"use client"

import Link from "next/link"
import { useState } from "react"
import { Loader2, PackageSearch } from "lucide-react"
import type { OrderDto } from "@workspace/types"

import { Button } from "@/components/ui/Button"
import { Pager } from "@/components/portal/Pager"
import { EmptyState, ErrorNote, LoadingRows, Panel, StatusBadge, TableWrap, td, th } from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { useResource } from "@/lib/api/use-resource"
import { unitLabels } from "@/lib/labels"
import { formatCurrency } from "@/lib/utils"

export function OrdersView() {
  const [page, setPage] = useState(1)
  const orders = useResource<OrderDto[]>("/api/orders", { page, pageSize: 10 })

  if (orders.error) return <ErrorNote message={orders.error.message} onRetry={() => void orders.reload()} />
  if (orders.loading) return <LoadingRows />
  const rows = orders.data ?? []
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No orders yet"
        text="Orders you place will appear here with live status."
        action={<Button href="/products">Explore materials</Button>}
      />
    )
  }
  return (
    <Panel title="Your orders">
      <TableWrap>
        <thead>
          <tr>
            <th className={th}>Order</th>
            <th className={th}>Placed</th>
            <th className={th}>Channel</th>
            <th className={th}>Total</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((o) => (
            <tr key={o.id}>
              <td className={td}>
                <Link href={`/buyer/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">
                  {o.orderNumber}
                </Link>
              </td>
              <td className={td}>{new Date(o.placedAt).toLocaleDateString("en-IN")}</td>
              <td className={td}>{o.channel}</td>
              <td className={td}>{formatCurrency(o.total)}</td>
              <td className={td}>
                <StatusBadge status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Pager meta={orders.meta} onPage={setPage} />
    </Panel>
  )
}

export function OrderDetail({ id }: { id: string }) {
  const { request } = useApi()
  const order = useResource<OrderDto>(`/api/orders/${id}`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (order.error) {
    return <ErrorNote message={order.error.status === 404 ? "We couldn't find that order." : order.error.message} />
  }
  if (order.loading || !order.data) return <LoadingRows />
  const o = order.data
  const cancellable =
    o.items.every((i) => i.status === "PENDING" || i.status === "CONFIRMED") && o.status !== "CANCELLED"

  const cancel = async () => {
    if (!window.confirm("Cancel this order? Stock is returned to the supplier.")) return
    setBusy(true)
    setError(null)
    try {
      order.set(
        (
          await request<OrderDto>(`/api/orders/${id}/cancel`, {
            method: "POST",
            body: {},
          })
        ).data
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not cancel this order.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title={`Order ${o.orderNumber}`} action={<StatusBadge status={o.status} />}>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-400">Placed</dt>
            <dd className="font-semibold text-ink-900">{new Date(o.placedAt).toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Payment</dt>
            <dd className="font-semibold text-ink-900">
              {o.payments[0]?.method.replaceAll("_", " ").toLowerCase()} · {o.payments[0]?.status.toLowerCase()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Deliver to</dt>
            <dd className="text-ink-900">
              {o.shippingAddress.fullName}, {o.shippingAddress.line1}, {o.shippingAddress.city}{" "}
              {o.shippingAddress.pincode}
            </dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Items">
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Item</th>
              <th className={th}>Qty</th>
              <th className={th}>Unit price</th>
              <th className={th}>Total</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {o.items.map((i) => (
              <tr key={i.id}>
                <td className={td}>
                  {i.productId ? <span className="font-semibold text-ink-900">{i.title}</span> : i.title}
                  {i.trackingNumber && <div className="text-xs text-ink-500">Tracking: {i.trackingNumber}</div>}
                </td>
                <td className={td}>
                  {i.quantity} {unitLabels[i.unit]}
                </td>
                <td className={td}>{formatCurrency(i.unitPrice)}</td>
                <td className={td}>{formatCurrency(i.lineTotal)}</td>
                <td className={td}>
                  <StatusBadge status={i.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <div className="mt-4 flex justify-end text-base font-extrabold text-ink-900">
          Total {formatCurrency(o.total)}
        </div>
      </Panel>

      {error && <ErrorNote message={error} />}
      {cancellable && (
        <div>
          <Button variant="outline" onClick={() => void cancel()} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />} Cancel order
          </Button>
        </div>
      )}
    </div>
  )
}
