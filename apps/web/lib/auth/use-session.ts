"use client"

import { useAuth, useClerk } from "@clerk/nextjs"
import { useCallback, useMemo } from "react"

import { clerkEnabled } from "../config"

export interface Session {
  isLoaded: boolean
  isSignedIn: boolean
  /** Short-lived bearer token for the Hono API; null when signed out. */
  getToken: () => Promise<string | null>
  signOut: () => Promise<void>
}

function useClerkSession(): Session {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const clerk = useClerk()
  // These identities must be stable: every data-loading effect depends on them, so a new function on each
  // render would re-fetch on each render (an endless request loop).
  const stableGetToken = useCallback(() => getToken(), [getToken])
  const signOut = useCallback(() => clerk.signOut({ redirectUrl: "/" }), [clerk])
  const signedIn = Boolean(isSignedIn)
  return useMemo(
    () => ({ isLoaded, isSignedIn: signedIn, getToken: stableGetToken, signOut }),
    [isLoaded, signedIn, stableGetToken, signOut]
  )
}

const anonymous: Session = {
  isLoaded: true,
  isSignedIn: false,
  getToken: async () => null,
  signOut: async () => undefined,
}

function useNoSession(): Session {
  return anonymous
}

// `clerkEnabled` is fixed at build time, so exactly one implementation is used for the app's lifetime
// and hook order stays stable.
export const useSession: () => Session = clerkEnabled ? useClerkSession : useNoSession
