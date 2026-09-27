"use client"

import Link from "next/link"
import { useState } from "react"
import { Heart, ShoppingCart } from "lucide-react"
import type { WishlistItemDto } from "@workspace/types"

import { MaterialCard } from "@/components/cards/MaterialCard"
import { Button } from "@/components/ui/Button"
import { notifyCartChanged } from "@/components/session/MeProvider"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { useResource } from "@/lib/api/use-resource"

export function WishlistView() {
  const { request } = useApi()
  const list = useResource<WishlistItemDto[]>("/api/wishlist")
  const [message, setMessage] = useState<{
    tone: "ok" | "error"
    text: string
  } | null>(null)

  const moveToCart = async (item: WishlistItemDto) => {
    setMessage(null)
    try {
      await request(`/api/wishlist/${item.product.id}/move-to-cart`, {
        method: "POST",
        body: {},
      })
      list.set((list.data ?? []).filter((i) => i.id !== item.id))
      notifyCartChanged()
      setMessage({
        tone: "ok",
        text: `${item.product.title} moved to your cart.`,
      })
    } catch (e) {
      setMessage({
        tone: "error",
        text: e instanceof ApiError ? e.message : "Could not move this item.",
      })
    }
  }

  const remove = async (item: WishlistItemDto) => {
    try {
      await request(`/api/wishlist/${item.product.id}`, { method: "DELETE" })
      list.set((list.data ?? []).filter((i) => i.id !== item.id))
    } catch {
      setMessage({ tone: "error", text: "Could not remove this item." })
    }
  }

  if (list.loading) return <div className="mt-8 h-64 animate-pulse rounded-3xl bg-ink-100" aria-label="Loading" />
  if (list.error) {
    return (
      <p role="alert" className="mt-8 rounded-3xl bg-danger-50 p-6 text-sm text-danger-600">
        {list.error.message}
      </p>
    )
  }

  const items = list.data ?? []
  if (items.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink-200 py-24 text-center">
        <Heart size={32} className="text-ink-300" />
        <h3 className="mt-4 text-lg font-bold text-ink-900">Your wishlist is empty</h3>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Save materials you&apos;re interested in to compare and track pricing over time.
        </p>
        <Button href="/products" className="mt-5">
          Explore Materials
        </Button>
      </div>
    )
  }

  return (
    <>
      <p className="mt-2 text-ink-500">
        {items.length} saved {items.length === 1 ? "material" : "materials"}
      </p>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
            message.tone === "ok" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-600"
          }`}
        >
          {message.text}{" "}
          {message.tone === "ok" && (
            <Link href="/cart" className="font-bold underline">
              View cart
            </Link>
          )}
        </p>
      )}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-2">
            <MaterialCard listing={item.product} />
            <div className="flex gap-2">
              {item.product.dealType === "BUY_NOW" && item.product.availableQuantity > 0 && (
                <Button size="sm" className="flex-1" onClick={() => void moveToCart(item)}>
                  <ShoppingCart size={14} /> Move to cart
                </Button>
              )}
              <Button size="sm" variant="outline" className="flex-1" onClick={() => void remove(item)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
