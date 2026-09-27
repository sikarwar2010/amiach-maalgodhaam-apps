import { formatCurrency, savingsPercent } from "@/lib/utils"
import { Badge } from "./Badge"

export function PriceDisplay({
  marketValue,
  price,
  priceLabel = "MaalGodaam Price",
  size = "md",
}: {
  marketValue: number
  price: number
  priceLabel?: string
  size?: "sm" | "md" | "lg"
}) {
  const savings = savingsPercent(marketValue, price)

  const priceSize = size === "lg" ? "text-3xl sm:text-4xl" : size === "sm" ? "text-lg" : "text-2xl"

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium tracking-wide text-ink-500 uppercase">Market Value</span>
        <span className="text-sm text-ink-400 line-through">{formatCurrency(marketValue)}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium tracking-wide text-ink-500 uppercase">{priceLabel}</div>
          <div className={`font-extrabold text-brand-800 ${priceSize}`}>{formatCurrency(price)}</div>
        </div>
        {savings > 0 && <Badge tone="accent">Save {savings}%</Badge>}
      </div>
    </div>
  )
}
