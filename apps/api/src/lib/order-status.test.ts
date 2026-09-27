import { describe, expect, test } from "bun:test"

import { canTransition, deriveOrderStatus, newOrderNumber } from "./order-status"

describe("order status", () => {
  test("only forward transitions are allowed", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true)
    expect(canTransition("PENDING", "SHIPPED")).toBe(false)
    expect(canTransition("DELIVERED", "CANCELLED")).toBe(false)
    expect(canTransition("SHIPPED", "CANCELLED")).toBe(false)
  })
  test("order status is the slowest live item", () => {
    expect(deriveOrderStatus(["SHIPPED", "CONFIRMED"])).toBe("CONFIRMED")
    expect(deriveOrderStatus(["DELIVERED", "DELIVERED"])).toBe("DELIVERED")
    expect(deriveOrderStatus(["CANCELLED", "SHIPPED"])).toBe("SHIPPED")
    expect(deriveOrderStatus(["CANCELLED", "CANCELLED"])).toBe("CANCELLED")
  })
  test("order numbers look right", () => {
    expect(newOrderNumber(new Date("2026-01-05T00:00:00Z"))).toMatch(/^MG-20260105-[A-Z0-9]{6}$/)
  })
})
