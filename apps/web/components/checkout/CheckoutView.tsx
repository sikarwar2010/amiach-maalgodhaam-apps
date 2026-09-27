"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Plus } from "lucide-react"
import type { AddressDto, CartDto, OrderDto, PaymentMethod } from "@workspace/types"

import { AddressForm } from "@/components/buyer/AddressForm"
import { Button } from "@/components/ui/Button"
import { notifyCartChanged } from "@/components/session/MeProvider"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { useResource } from "@/lib/api/use-resource"
import { cn, formatCurrency } from "@/lib/utils"

const METHODS: {
  value: PaymentMethod
  label: string
  hint: string
  disabled?: boolean
}[] = [
  {
    value: "COD",
    label: "Cash on delivery",
    hint: "Pay the supplier when the material arrives.",
  },
  {
    value: "BANK_TRANSFER",
    label: "Bank transfer",
    hint: "Transfer to the supplier after they confirm your order.",
  },
  {
    value: "ONLINE",
    label: "Pay online",
    hint: "Cards and UPI are coming soon.",
    disabled: true,
  },
]

export function CheckoutView() {
  const { request } = useApi()
  const cart = useResource<CartDto>("/api/cart")
  const addresses = useResource<AddressDto[]>("/api/me/addresses")

  const [selected, setSelected] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>("COD")
  const [notes, setNotes] = useState("")
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [placed, setPlaced] = useState<OrderDto | null>(null)

  if (placed) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 pt-28 sm:pt-32">
        <div className="max-w-md rounded-4xl border border-ink-100 bg-white p-10 text-center shadow-soft-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-600">
            <CheckCircle2 size={26} />
          </span>
          <h1 className="mt-4 text-xl font-extrabold text-ink-900">Order placed</h1>
          <p className="mt-2 text-sm text-ink-500">
            Order <span className="font-bold text-ink-800">{placed.orderNumber}</span> ({formatCurrency(placed.total)})
            has been sent to your supplier, who will confirm it and coordinate transport.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button href={`/buyer/orders/${placed.id}`}>View order</Button>
            <Button href="/products" variant="outline">
              Continue browsing
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const loading = cart.loading || addresses.loading
  const list = addresses.data ?? []
  const shippingId = selected ?? list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? null

  const place = async () => {
    if (!shippingId) return
    setPlacing(true)
    setError(null)
    try {
      const res = await request<OrderDto>("/api/orders", {
        method: "POST",
        body: {
          shippingAddressId: shippingId,
          paymentMethod: method,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      })
      notifyCartChanged()
      setPlaced(res.data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We couldn't place your order. Please try again.")
      void cart.reload()
    } finally {
      setPlacing(false)
    }
  }

  return (
    <main className="pt-28 sm:pt-32">
      <div className="container-page pb-24">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Checkout</h1>
        <p className="mt-1.5 text-sm text-ink-500">Prices and stock are confirmed again when you place the order.</p>

        {loading ? (
          <div className="mt-8 h-64 animate-pulse rounded-3xl bg-ink-100" aria-label="Loading" />
        ) : !cart.data || cart.data.items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-200 p-12 text-center">
            <p className="text-ink-600">Your cart is empty.</p>
            <Button href="/products" className="mt-4">
              Explore Materials
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-6">
              <section className="rounded-3xl border border-ink-100 bg-white p-6" aria-labelledby="ship-h">
                <h2 id="ship-h" className="text-base font-bold text-ink-900">
                  Delivery address
                </h2>
                <div role="radiogroup" aria-labelledby="ship-h" className="mt-4 flex flex-col gap-3">
                  {list.map((a) => (
                    <label
                      key={a.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm",
                        shippingId === a.id ? "border-brand-500 bg-brand-50/50" : "border-ink-200"
                      )}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingId === a.id}
                        onChange={() => setSelected(a.id)}
                        className="mt-1 accent-[#173C8A]"
                      />
                      <span>
                        <span className="block font-semibold text-ink-900">
                          {a.fullName} {a.label && <span className="text-ink-400">· {a.label}</span>}
                        </span>
                        <span className="block text-ink-600">
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                        </span>
                        <span className="block text-ink-500">{a.phone}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {adding || list.length === 0 ? (
                  <div className="mt-4 rounded-2xl bg-ink-25 p-4 ring-1 ring-ink-100 ring-inset">
                    <AddressForm
                      onSaved={(a) => {
                        addresses.set([...list, a])
                        setSelected(a.id)
                        setAdding(false)
                      }}
                      {...(list.length > 0 ? { onCancel: () => setAdding(false) } : {})}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setAdding(true)}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    <Plus size={15} /> Add a new address
                  </button>
                )}
              </section>

              <section className="rounded-3xl border border-ink-100 bg-white p-6" aria-labelledby="pay-h">
                <h2 id="pay-h" className="text-base font-bold text-ink-900">
                  Payment
                </h2>
                <div role="radiogroup" aria-labelledby="pay-h" className="mt-4 flex flex-col gap-3">
                  {METHODS.map((m) => (
                    <label
                      key={m.value}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border p-4 text-sm",
                        m.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                        method === m.value ? "border-brand-500 bg-brand-50/50" : "border-ink-200"
                      )}
                    >
                      <input
                        type="radio"
                        name="payment"
                        disabled={m.disabled}
                        checked={method === m.value}
                        onChange={() => setMethod(m.value)}
                        className="mt-1 accent-[#173C8A]"
                      />
                      <span>
                        <span className="block font-semibold text-ink-900">{m.label}</span>
                        <span className="block text-ink-500">{m.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <label htmlFor="order-notes" className="mt-5 block text-xs font-semibold text-ink-700">
                  Notes for the supplier (optional)
                </label>
                <textarea
                  id="order-notes"
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
                />
              </section>
            </div>

            <div className="h-fit rounded-3xl border border-ink-100 bg-white p-5">
              <h2 className="text-base font-bold text-ink-900">Order Summary</h2>
              <div className="mt-4 flex flex-col gap-3">
                {cart.data.items.map((l) => (
                  <div key={l.id} className="flex justify-between text-sm text-ink-600">
                    <span className="line-clamp-1 pr-3">
                      {l.quantity} × {l.product.title}
                    </span>
                    <span className="shrink-0 font-semibold text-ink-900">{formatCurrency(l.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-ink-100 pt-4 text-sm">
                <div className="flex justify-between text-ink-600">
                  <span>Transport</span>
                  <span className="text-xs text-ink-500">Arranged with supplier</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-ink-900">
                  <span>Total</span>
                  <span>{formatCurrency(cart.data.subtotal)}</span>
                </div>
              </div>
              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600"
                >
                  {error}
                </p>
              )}
              <Button
                size="lg"
                className="mt-5 w-full"
                onClick={() => void place()}
                disabled={placing || !shippingId || !cart.data.canCheckout}
              >
                {placing && <Loader2 size={18} className="animate-spin" />} Place Order
              </Button>
              {!cart.data.canCheckout && (
                <p className="mt-2 text-xs text-danger-600">
                  Some items need attention.{" "}
                  <Link href="/cart" className="font-bold underline">
                    Review your cart
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
