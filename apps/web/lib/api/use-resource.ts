"use client"

import { useCallback, useEffect, useState } from "react"

import { useApi } from "./client"
import { ApiError, type ApiResult } from "./fetcher"

export interface Resource<T> {
  data: T | null
  meta: ApiResult<T>["meta"]
  loading: boolean
  error: ApiError | null
  reload: () => Promise<void>
  /** Replace the cached value (e.g. with the fresh payload a mutation returned). */
  set: (value: T) => void
}

interface Result<T> {
  key: string
  data: T | null
  meta: ApiResult<T>["meta"]
  error: ApiError | null
}

/**
 * Loads an authenticated API resource for the signed-in user; re-fetches when `path`/`query` change or
 * `reload()` is called. State is only ever set from the request's promise callbacks (never synchronously
 * in the effect), and `loading` is derived from whether the stored result matches the current request.
 */
export function useResource<T>(path: string, query?: object): Resource<T> {
  const { request, isLoaded, isSignedIn } = useApi()
  const queryKey = JSON.stringify(query ?? {})
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<Result<T> | null>(null)
  const key = `${path}?${queryKey}#${version}`

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    request<T>(path, { query: JSON.parse(queryKey) })
      .then((r) => {
        if (!cancelled) setResult({ key, data: r.data, meta: r.meta, error: null })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const error = e instanceof ApiError ? e : new ApiError(0, "NETWORK", "Something went wrong.")
        setResult({ key, data: null, meta: undefined, error })
      })
    return () => {
      cancelled = true
    }
  }, [request, isLoaded, isSignedIn, path, queryKey, key])

  const current = result?.key === key ? result : null
  const loading = !isLoaded || (isSignedIn && current === null)

  const reload = useCallback(async () => {
    setVersion((v) => v + 1)
  }, [])

  const set = useCallback(
    (value: T) => {
      setResult({ key, data: value, meta: current?.meta, error: null })
    },
    [key, current?.meta]
  )

  return {
    data: current?.data ?? null,
    meta: current?.meta,
    loading,
    error: current?.error ?? null,
    reload,
    set,
  }
}
