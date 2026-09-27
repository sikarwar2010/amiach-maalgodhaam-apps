"use client"

import { useMemo } from "react"

import { useSession } from "../auth/use-session"
import { PUBLIC_API_URL } from "../config"
import { apiRequest, type ApiOptions, type ApiResult } from "./fetcher"

/** Browser-side API access: attaches the caller's Clerk token (the API, not this code, decides what it may do). */
export function useApi() {
  const session = useSession()
  const { getToken, isLoaded, isSignedIn } = session
  return useMemo(
    () => ({
      isLoaded,
      isSignedIn,
      getToken,
      request: async <T>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> =>
        apiRequest<T>(PUBLIC_API_URL, path, {
          ...options,
          token: await getToken(),
        }),
    }),
    [getToken, isLoaded, isSignedIn]
  )
}
