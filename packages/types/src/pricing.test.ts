import { describe, expect, test } from "bun:test"

import { unitPriceFor } from "./pricing"

const tiers = [
  { minQty: 100, maxQty: 499, unitPrice: 95 },
  { minQty: 500, maxQty: null, unitPrice: 90 },
]

describe("unitPriceFor", () => {
  test("base price below the first tier", () => expect(unitPriceFor(100, tiers, 50)).toBe(100))
  test("picks the covering tier", () => {
    expect(unitPriceFor(100, tiers, 100)).toBe(95)
    expect(unitPriceFor(100, tiers, 499)).toBe(95)
    expect(unitPriceFor(100, tiers, 500)).toBe(90)
    expect(unitPriceFor(100, tiers, 10_000)).toBe(90)
  })
  test("a tier never raises the price", () => {
    expect(unitPriceFor(80, tiers, 100)).toBe(80)
  })
})
