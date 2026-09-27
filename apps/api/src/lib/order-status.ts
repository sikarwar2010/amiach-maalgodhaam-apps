import type { OrderStatus } from "@workspace/types"

/** Vendor-driven line-item transitions. Anything not listed is rejected. */
const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT[from].includes(to)
}

const PROGRESS: Record<OrderStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: -1,
  REFUNDED: -1,
}

/**
 * An order is as far along as its slowest live item. If everything is cancelled the order is
 * cancelled; cancelled items are ignored otherwise.
 */
export function deriveOrderStatus(itemStatuses: readonly OrderStatus[]): OrderStatus {
  const live = itemStatuses.filter((s) => s !== "CANCELLED" && s !== "REFUNDED")
  if (live.length === 0) return itemStatuses.length ? "CANCELLED" : "PENDING"
  return live.reduce((min, s) => (PROGRESS[s] < PROGRESS[min] ? s : min))
}

export function newOrderNumber(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "")
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0")
  return `MG-${date}-${rand}`
}
