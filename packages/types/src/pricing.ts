export interface PriceTier {
  minQty: number
  maxQty: number | null
  unitPrice: number
}

/** Unit price a buyer pays for `quantity`: the cheapest bulk tier that covers it, else the base price. */
export function unitPriceFor(basePrice: number, tiers: readonly PriceTier[], quantity: number): number {
  let best = basePrice
  for (const tier of tiers) {
    if (quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty)) {
      best = Math.min(best, tier.unitPrice)
    }
  }
  return best
}
