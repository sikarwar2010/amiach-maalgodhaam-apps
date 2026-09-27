"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { CartDto, SessionUser } from "@workspace/types"

import { useApi } from "@/lib/api/client"

interface MeContextValue {
  /** The signed-in user as the API describes them (display only — the API authorizes every action). */
  me: SessionUser | null
  /** Items in the cart, 0 when signed out. */
  cartCount: number
  loaded: boolean
}

const MeContext = createContext<MeContextValue | null>(null)

interface Snapshot {
  me: SessionUser | null
  cartCount: number
}

const EMPTY: Snapshot = { me: null, cartCount: 0 }

export function MeProvider({ children }: { children: React.ReactNode }) {
  const { request, isLoaded, isSignedIn } = useApi()
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    Promise.all([
      request<SessionUser>("/api/me").then((r) => r.data),
      request<CartDto>("/api/cart").then((r) => r.data.itemCount),
    ])
      .then(([me, cartCount]) => {
        if (!cancelled) setSnapshot({ me, cartCount })
      })
      .catch(() => {
        if (!cancelled) setSnapshot(EMPTY)
      })
    return () => {
      cancelled = true
    }
  }, [request, isLoaded, isSignedIn, tick])

  // Any component that changes the cart dispatches this so the header badge stays right.
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1)
    window.addEventListener("mg:cart-changed", onChange)
    return () => window.removeEventListener("mg:cart-changed", onChange)
  }, [])

  const value = useMemo<MeContextValue>(() => {
    // Signed-out visitors never see a previous user's data, even before the effect settles.
    const current = isSignedIn && snapshot ? snapshot : EMPTY
    return {
      ...current,
      loaded: isLoaded && (!isSignedIn || snapshot !== null),
    }
  }, [snapshot, isLoaded, isSignedIn])

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>
}

export function useMe(): MeContextValue {
  const ctx = useContext(MeContext)
  if (!ctx) throw new Error("useMe must be used inside <MeProvider>")
  return ctx
}

export function notifyCartChanged(): void {
  window.dispatchEvent(new Event("mg:cart-changed"))
}
