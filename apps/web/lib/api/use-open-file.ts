"use client"

import { useCallback } from "react"

import { useSession } from "../auth/use-session"

/**
 * Private uploads (identity/tax documents) need the caller's token, which a plain <a href> cannot send.
 * This fetches the file with the token and opens it from a short-lived blob URL.
 */
export function useOpenFile() {
  const { getToken } = useSession()
  return useCallback(
    async (url: string): Promise<void> => {
      const token = await getToken()
      const res = await fetch(url, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("You don't have access to this file, or it no longer exists.")
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, "_blank", "noopener,noreferrer")
      // Give the new tab time to load it before releasing the blob.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    },
    [getToken]
  )
}
