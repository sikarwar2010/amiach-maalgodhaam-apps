import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: string; up: boolean }
  hint?: string
}) {
  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft-xs">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon size={18} />
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold",
              trend.up ? "text-success-600" : "text-danger-600"
            )}
          >
            {trend.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900">{value}</div>
      <div className="text-sm text-ink-500">{label}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
    </div>
  )
}

type Tone = "success" | "accent" | "neutral" | "dark" | "brand"

const STATUS_TONE: Record<string, Tone> = {
  APPROVED: "success",
  PUBLISHED: "success",
  DELIVERED: "success",
  ACCEPTED: "success",
  PAID: "success",
  ACTIVE: "success",
  VERIFIED: "success",
  PENDING: "accent",
  PENDING_REVIEW: "accent",
  SUBMITTED: "accent",
  OPEN: "accent",
  QUOTED: "brand",
  CONFIRMED: "brand",
  PROCESSING: "brand",
  SHIPPED: "brand",
  DRAFT: "neutral",
  OUT_OF_STOCK: "neutral",
  REJECTED: "dark",
  SUSPENDED: "dark",
  CANCELLED: "dark",
  ARCHIVED: "dark",
  FAILED: "dark",
  WITHDRAWN: "neutral",
  EXPIRED: "neutral",
  REFUNDED: "neutral",
}

/** One colour language for every status enum in the system. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"}>
      {status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ")}
    </Badge>
  )
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-3xl border border-ink-100 bg-white shadow-soft-xs", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <h2 className="text-base font-bold text-ink-900">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
        <Icon size={22} />
      </span>
      <h3 className="mt-3 text-base font-bold text-ink-900">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-ink-500">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[560px] text-left text-sm">{children}</table>
    </div>
  )
}
export const th = "py-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-ink-400"
export const td = "py-3 pr-4 align-middle text-ink-700"

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl bg-danger-50 p-4 text-sm text-danger-600">
      {message}{" "}
      {onRetry && (
        <button className="font-bold underline" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-ink-100" />
      ))}
    </div>
  )
}
