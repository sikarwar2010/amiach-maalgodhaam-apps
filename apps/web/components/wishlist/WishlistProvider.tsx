"use client"

import { usePathname, useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { WishlistItemDto } from "@workspace/types"

import { useApi } from "@/lib/api/client"

interface WishlistContextValue {
  ids: ReadonlySet<string>
  has: (productId: string) => boolean
  toggle: (productId: string) => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue | null>(null)
const NONE: ReadonlySet<string> = new Set()

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { request, isLoaded, isSignedIn } = useApi()
  const router = useRouter()
  const pathname = usePathname()
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(NONE)
  // Signed-out visitors never see a previous user's saved items.
  const ids = isSignedIn ? loaded : NONE

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    request<WishlistItemDto[]>("/api/wishlist")
      .then(({ data }) => {
        if (!cancelled) setLoaded(new Set(data.map((i) => i.product.id)))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [request, isLoaded, isSignedIn])

  const toggle = useCallback(
    async (productId: string) => {
      if (!isSignedIn) {
        router.push(`/login?redirect_url=${encodeURIComponent(pathname)}`)
        return
      }
      const wasActive = ids.has(productId)
      const apply = (add: boolean) =>
        setLoaded((prev) => {
          const next = new Set(prev)
          if (add) next.add(productId)
          else next.delete(productId)
          return next
        })
      // Optimistic update, rolled back if the API refuses.
      apply(!wasActive)
      try {
        if (wasActive) await request(`/api/wishlist/${productId}`, { method: "DELETE" })
        else
          await request("/api/wishlist", {
            method: "POST",
            body: { productId },
          })
      } catch {
        apply(wasActive)
      }
    },
    [ids, isSignedIn, pathname, request, router]
  )

  const value = useMemo<WishlistContextValue>(() => ({ ids, has: (id) => ids.has(id), toggle }), [ids, toggle])
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>")
  return ctx
}
