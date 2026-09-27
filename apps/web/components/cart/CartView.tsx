"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { AlertTriangle, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
import type { CartDto, CartIssueCode, CartLineDto } from "@workspace/types"

import { Button } from "@/components/ui/Button"
import { notifyCartChanged } from "@/components/session/MeProvider"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { useResource } from "@/lib/api/use-resource"
import { unitLabels } from "@/lib/labels"
import { formatCurrency, formatNumber } from "@/lib/utils"

const ISSUE_TEXT: Record<CartIssueCode, string> = {
  UNAVAILABLE: "No longer available",
  BELOW_MIN_ORDER: "Below the minimum order quantity",
  INSUFFICIENT_STOCK: "Not enough stock for this quantity",
}

export function CartView() {
  const { request } = useApi()
  const cart = useResource<CartDto>("/api/cart")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (id: string, run: () => Promise<CartDto>) => {
    setBusyId(id)
    setError(null)
    try {
      cart.set(await run())
      notifyCartChanged()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update your cart.")
    } finally {
      setBusyId(null)
    }
  }

  const setQuantity = (line: CartLineDto, quantity: number) =>
    mutate(
      line.id,
      async () =>
        (
          await request<CartDto>(`/api/cart/items/${line.id}`, {
            method: "PATCH",
            body: { quantity },
          })
        ).data
    )
  const remove = (line: CartLineDto) =>
    mutate(
      line.id,
      async () =>
        (
          await request<CartDto>(`/api/cart/items/${line.id}`, {
            method: "DELETE",
          })
        ).data
    )

  if (cart.loading) {
    return <div className="mt-8 h-64 animate-pulse rounded-3xl bg-ink-100" aria-label="Loading your cart" />
  }
  if (cart.error) {
    return (
      <div role="alert" className="mt-8 rounded-3xl bg-danger-50 p-6 text-sm text-danger-600">
        {cart.error.message}{" "}
        <button className="font-bold underline" onClick={() => void cart.reload()}>
          Try again
        </button>
      </div>
    )
  }
  const data = cart.data
  if (!data || data.items.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink-200 py-24 text-center">
        <ShoppingCart size={32} className="text-ink-300" />
        <h3 className="mt-4 text-lg font-bold text-ink-900">Your cart is empty</h3>
        <Button href="/products" className="mt-5">
          Explore Materials
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600">
            {error}
          </p>
        )}
        {data.items.map((line) => {
          const p = line.product
          const step = p.unit === "SQ_FT" || p.unit === "RUNNING_FT" ? 10 : 1
          const busy = busyId === line.id
          return (
            <div key={line.id} className="flex gap-4 rounded-3xl border border-ink-100 bg-white p-4" aria-busy={busy}>
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-ink-100">
                {p.image && <Image src={p.image} alt="" fill sizes="96px" className="object-cover" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div>
                  <Link
                    href={`/products/${p.slug}`}
                    className="line-clamp-1 text-sm font-bold text-ink-900 hover:text-brand-700"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-ink-500">
                    {formatCurrency(line.unitPrice)} each · MOQ {formatNumber(p.minOrderQty)} {unitLabels[p.unit]} ·{" "}
                    {formatNumber(line.available)} available
                  </p>
                  {line.issues.map((issue) => (
                    <p key={issue} className="mt-1 flex items-center gap-1 text-xs font-semibold text-danger-600">
                      <AlertTriangle size={12} /> {ISSUE_TEXT[issue]}
                    </p>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-ink-200 px-1 py-1">
                    <button
                      disabled={busy || line.quantity - step < p.minOrderQty}
                      onClick={() => void setQuantity(line, line.quantity - step)}
                      aria-label="Decrease quantity"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-12 text-center text-xs font-semibold" aria-live="polite">
                      {formatNumber(line.quantity)}
                    </span>
                    <button
                      disabled={busy || line.quantity + step > line.available}
                      onClick={() => void setQuantity(line, line.quantity + step)}
                      aria-label="Increase quantity"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-ink-900">{formatCurrency(line.lineTotal)}</span>
                    <button
                      disabled={busy}
                      onClick={() => void remove(line)}
                      aria-label={`Remove ${p.title}`}
                      className="text-ink-400 hover:text-danger-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="h-fit rounded-3xl border border-ink-100 bg-white p-5">
        <h2 className="text-base font-bold text-ink-900">Order Summary</h2>
        <div className="mt-4 flex flex-col gap-2.5 text-sm">
          <div className="flex justify-between text-ink-600">
            <span>Subtotal ({data.itemCount} units)</span>
            <span className="font-semibold text-ink-900">{formatCurrency(data.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-600">
            <span>Transport</span>
            <span className="text-xs text-ink-500">Arranged with the supplier</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-ink-100 pt-3 text-base font-extrabold text-ink-900">
            <span>Total</span>
            <span>{formatCurrency(data.subtotal)}</span>
          </div>
        </div>
        {data.canCheckout ? (
          <Button href="/checkout" size="lg" className="mt-5 w-full">
            Proceed to Checkout
          </Button>
        ) : (
          <>
            <Button size="lg" className="mt-5 w-full" disabled>
              Proceed to Checkout
            </Button>
            <p className="mt-2 text-xs text-danger-600">Fix the items marked above to continue.</p>
          </>
        )}
      </div>
    </div>
  )
}
