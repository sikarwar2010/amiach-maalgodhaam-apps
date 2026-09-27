"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Clock, Flame, Loader2, MapPin, Package, Search, Sparkles, Tag, X } from "lucide-react"
import type { CategoryDto, LocationDto, SearchResultDto } from "@workspace/types"

import { apiRequest } from "@/lib/api/fetcher"
import { PUBLIC_API_URL } from "@/lib/config"
import { trendingMaterials } from "@/lib/content"
import { slugifyCity } from "@/lib/catalogue-filters"
import { formatCurrency } from "@/lib/utils"

const RECENT_KEY = "mg_recent_searches"
const RECENT_EVENT = "mg:recent-searches"

function subscribeRecent(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(RECENT_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(RECENT_EVENT, onChange)
  }
}

function recentSnapshot(): string {
  try {
    return window.localStorage.getItem(RECENT_KEY) ?? ""
  } catch {
    return ""
  }
}

function parseRecent(raw: string): string[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, 5) : []
  } catch {
    return []
  }
}

/** Recent searches live in localStorage (a per-browser convenience); reading it through a store keeps SSR and hydration consistent. */
function useRecentSearches(): string[] {
  const raw = useSyncExternalStore(subscribeRecent, recentSnapshot, () => "")
  return useMemo(() => parseRecent(raw), [raw])
}

function saveRecent(term: string): void {
  try {
    const current = parseRecent(recentSnapshot())
    const next = [term, ...current.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 5)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(RECENT_EVENT))
  } catch {
    /* storage unavailable, recent searches are optional */
  }
}

export function SmartSearch({
  open,
  onClose,
  categories,
  locations,
}: {
  open: boolean
  onClose: () => void
  categories: CategoryDto[]
  locations: LocationDto[]
}) {
  const [query, setQuery] = useState("")
  const recent = useRecentSearches()
  const [fetched, setFetched] = useState<{
    term: string
    data: SearchResultDto
  } | null>(null)
  const term = query.trim()
  // A stored result only counts while it belongs to the text currently in the box.
  const results = fetched && fetched.term === term ? fetched.data : null
  const loading = term.length >= 2 && results === null
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      clearTimeout(t)
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  // Live suggestions from the API (debounced; stale responses are discarded).
  useEffect(() => {
    if (term.length < 2) return
    const controller = new AbortController()
    const t = setTimeout(() => {
      apiRequest<SearchResultDto>(PUBLIC_API_URL, "/api/search", {
        query: { q: term, limit: 5 },
        signal: controller.signal,
      })
        .then((r) => setFetched({ term, data: r.data }))
        .catch(() => undefined)
    }, 220)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [term])

  if (!open) return null

  const runSearch = (term: string) => {
    saveRecent(term)
    router.push(`/search?q=${encodeURIComponent(term)}`)
    onClose()
  }
  const go = (href: string) => {
    router.push(href)
    onClose()
  }
  const chip =
    "inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto px-4 pt-24 pb-10 sm:pt-28"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <button
        aria-label="Close search"
        onClick={onClose}
        className="fixed inset-0 animate-fade-in bg-ink-950/60 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-3xl animate-scale-in rounded-3xl bg-white shadow-soft-xl ring-1 ring-ink-100 ring-inset">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            if (query.trim()) runSearch(query.trim())
          }}
          className="flex items-center gap-3 border-b border-ink-100 px-5 py-4 sm:px-6"
        >
          <Search size={20} className="shrink-0 text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            aria-label="Search materials"
            placeholder="What are you looking for? e.g. marble tiles, plywood, sanitaryware..."
            className="w-full bg-transparent text-base text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          {loading && <Loader2 size={17} className="shrink-0 animate-spin text-ink-400" />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={17} />
          </button>
        </form>

        <div className="flex flex-wrap gap-2 border-b border-ink-100 px-5 py-3 sm:px-6">
          <Link href="/categories" onClick={onClose} className={chip}>
            <Tag size={13} /> Category
          </Link>
          <Link href="/deals" onClick={onClose} className={chip}>
            <MapPin size={13} /> Location
          </Link>
          <Link href="/products" onClick={onClose} className={chip}>
            <Package size={13} /> Material
          </Link>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-5 sm:px-6">
          {results ? (
            <div className="flex flex-col gap-6">
              {results.products.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold tracking-wide text-ink-500 uppercase">Materials</h3>
                  <ul className="flex flex-col divide-y divide-ink-100">
                    {results.products.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => go(`/products/${p.slug}`)}
                          className="flex w-full items-center gap-3 py-2.5 text-left hover:text-brand-700"
                        >
                          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                            {p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink-900">{p.title}</span>
                            <span className="block truncate text-xs text-ink-500">
                              {p.vendor.businessName} · {p.city}
                            </span>
                          </span>
                          <span className="text-sm font-bold text-brand-800">{formatCurrency(p.price)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {results.categories.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold tracking-wide text-ink-500 uppercase">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {results.categories.map((c) => (
                      <button key={c.id} onClick={() => go(`/categories/${c.slug}`)} className={chip}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {results.vendors.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold tracking-wide text-ink-500 uppercase">Suppliers</h3>
                  <div className="flex flex-wrap gap-2">
                    {results.vendors.map((v) => (
                      <button key={v.id} onClick={() => go(`/vendors/${v.slug}`)} className={chip}>
                        {v.businessName}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <button
                onClick={() => runSearch(query.trim())}
                className="rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
              >
                See all results for &ldquo;{query.trim()}&rdquo;
              </button>
              {results.products.length + results.categories.length + results.vendors.length === 0 && (
                <p className="text-sm text-ink-500">
                  Nothing matches yet.{" "}
                  <Link href="/post-requirement" onClick={onClose} className="font-semibold text-brand-700">
                    Post a requirement
                  </Link>{" "}
                  and suppliers will come to you.
                </p>
              )}
            </div>
          ) : (
            <>
              {recent.length > 0 && (
                <section className="mb-6">
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                    <Clock size={13} /> Recent Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((s) => (
                      <button
                        key={s}
                        onClick={() => runSearch(s)}
                        className="rounded-full bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {categories.length > 0 && (
                <section className="mb-6">
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                    <Sparkles size={13} /> Popular Categories
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => go(`/categories/${c.slug}`)}
                        className="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5 text-left text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                      >
                        {c.name}
                        <span className="text-xs text-ink-400">{c.productCount.toLocaleString("en-IN")}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="mb-6">
                <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                  <Flame size={13} className="text-accent-500" /> Trending Materials
                </h3>
                <div className="flex flex-col divide-y divide-ink-100">
                  {trendingMaterials.map((s) => (
                    <button
                      key={s}
                      onClick={() => runSearch(s)}
                      className="flex items-center justify-between py-2.5 text-left text-sm text-ink-700 hover:text-brand-700"
                    >
                      {s}
                      <span className="text-xs text-ink-400">→</span>
                    </button>
                  ))}
                </div>
              </section>

              {locations.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
                    <MapPin size={13} /> Popular Locations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {locations.slice(0, 6).map((l) => (
                      <button
                        key={`${l.city}-${l.state}`}
                        onClick={() => go(`/deals/${slugifyCity(l.city)}`)}
                        className={chip}
                      >
                        {l.city}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
