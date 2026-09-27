import type { Prisma } from "@workspace/db"

type Decimalish = Prisma.Decimal | number | string | null | undefined

/** Prisma Decimal → JS number for JSON. Amounts are INR with 2 decimals, well inside double precision. */
export function num(value: Decimalish): number {
  if (value === null || value === undefined) return 0
  return typeof value === "number" ? value : Number(value.toString())
}

export function numOrNull(value: Decimalish): number | null {
  return value === null || value === undefined ? null : num(value)
}

/** Round to paise so sums of line totals never accumulate float noise. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
