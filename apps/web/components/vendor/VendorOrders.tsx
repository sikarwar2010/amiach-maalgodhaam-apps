"use client"

import { useState } from "react"
import { Loader2, Package } from "lucide-react"
import type { MaterialUnit, OrderStatus } from "@workspace/types"

import { Button } from "@/components/ui/Button"
import { Pager } from "@/components/portal/Pager"
import { EmptyState, ErrorNote, LoadingRows, Panel, StatusBadge, TableWrap, td, th } from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { useResource } from "@/lib/api/use-resource"
import { unitLabels } from "@/lib/labels"
import { formatCurrency } from "@/lib/utils"

interface Line {
  id: string
  title: string
  unit: MaterialUnit
  unitPrice: number
  quantity: number
  lineTotal: number
  status: OrderStatus
  trackingNumber: string | null
  order: {
    id: string
    orderNumber: string
    placedAt: string
    notes: string | null
    shippingAddress: {
      fullName?: string
      phone?: string
      line1?: string
      city?: string
      state?: string
      pincode?: string
    }
  }
}

const NEXT: Partial<Record<OrderStatus, { label: string; to: "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" }>> =
  {
    PENDING: { label: "Confirm", to: "CONFIRMED" },
    CONFIRMED: { label: "Start processing", to: "PROCESSING" },
    PROCESSING: { label: "Mark shipped", to: "SHIPPED" },
    SHIPPED: { label: "Mark delivered", to: "DELIVERED" },
  }
const CANCELLABLE: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING"]

export function VendorOrders() {
  const { request } = useApi()
  const [page, setPage] = useState(1)
  const list = useResource<Line[]>("/api/vendor/orders", { page, pageSize: 10 })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tracking, setTracking] = useState<Record<string, string>>({})

  const update = async (line: Line, status: string) => {
    setBusy(line.id)
    setError(null)
    try {
      await request(`/api/vendor/orders/items/${line.id}`, {
        method: "PATCH",
        body: {
          status,
          ...(status === "SHIPPED" && tracking[line.id] ? { trackingNumber: tracking[line.id] } : {}),
        },
      })
      await list.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update this line.")
    } finally {
      setBusy(null)
    }
  }

  if (list.error) return <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
  if (list.loading) return <LoadingRows />
  const rows = list.data ?? []
  if (rows.length === 0) {
    return <EmptyState icon={Package} title="No orders yet" text="Orders containing your products will appear here." />
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorNote message={error} />}
      <Panel title="Order lines for your products">
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Item</th>
              <th className={th}>Ship to</th>
              <th className={th}>Total</th>
              <th className={th}>Status</th>
              <th className={th}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((l) => {
              const next = NEXT[l.status]
              const a = l.order.shippingAddress
              return (
                <tr key={l.id}>
                  <td className={td}>
                    <div className="font-semibold text-ink-900">{l.order.orderNumber}</div>
                    <div className="text-xs text-ink-500">{new Date(l.order.placedAt).toLocaleDateString("en-IN")}</div>
                  </td>
                  <td className={td}>
                    {l.title}
                    <div className="text-xs text-ink-500">
                      {l.quantity} {unitLabels[l.unit]} × {formatCurrency(l.unitPrice)}
                    </div>
                  </td>
                  <td className={td}>
                    <div className="text-xs">
                      {a.fullName}, {a.phone}
                    </div>
                    <div className="text-xs text-ink-500">
                      {a.line1}, {a.city} {a.pincode}
                    </div>
                    {l.order.notes && <div className="text-xs text-ink-500 italic">“{l.order.notes}”</div>}
                  </td>
                  <td className={td}>{formatCurrency(l.lineTotal)}</td>
                  <td className={td}>
                    <StatusBadge status={l.status} />
                    {l.trackingNumber && <div className="text-xs text-ink-500">{l.trackingNumber}</div>}
                  </td>
                  <td className={td}>
                    <div className="flex flex-col gap-1.5">
                      {l.status === "PROCESSING" && (
                        <input
                          aria-label="Tracking number"
                          placeholder="Tracking no. (optional)"
                          value={tracking[l.id] ?? ""}
                          onChange={(e) => setTracking({ ...tracking, [l.id]: e.target.value })}
                          className="h-9 w-40 rounded-lg border border-ink-200 px-2 text-xs"
                        />
                      )}
                      {next && (
                        <Button size="sm" onClick={() => void update(l, next.to)} disabled={busy === l.id}>
                          {busy === l.id && <Loader2 size={14} className="animate-spin" />} {next.label}
                        </Button>
                      )}
                      {CANCELLABLE.includes(l.status) && (
                        <button
                          disabled={busy === l.id}
                          onClick={() =>
                            window.confirm("Cancel this line? Stock is returned.") && void update(l, "CANCELLED")
                          }
                          className="text-xs font-semibold text-danger-600 hover:underline"
                        >
                          Cancel line
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableWrap>
        <Pager meta={list.meta} onPage={setPage} />
      </Panel>
    </div>
  )
}
