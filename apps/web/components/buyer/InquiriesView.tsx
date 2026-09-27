"use client"

import Link from "next/link"
import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import type { AddressDto, InquiryDto, QuoteDto } from "@workspace/types"

import { Button } from "@/components/ui/Button"
import { Pager } from "@/components/portal/Pager"
import { EmptyState, ErrorNote, LoadingRows, Panel, StatusBadge, TableWrap, td, th } from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { useResource } from "@/lib/api/use-resource"
import { unitLabels } from "@/lib/labels"
import { formatCurrency, formatNumber } from "@/lib/utils"

type InquiryRow = InquiryDto & { openQuotes: number }
type QuoteWithVendor = QuoteDto & {
  vendor: { id: string; slug: string; businessName: string }
}
type InquiryDetail = InquiryDto & { quotes: QuoteWithVendor[] }

export function InquiriesView() {
  const [page, setPage] = useState(1)
  const list = useResource<InquiryRow[]>("/api/b2b/inquiries", {
    page,
    pageSize: 10,
  })

  if (list.error) return <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
  if (list.loading) return <LoadingRows />
  const rows = list.data ?? []
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No requirements or quote requests yet"
        text="Request a quote on any listing, or post an open requirement for suppliers to answer."
        action={<Button href="/post-requirement">Post a requirement</Button>}
      />
    )
  }
  return (
    <Panel
      title="Requirements & quote requests"
      action={
        <Button href="/post-requirement" size="sm">
          Post new
        </Button>
      }
    >
      <TableWrap>
        <thead>
          <tr>
            <th className={th}>Requirement</th>
            <th className={th}>Quantity</th>
            <th className={th}>Quotes</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((i) => (
            <tr key={i.id}>
              <td className={td}>
                <Link href={`/buyer/inquiries/${i.id}`} className="font-semibold text-brand-700 hover:underline">
                  {i.title}
                </Link>
                <div className="text-xs text-ink-500">
                  {new Date(i.createdAt).toLocaleDateString("en-IN")} · {i.deliveryCity}
                </div>
              </td>
              <td className={td}>
                {formatNumber(i.quantity)} {unitLabels[i.unit]}
              </td>
              <td className={td}>{i.openQuotes}</td>
              <td className={td}>
                <StatusBadge status={i.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Pager meta={list.meta} onPage={setPage} />
    </Panel>
  )
}

export function InquiryDetailView({ id }: { id: string }) {
  const { request } = useApi()
  const inquiry = useResource<InquiryDetail>(`/api/b2b/inquiries/${id}`)
  const addresses = useResource<AddressDto[]>("/api/me/addresses")
  const [addressId, setAddressId] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  if (inquiry.error) {
    return (
      <ErrorNote
        message={inquiry.error.status === 404 ? "We couldn't find that requirement." : inquiry.error.message}
      />
    )
  }
  if (inquiry.loading || !inquiry.data) return <LoadingRows />
  const inq = inquiry.data
  const addressList = addresses.data ?? []
  const shipping = addressId || addressList.find((a) => a.isDefault)?.id || addressList[0]?.id || ""
  const isOpen = inq.status === "OPEN" || inq.status === "QUOTED"

  const act = async (key: string, run: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    try {
      await run()
      await inquiry.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That didn't work. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  const accept = (q: QuoteWithVendor) =>
    act(`a-${q.id}`, async () => {
      const res = await request<{ orderId: string }>(`/api/b2b/quotes/${q.id}/accept`, {
        method: "POST",
        body: { shippingAddressId: shipping },
      })
      setOrderId(res.data.orderId)
    })
  const reject = (q: QuoteWithVendor) =>
    act(`r-${q.id}`, async () => {
      await request(`/api/b2b/quotes/${q.id}/reject`, {
        method: "POST",
        body: {},
      })
    })
  const cancel = () =>
    act("cancel", async () => {
      if (!window.confirm("Cancel this requirement? Open quotes will be declined.")) return
      await request(`/api/b2b/inquiries/${id}/cancel`, {
        method: "POST",
        body: {},
      })
    })

  return (
    <div className="flex flex-col gap-6">
      <Panel title={inq.title} action={<StatusBadge status={inq.status} />}>
        <p className="text-sm whitespace-pre-line text-ink-600">{inq.description}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-400">Quantity</dt>
            <dd className="font-semibold text-ink-900">
              {formatNumber(inq.quantity)} {unitLabels[inq.unit]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Target price</dt>
            <dd className="font-semibold text-ink-900">
              {inq.targetUnitPrice ? formatCurrency(inq.targetUnitPrice) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Deliver to</dt>
            <dd className="font-semibold text-ink-900">{inq.deliveryCity}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Needed by</dt>
            <dd className="font-semibold text-ink-900">
              {inq.neededBy ? new Date(inq.neededBy).toLocaleDateString("en-IN") : "—"}
            </dd>
          </div>
        </dl>
        {inq.product && (
          <p className="mt-3 text-sm">
            About:{" "}
            <Link className="font-semibold text-brand-700 hover:underline" href={`/products/${inq.product.slug}`}>
              {inq.product.title}
            </Link>
          </p>
        )}
      </Panel>

      {orderId && (
        <div role="status" className="rounded-2xl bg-success-50 p-4 text-sm font-medium text-success-700">
          Quote accepted — your order has been created.{" "}
          <Link href={`/buyer/orders/${orderId}`} className="font-bold underline">
            View order
          </Link>
        </div>
      )}
      {error && <ErrorNote message={error} />}

      <Panel title={`Quotes (${inq.quotes.length})`}>
        {inq.quotes.length === 0 ? (
          <p className="text-sm text-ink-500">No quotes yet. Suppliers will respond here.</p>
        ) : (
          <>
            {isOpen && inq.quotes.some((q) => q.status === "SUBMITTED") && (
              <div className="mb-4">
                <label htmlFor="q-addr" className="text-xs font-semibold text-ink-700">
                  Deliver accepted quote to
                </label>
                {addressList.length === 0 ? (
                  <p className="mt-1 text-sm text-ink-500">
                    Add a delivery address in{" "}
                    <Link href="/buyer/addresses" className="font-semibold text-brand-700 underline">
                      Addresses
                    </Link>{" "}
                    first.
                  </p>
                ) : (
                  <select
                    id="q-addr"
                    value={shipping}
                    onChange={(e) => setAddressId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
                  >
                    {addressList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label ?? a.fullName} — {a.line1}, {a.city} {a.pincode}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <ul className="flex flex-col gap-3">
              {inq.quotes.map((q) => (
                <li key={q.id} className="rounded-2xl border border-ink-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/vendors/${q.vendor.slug}`}
                      className="text-sm font-bold text-ink-900 hover:text-brand-700"
                    >
                      {q.vendor.businessName}
                    </Link>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-ink-600 sm:grid-cols-4">
                    <div>{formatCurrency(q.unitPrice)} / unit</div>
                    <div>{formatNumber(q.quantity)} units</div>
                    <div className="font-bold text-ink-900">{formatCurrency(q.totalPrice)} total</div>
                    <div>Lead time {q.leadTimeDays} days</div>
                  </div>
                  <div className="mt-1 text-xs text-ink-500">
                    Valid until {new Date(q.validUntil).toLocaleDateString("en-IN")}
                  </div>
                  {q.terms && <p className="mt-2 text-sm text-ink-600">{q.terms}</p>}
                  {q.status === "SUBMITTED" && isOpen && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => void accept(q)} disabled={busy !== null || !shipping}>
                        {busy === `a-${q.id}` && <Loader2 size={14} className="animate-spin" />} Accept quote
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void reject(q)} disabled={busy !== null}>
                        {busy === `r-${q.id}` && <Loader2 size={14} className="animate-spin" />} Decline
                      </Button>
                    </div>
                  )}
                  {q.orderId && (
                    <Link
                      href={`/buyer/orders/${q.orderId}`}
                      className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
                    >
                      View order
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {isOpen && (
        <div>
          <Button variant="outline" onClick={() => void cancel()} disabled={busy !== null}>
            {busy === "cancel" && <Loader2 size={16} className="animate-spin" />} Cancel requirement
          </Button>
        </div>
      )}
    </div>
  )
}
