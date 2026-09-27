import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

/** Server-rendered pagination: plain links, so it works without JavaScript and is crawlable. */
export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number
  totalPages: number
  basePath: string
  params: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null

  const href = (p: number) => {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v)
    if (p > 1) qs.set("page", String(p))
    const s = qs.toString()
    return s ? `${basePath}?${s}` : basePath
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  )
  const base =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors"
  const idle = "border-ink-200 text-ink-700 hover:bg-ink-50"

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} aria-label="Previous page" className={cn(base, idle)}>
          <ChevronLeft size={16} />
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - (pages[i - 1] ?? 0) > 1 && <span className="px-1 text-ink-400">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(base, p === page ? "border-brand-700 bg-brand-800 text-white" : idle)}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} aria-label="Next page" className={cn(base, idle)}>
          <ChevronRight size={16} />
        </Link>
      )}
    </nav>
  )
}
