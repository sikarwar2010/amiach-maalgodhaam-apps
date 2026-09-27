import { describe, expect, test } from "bun:test"

import { canAssignRole, canSelfSelect, hasRole, isBackOffice, roleFromMetadata } from "./index"

describe("hasRole", () => {
  test("PUBLIC never passes", () => {
    expect(hasRole("PUBLIC", ["BUYER"])).toBe(false)
  })
  test("SUPER_ADMIN always passes", () => {
    expect(hasRole("SUPER_ADMIN", ["VENDOR"])).toBe(true)
  })
  test("BUYER cannot act as VENDOR or ADMIN", () => {
    expect(hasRole("BUYER", ["VENDOR"])).toBe(false)
    expect(hasRole("BUYER", ["ADMIN"])).toBe(false)
  })
  test("VENDOR cannot reach ADMIN", () => {
    expect(hasRole("VENDOR", ["ADMIN"])).toBe(false)
  })
})

describe("roles", () => {
  test("only back-office roles are back office", () => {
    expect(isBackOffice("STAFF")).toBe(true)
    expect(isBackOffice("ADMIN")).toBe(true)
    expect(isBackOffice("VENDOR")).toBe(false)
    expect(isBackOffice("PUBLIC")).toBe(false)
  })
  test("privileged roles cannot be self-selected", () => {
    expect(canSelfSelect("VENDOR")).toBe(true)
    expect(canSelfSelect("BUYER")).toBe(true)
    expect(canSelfSelect("ADMIN")).toBe(false)
    expect(canSelfSelect("SUPER_ADMIN")).toBe(false)
    expect(canSelfSelect(undefined)).toBe(false)
  })
  test("admin cannot mint other admins; super admin can", () => {
    expect(canAssignRole("ADMIN", "ADMIN")).toBe(false)
    expect(canAssignRole("ADMIN", "SUPER_ADMIN")).toBe(false)
    expect(canAssignRole("ADMIN", "STAFF")).toBe(true)
    expect(canAssignRole("SUPER_ADMIN", "ADMIN")).toBe(true)
    expect(canAssignRole("VENDOR", "BUYER")).toBe(false)
  })
  test("metadata parsing falls back to BUYER", () => {
    expect(roleFromMetadata({ role: "VENDOR" })).toBe("VENDOR")
    expect(roleFromMetadata({ role: "root" })).toBe("BUYER")
    expect(roleFromMetadata(null)).toBe("BUYER")
    expect(roleFromMetadata("ADMIN")).toBe("BUYER")
  })
})
