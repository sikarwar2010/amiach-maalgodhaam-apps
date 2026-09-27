import Link from "next/link"
import { ChevronRight } from "lucide-react"

export interface Crumb {
  label: string
  /** Omit on the current page. */
  href?: string
}

/** Where-am-I trail. The last crumb is the current page and is not a link. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-ink-400">
      <Link href="/" className="hover:text-ink-700">
        Home
      </Link>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <ChevronRight size={12} aria-hidden />
          {item.href ? (
            <Link href={item.href} className="hover:text-ink-700">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-ink-600">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
