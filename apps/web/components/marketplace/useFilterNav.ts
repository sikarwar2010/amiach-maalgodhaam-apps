"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"

/** URL-as-state for the catalogue: every change rewrites the query string and resets to page 1. */
export function useFilterNav() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const push = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString())
      mutate(next)
      next.delete("page")
      const qs = next.toString()
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
    },
    [router, pathname, searchParams]
  )

  const setParam = useCallback(
    (key: string, value: string | undefined) =>
      push((p) => {
        if (value === undefined || value === "") p.delete(key)
        else p.set(key, value)
      }),
    [push]
  )

  const toggleListParam = useCallback(
    (key: string, value: string) =>
      push((p) => {
        const current = (p.get(key) ?? "").split(",").filter(Boolean)
        const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
        if (next.length) p.set(key, next.join(","))
        else p.delete(key)
      }),
    [push]
  )

  const clearAll = useCallback(
    (keep: string[] = ["q", "sort"]) =>
      push((p) => {
        for (const key of [...p.keys()]) if (!keep.includes(key)) p.delete(key)
      }),
    [push]
  )

  return { searchParams, pending, setParam, toggleListParam, clearAll, push }
}
