"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Heart, Loader2, MessageSquare, PackageSearch, ShieldCheck, ShoppingCart, Zap } from "lucide-react"
import type { ProductDetailDto } from "@workspace/types"

import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { QuantitySelector } from "@/components/ui/QuantitySelector"
import { notifyCartChanged } from "@/components/session/MeProvider"
import { useWishlist } from "@/components/wishlist/WishlistProvider"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { unitLabelSingular, unitLabels } from "@/lib/labels"
import { cn, formatCurrency } from "@/lib/utils"

const field =
  "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none"

export function PricingPanel({ listing }: { listing: ProductDetailDto }) {
  const router = useRouter()
  const pathname = usePathname()
  const { request, isSignedIn } = useApi()
  const wishlist = useWishlist()

  const [quantity, setQuantity] = useState(Math.min(listing.minOrderQty, Math.max(listing.availableQuantity, 1)))
  const [busy, setBusy] = useState<null | "cart" | "buy" | "quote">(null)
  const [notice, setNotice] = useState<{
    tone: "ok" | "error"
    text: string
    action?: { href: string; label: string }
  } | null>(null)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quote, setQuote] = useState({
    targetUnitPrice: "",
    deliveryCity: "",
    neededBy: "",
    message: "",
  })

  const unit = unitLabels[listing.unit]
  const unitSingular = unitLabelSingular[listing.unit]
  const soldOut = listing.status === "OUT_OF_STOCK" || listing.availableQuantity <= 0
  const canBuyNow = listing.dealType === "BUY_NOW"
  const wishlisted = wishlist.has(listing.id)
  const step = listing.unit === "SQ_FT" || listing.unit === "RUNNING_FT" ? 10 : 1

  const requireSignIn = (): boolean => {
    if (isSignedIn) return true
    router.push(`/login?redirect_url=${encodeURIComponent(pathname)}`)
    return false
  }

  const describeError = (error: unknown): string =>
    error instanceof ApiError ? error.message : "Something went wrong. Please try again."

  const addToCart = async (goToCheckout: boolean) => {
    if (!requireSignIn()) return
    setBusy(goToCheckout ? "buy" : "cart")
    setNotice(null)
    try {
      await request("/api/cart/items", {
        method: "POST",
        body: { productId: listing.id, quantity },
      })
      notifyCartChanged()
      if (goToCheckout) {
        router.push("/checkout")
        return
      }
      setNotice({
        tone: "ok",
        text: `Added ${quantity} ${unit} to your cart.`,
        action: { href: "/cart", label: "View cart" },
      })
    } catch (error) {
      setNotice({ tone: "error", text: describeError(error) })
    } finally {
      setBusy(null)
    }
  }

  const submitQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireSignIn()) return
    setBusy("quote")
    setNotice(null)
    try {
      const target = Number(quote.targetUnitPrice)
      await request("/api/b2b/inquiries", {
        method: "POST",
        body: {
          productId: listing.id,
          title: `Quote request: ${listing.title}`.slice(0, 200),
          description: quote.message.trim() || `Please quote ${quantity} ${unit} of ${listing.title}.`,
          quantity,
          unit: listing.unit,
          ...(quote.targetUnitPrice && Number.isFinite(target) && target > 0 ? { targetUnitPrice: target } : {}),
          deliveryCity: quote.deliveryCity.trim(),
          ...(quote.neededBy ? { neededBy: new Date(quote.neededBy).toISOString() } : {}),
        },
      })
      setQuoteOpen(false)
      setNotice({
        tone: "ok",
        text: "Quote request sent. The supplier will respond with a price.",
        action: { href: "/buyer/inquiries", label: "Track it" },
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setNotice({
          tone: "error",
          text: error.message,
          action: { href: "/buyer/profile", label: "Add business details" },
        })
      } else if (error instanceof ApiError && error.details.length) {
        setNotice({
          tone: "error",
          text: error.details.map((d) => `${d.path}: ${d.message}`).join(" · "),
        })
      } else {
        setNotice({ tone: "error", text: describeError(error) })
      }
    } finally {
      setBusy(null)
    }
  }

  const spin = (which: typeof busy) => (busy === which ? <Loader2 size={18} className="animate-spin" /> : null)

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft-sm sm:p-6">
      <div className="flex items-center justify-between">
        {listing.marketValue ? (
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium tracking-wide text-ink-500 uppercase">Market Value</span>
            <span className="text-sm text-ink-400 line-through">{formatCurrency(listing.marketValue)}</span>
          </div>
        ) : (
          <span />
        )}
        {listing.discountPct > 0 && <Badge tone="accent">Save {listing.discountPct}%</Badge>}
      </div>

      <div className="mt-2">
        <div className="text-xs font-medium tracking-wide text-ink-500 uppercase">MaalGodaam Price</div>
        <div className="text-4xl font-extrabold text-brand-800">
          {formatCurrency(listing.price)}
          <span className="ml-1.5 text-base font-semibold text-ink-500">/ {unitSingular}</span>
        </div>
        {!soldOut && (
          <div className="mt-1 text-sm text-ink-500">
            {quantity} {unit} ={" "}
            <span className="font-semibold text-ink-800">{formatCurrency(listing.price * quantity)}</span>
          </div>
        )}
      </div>

      {listing.bulkPrices.length > 0 && (
        <div className="mt-4 rounded-2xl bg-accent-50 p-3.5 text-sm text-accent-900">
          <div className="text-xs font-bold tracking-wide text-accent-700 uppercase">Bulk pricing (B2B quotes)</div>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {listing.bulkPrices.map((tier) => (
              <li key={tier.id} className="flex justify-between gap-3">
                <span>
                  {tier.minQty.toLocaleString("en-IN")}
                  {tier.maxQty ? `–${tier.maxQty.toLocaleString("en-IN")}` : "+"} {unit}
                </span>
                <span className="font-semibold">
                  {formatCurrency(tier.unitPrice)} / {unitSingular}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {soldOut ? (
        <p className="mt-5 rounded-xl bg-ink-100 px-3.5 py-3 text-sm font-medium text-ink-700">
          This lot is currently sold out. Save it to your wishlist or ask the supplier about restocking.
        </p>
      ) : (
        <div className="mt-5">
          <label className="text-xs font-medium text-ink-600" htmlFor="pp-qty">
            Quantity
          </label>
          <div className="mt-1.5">
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              min={Math.min(listing.minOrderQty, listing.availableQuantity)}
              max={listing.availableQuantity}
              step={step}
              unitLabel={`${unit} · MOQ ${listing.minOrderQty.toLocaleString("en-IN")}`}
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {!soldOut && canBuyNow && (
          <>
            <Button size="lg" onClick={() => void addToCart(true)} disabled={busy !== null}>
              {spin("buy") ?? <Zap size={18} />} Buy Now
            </Button>
            <Button size="lg" variant="brand" onClick={() => void addToCart(false)} disabled={busy !== null}>
              {spin("cart") ?? <ShoppingCart size={18} />} Add to Cart
            </Button>
          </>
        )}

        {listing.dealType === "REQUEST_QUOTE" && (
          <Button size="lg" onClick={() => setQuoteOpen((v) => !v)} aria-expanded={quoteOpen}>
            <MessageSquare size={18} /> Request Quote
          </Button>
        )}
        {listing.dealType === "BULK_DEAL" && (
          <Button size="lg" onClick={() => setQuoteOpen((v) => !v)} aria-expanded={quoteOpen}>
            <PackageSearch size={18} /> Start Bulk Deal
          </Button>
        )}
        {listing.dealType === "CONTACT_SUPPLIER" && (
          <Button size="lg" onClick={() => setQuoteOpen((v) => !v)} aria-expanded={quoteOpen}>
            <MessageSquare size={18} /> Contact Supplier
          </Button>
        )}
        {canBuyNow && (
          <Button size="lg" variant="outline" onClick={() => setQuoteOpen((v) => !v)} aria-expanded={quoteOpen}>
            Request a Bulk Quote
          </Button>
        )}

        <button
          type="button"
          onClick={() => void wishlist.toggle(listing.id)}
          aria-pressed={wishlisted}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors",
            wishlisted
              ? "border-danger-200 bg-danger-50 text-danger-600"
              : "border-ink-200 text-ink-900 hover:border-ink-300 hover:bg-ink-50"
          )}
        >
          <Heart size={16} className={wishlisted ? "fill-danger-500 text-danger-500" : ""} />
          {wishlisted ? "Saved to Wishlist" : "Add to Wishlist"}
        </button>
      </div>

      {quoteOpen && (
        <form
          onSubmit={submitQuote}
          className="mt-5 flex flex-col gap-3 rounded-2xl bg-ink-25 p-4 ring-1 ring-ink-100 ring-inset"
        >
          <p className="text-sm font-bold text-ink-900">
            Quote request for {quantity} {unit}
          </p>
          <div>
            <label className="text-xs font-medium text-ink-600" htmlFor="q-target">
              Target price per {unitSingular} (optional)
            </label>
            <input
              id="q-target"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={quote.targetUnitPrice}
              onChange={(e) => setQuote({ ...quote, targetUnitPrice: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600" htmlFor="q-city">
              Delivery city
            </label>
            <input
              id="q-city"
              required
              value={quote.deliveryCity}
              onChange={(e) => setQuote({ ...quote, deliveryCity: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600" htmlFor="q-date">
              Needed by (optional)
            </label>
            <input
              id="q-date"
              type="date"
              value={quote.neededBy}
              onChange={(e) => setQuote({ ...quote, neededBy: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600" htmlFor="q-msg">
              Message (optional)
            </label>
            <textarea
              id="q-msg"
              rows={3}
              maxLength={2000}
              value={quote.message}
              onChange={(e) => setQuote({ ...quote, message: e.target.value })}
              className={field}
            />
          </div>
          <Button type="submit" disabled={busy !== null}>
            {spin("quote")} Send request
          </Button>
          <p className="text-xs text-ink-500">
            Quotes are for business buyers — you&apos;ll be asked for your GSTIN if it&apos;s missing.
          </p>
        </form>
      )}

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={cn(
            "mt-4 animate-fade-in rounded-xl px-3.5 py-2.5 text-sm font-medium",
            notice.tone === "ok" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-600"
          )}
        >
          {notice.text}{" "}
          {notice.action && (
            <Link href={notice.action.href} className="font-bold underline">
              {notice.action.label}
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-2xl bg-brand-50 p-3.5 text-xs text-brand-800">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        Protected by MaalGodaam Buyer Support — listing details are verified against the supplier&apos;s submission.
      </div>
    </div>
  )
}
