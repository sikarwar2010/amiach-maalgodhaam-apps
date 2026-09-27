"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Boxes, Loader2 } from "lucide-react"
import { PRODUCT_STATUSES, type ProductStatus } from "@workspace/types"

import { Button } from "@/components/ui/Button"
import { Pager } from "@/components/portal/Pager"
import { EmptyState, ErrorNote, LoadingRows, Panel, StatusBadge, TableWrap, td, th } from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { useResource } from "@/lib/api/use-resource"
import { unitLabels } from "@/lib/labels"
import { formatCurrency, formatNumber } from "@/lib/utils"
import type { MaterialUnit } from "@workspace/types"

interface VendorProduct {
  id: string
  slug: string
  title: string
  status: ProductStatus
  rejectionReason: string | null
  price: number
  unit: MaterialUnit
  quantity: number
  images: { id: string; url: string }[]
}

const ACTIONS: Partial<Record<ProductStatus, { label: string; to: "PENDING_REVIEW" | "DRAFT" | "ARCHIVED" }[]>> = {
  DRAFT: [
    { label: "Submit for review", to: "PENDING_REVIEW" },
    { label: "Archive", to: "ARCHIVED" },
  ],
  REJECTED: [
    { label: "Resubmit", to: "PENDING_REVIEW" },
    { label: "Archive", to: "ARCHIVED" },
  ],
  PENDING_REVIEW: [{ label: "Withdraw", to: "DRAFT" }],
  PUBLISHED: [{ label: "Archive", to: "ARCHIVED" }],
  OUT_OF_STOCK: [{ label: "Archive", to: "ARCHIVED" }],
  ARCHIVED: [{ label: "Restore to draft", to: "DRAFT" }],
}

export function VendorProducts({ canCreate }: { canCreate: boolean }) {
  const { request } = useApi()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<ProductStatus | "">("")
  const [q, setQ] = useState("")
  const list = useResource<VendorProduct[]>("/api/vendor/products", {
    page,
    pageSize: 10,
    status: status || undefined,
    q: q || undefined,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const change = async (p: VendorProduct, to: string) => {
    setBusy(p.id)
    setError(null)
    try {
      await request(`/api/vendor/products/${p.id}/status`, {
        method: "POST",
        body: { status: to },
      })
      await list.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update this product.")
    } finally {
      setBusy(null)
    }
  }
  const remove = async (p: VendorProduct) => {
    if (!window.confirm(`Delete "${p.title}"? It disappears from your list and the storefront.`)) return
    setBusy(p.id)
    try {
      await request(`/api/vendor/products/${p.id}`, { method: "DELETE" })
      await list.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete this product.")
    } finally {
      setBusy(null)
    }
  }

  const rows = list.data ?? []
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          aria-label="Search your products"
          placeholder="Search products…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          className="h-11 flex-1 rounded-xl border border-ink-200 bg-white px-3.5 text-sm focus:border-brand-400 focus:outline-none"
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProductStatus | "")
            setPage(1)
          }}
          className="h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm focus:border-brand-400 focus:outline-none"
        >
          <option value="">All statuses</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ").toLowerCase()}
            </option>
          ))}
        </select>
        {canCreate ? <Button href="/vendor/products/new">New product</Button> : <Button disabled>New product</Button>}
      </div>
      {!canCreate && (
        <p className="text-sm text-ink-500">
          Product creation is available once your supplier account has been registered and not suspended.
        </p>
      )}
      {error && <ErrorNote message={error} />}

      {list.error ? (
        <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
      ) : list.loading ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No products found"
          text="Create your first listing to start reaching buyers."
          action={canCreate ? <Button href="/vendor/products/new">New product</Button> : undefined}
        />
      ) : (
        <Panel title="Your products">
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Price</th>
                <th className={th}>Stock</th>
                <th className={th}>Status</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                        {p.images[0] && (
                          <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={`/vendor/products/${p.id}`}
                          className="block truncate font-semibold text-ink-900 hover:text-brand-700"
                        >
                          {p.title}
                        </Link>
                        {p.status === "REJECTED" && p.rejectionReason && (
                          <span className="block text-xs text-danger-600">Rejected: {p.rejectionReason}</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className={td}>{formatCurrency(p.price)}</td>
                  <td className={td}>
                    {formatNumber(p.quantity)} {unitLabels[p.unit]}
                  </td>
                  <td className={td}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                      {busy === p.id && <Loader2 size={14} className="animate-spin" />}
                      <Link href={`/vendor/products/${p.id}`} className="text-brand-700 hover:underline">
                        Edit
                      </Link>
                      {(ACTIONS[p.status] ?? []).map((a) => (
                        <button
                          key={a.to}
                          disabled={busy === p.id}
                          onClick={() => void change(p, a.to)}
                          className="text-ink-600 hover:text-ink-900 hover:underline"
                        >
                          {a.label}
                        </button>
                      ))}
                      <button
                        disabled={busy === p.id}
                        onClick={() => void remove(p)}
                        className="text-danger-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pager meta={list.meta} onPage={setPage} />
        </Panel>
      )}
    </div>
  )
}
