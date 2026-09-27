"use client"

import { Minus, Plus } from "lucide-react"

export function QuantitySelector({
  value,
  onChange,
  min,
  max,
  step = 1,
  unitLabel,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  unitLabel: string
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 rounded-xl border border-ink-200 p-1">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          aria-label="Decrease quantity"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-30"
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
          className="w-16 border-0 bg-transparent text-center text-sm font-semibold text-ink-900 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          aria-label="Increase quantity"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 disabled:opacity-30"
        >
          <Plus size={14} />
        </button>
      </div>
      <span className="text-xs text-ink-500">{unitLabel}</span>
    </div>
  )
}
