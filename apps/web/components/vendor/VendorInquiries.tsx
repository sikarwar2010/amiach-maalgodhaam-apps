"use client"

import Link from "next/link"
import { useState } from "react"
import { Inbox, Loader2, ReceiptText } from "lucide-react"
import type { InquiryDto, QuoteDto } from "@workspace/types"
import { submitQuoteInput } from "@workspace/validators"

import { fieldClass, textareaClass } from "@/components/forms/formStyles"
import { useZodForm } from "@/components/forms/useZodForm"
import { Button } from "@/components/ui/Button"
import { Pager } from "@/components/portal/Pager"
import { EmptyState, ErrorNote, LoadingRows, Panel, StatusBadge, TableWrap, td, th } from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { useResource } from "@/lib/api/use-resource"
import { unitLabels } from "@/lib/labels"
import { formatCurrency, formatNumber } from "@/lib/utils"

type VendorInquiry = InquiryDto & {
  buyerType: string
  myQuote: QuoteDto | null
}

export function VendorInquiries() {
  const [page, setPage] = useState(1)
  const list = useResource<VendorInquiry[]>("/api/vendor/b2b/inquiries", {
    page,
    pageSize: 10,
  })

  if (list.error) return <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
  if (list.loading) return <LoadingRows />
  const rows = list.data ?? []
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No inquiries right now"
        text="Quote requests addressed to you — and open buyer requirements — show up here."
      />
    )
  }
  return (
    <Panel title="Buyer requirements">
      <TableWrap>
        <thead>
          <tr>
            <th className={th}>Requirement</th>
            <th className={th}>Quantity</th>
            <th className={th}>Deliver to</th>
            <th className={th}>Status</th>
            <th className={th}>My quote</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((i) => (
            <tr key={i.id}>
              <td className={td}>
                <Link href={`/vendor/inquiries/${i.id}`} className="font-semibold text-brand-700 hover:underline">
                  {i.title}
                </Link>
                <div className="text-xs text-ink-500">
                  {i.vendorId ? "Direct request" : "Open requirement"} ·{" "}
                  {new Date(i.createdAt).toLocaleDateString("en-IN")}
                </div>
              </td>
              <td className={td}>
                {formatNumber(i.quantity)} {unitLabels[i.unit]}
              </td>
              <td className={td}>{i.deliveryCity}</td>
              <td className={td}>
                <StatusBadge status={i.status} />
              </td>
              <td className={td}>{i.myQuote ? <StatusBadge status={i.myQuote.status} /> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Pager meta={list.meta} onPage={setPage} />
    </Panel>
  )
}

export function VendorInquiryDetail({ id }: { id: string }) {
  const inquiry = useResource<VendorInquiry>(`/api/vendor/b2b/inquiries/${id}`)

  if (inquiry.error) {
    return (
      <ErrorNote
        message={inquiry.error.status === 404 ? "We couldn't find that requirement." : inquiry.error.message}
      />
    )
  }
  if (inquiry.loading || !inquiry.data) return <LoadingRows />
  const inq = inquiry.data
  const canQuote =
    (inq.status === "OPEN" || inq.status === "QUOTED") &&
    (!inq.myQuote || inq.myQuote.status === "WITHDRAWN" || inq.myQuote.status === "EXPIRED")

  return (
    <div className="flex flex-col gap-6">
      <Panel title={inq.title} action={<StatusBadge status={inq.status} />}>
        <p className="text-sm whitespace-pre-line text-ink-600">{inq.description}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-400">Quantity</dt>
            <dd className="font-semibold">
              {formatNumber(inq.quantity)} {unitLabels[inq.unit]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Target price</dt>
            <dd className="font-semibold">{inq.targetUnitPrice ? formatCurrency(inq.targetUnitPrice) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Deliver to</dt>
            <dd className="font-semibold">{inq.deliveryCity}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Needed by</dt>
            <dd className="font-semibold">{inq.neededBy ? new Date(inq.neededBy).toLocaleDateString("en-IN") : "—"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-500">
          The buyer&apos;s identity is shared with you only if your quote is accepted.
        </p>
      </Panel>

      {inq.myQuote && (
        <Panel title="Your quote" action={<StatusBadge status={inq.myQuote.status} />}>
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <div>{formatCurrency(inq.myQuote.unitPrice)} / unit</div>
            <div>{formatNumber(inq.myQuote.quantity)} units</div>
            <div className="font-bold">{formatCurrency(inq.myQuote.totalPrice)} total</div>
            <div>Valid until {new Date(inq.myQuote.validUntil).toLocaleDateString("en-IN")}</div>
          </div>
          {inq.myQuote.orderId && (
            <p className="mt-3 text-sm font-semibold text-success-700">Accepted — an order was created. See Orders.</p>
          )}
        </Panel>
      )}

      {canQuote && <QuoteForm inquiry={inq} onSent={() => void inquiry.reload()} />}
    </div>
  )
}

function QuoteForm({ inquiry, onSent }: { inquiry: VendorInquiry; onSent: () => void }) {
  const { request } = useApi()
  const inTwoWeeks = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
  const form = useZodForm(submitQuoteInput, {
    unitPrice: inquiry.targetUnitPrice?.toString() ?? "",
    quantity: String(inquiry.quantity),
    leadTimeDays: "7",
    validUntil: inTwoWeeks,
    terms: "",
  })

  const input = (name: string, label: string, type = "text", step?: string) => (
    <div>
      <label htmlFor={`qf-${name}`} className="text-xs font-semibold text-ink-700">
        {label}
      </label>
      <input
        id={`qf-${name}`}
        type={type}
        step={step}
        value={String(form.values[name] ?? "")}
        onChange={(e) => form.set(name, e.target.value)}
        aria-invalid={Boolean(form.errors[name])}
        className={fieldClass}
      />
      {form.errors[name] && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
          {form.errors[name]}
        </p>
      )}
    </div>
  )

  return (
    <Panel title="Send a quote" action={<ReceiptText size={18} className="text-brand-700" />}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void form
            .submit(
              (raw) => ({
                unitPrice: Number(raw.unitPrice),
                quantity: Number(raw.quantity),
                leadTimeDays: Number(raw.leadTimeDays),
                validUntil: raw.validUntil ? new Date(`${String(raw.validUntil)}T23:59:59`).toISOString() : "",
                terms: raw.terms || undefined,
              }),
              async (data) => {
                await request(`/api/vendor/b2b/inquiries/${inquiry.id}/quote`, {
                  method: "POST",
                  body: data,
                })
              }
            )
            .then((ok) => ok && onSent())
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {input("unitPrice", "Price per unit (₹)", "number", "0.01")}
        {input("quantity", "Quantity you can supply", "number")}
        {input("leadTimeDays", "Lead time (days)", "number")}
        {input("validUntil", "Quote valid until", "date")}
        <div className="sm:col-span-2">
          <label htmlFor="qf-terms" className="text-xs font-semibold text-ink-700">
            Terms (optional)
          </label>
          <textarea
            id="qf-terms"
            rows={3}
            value={String(form.values.terms ?? "")}
            onChange={(e) => form.set("terms", e.target.value)}
            className={textareaClass}
          />
        </div>
        {form.formError && (
          <p role="alert" className="text-sm text-danger-600 sm:col-span-2">
            {form.formError}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={form.submitting}>
            {form.submitting && <Loader2 size={16} className="animate-spin" />} Send quote
          </Button>
        </div>
      </form>
    </Panel>
  )
}

export function VendorQuotes() {
  const { request } = useApi()
  const [page, setPage] = useState(1)
  const list = useResource<
    (QuoteDto & {
      inquiry: {
        id: string
        title: string
        quantity: number
        unit: InquiryDto["unit"]
      }
    })[]
  >("/api/vendor/b2b/quotes", { page, pageSize: 10 })
  const [error, setError] = useState<string | null>(null)

  const withdraw = async (id: string) => {
    if (!window.confirm("Withdraw this quote?")) return
    setError(null)
    try {
      await request(`/api/vendor/b2b/quotes/${id}/withdraw`, {
        method: "POST",
        body: {},
      })
      await list.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not withdraw this quote.")
    }
  }

  if (list.error) return <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
  if (list.loading) return <LoadingRows />
  const rows = list.data ?? []
  if (rows.length === 0)
    return (
      <EmptyState icon={ReceiptText} title="No quotes sent yet" text="Quotes you send to buyers are tracked here." />
    )
  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorNote message={error} />}
      <Panel title="My quotes">
        <TableWrap>
          <thead>
            <tr>
              <th className={th}>Requirement</th>
              <th className={th}>Price</th>
              <th className={th}>Valid until</th>
              <th className={th}>Status</th>
              <th className={th}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((q) => (
              <tr key={q.id}>
                <td className={td}>
                  <Link
                    href={`/vendor/inquiries/${q.inquiry.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    {q.inquiry.title}
                  </Link>
                </td>
                <td className={td}>
                  {formatCurrency(q.unitPrice)} × {formatNumber(q.quantity)} = {formatCurrency(q.totalPrice)}
                </td>
                <td className={td}>{new Date(q.validUntil).toLocaleDateString("en-IN")}</td>
                <td className={td}>
                  <StatusBadge status={q.status} />
                </td>
                <td className={td}>
                  {q.status === "SUBMITTED" && (
                    <button
                      onClick={() => void withdraw(q.id)}
                      className="text-xs font-semibold text-danger-600 hover:underline"
                    >
                      Withdraw
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Pager meta={list.meta} onPage={setPage} />
      </Panel>
    </div>
  )
}
