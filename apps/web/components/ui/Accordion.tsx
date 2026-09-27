"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function AccordionSection({
  title,
  children,
  defaultOpen = true,
  count,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  count?: number
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-ink-100 py-4 first:pt-0 last:border-b-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-bold text-ink-900">
          {title}
          {!!count && (
            <span className="rounded-full bg-accent-50 px-1.5 py-0.5 text-[10px] font-semibold text-accent-700">
              {count}
            </span>
          )}
        </span>
        <ChevronDown size={16} className={cn("text-ink-400 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && <div className="mt-3.5 animate-fade-in">{children}</div>}
    </div>
  )
}

export function CheckboxRow({
  label,
  checked,
  onChange,
  suffix,
}: {
  label: string
  checked: boolean
  onChange: () => void
  suffix?: React.ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1.5 text-sm text-ink-700">
      <span className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
            checked ? "border-accent-500 bg-accent-500" : "border-ink-300 bg-white"
          )}
          style={{ height: "1.125rem", width: "1.125rem" }}
        >
          {checked && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="white"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        {label}
      </span>
      {suffix && <span className="text-xs text-ink-400">{suffix}</span>}
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    </label>
  )
}
