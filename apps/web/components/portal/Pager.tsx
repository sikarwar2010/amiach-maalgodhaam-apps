"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import type { PageMeta } from "@workspace/types"

export function Pager({ meta, onPage }: { meta: PageMeta | undefined; onPage: (page: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null
  const btn =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-50 disabled:opacity-40"
  return (
    <nav aria-label="Pagination" className="mt-5 flex items-center justify-between text-sm text-ink-500">
      <span>
        Page {meta.page} of {meta.totalPages} · {meta.total} total
      </span>
      <div className="flex gap-2">
        <button
          className={btn}
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className={btn}
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}
