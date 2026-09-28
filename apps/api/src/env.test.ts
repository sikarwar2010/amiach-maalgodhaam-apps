import { describe, expect, test } from "bun:test"

import { loadEnv } from "./env"

const base = { DATABASE_URL: "postgresql://u:p@db:5432/x" }

describe("WEB_ORIGIN", () => {
  test("trailing slashes and paths are normalised to the bare origin browsers and Clerk `azp` use", () => {
    const env = loadEnv({ ...base, WEB_ORIGIN: "https://www.maalgodaam.com/, https://maalgodaam.com/shop " })
    expect(env.webOrigins).toEqual(["https://www.maalgodaam.com", "https://maalgodaam.com"])
  })

  test("a value that is not an http(s) origin fails at startup instead of silently rejecting every session", () => {
    expect(() => loadEnv({ ...base, WEB_ORIGIN: "www.maalgodaam.com" })).toThrow(/WEB_ORIGIN/)
  })

  test("an empty list fails at startup", () => {
    expect(() => loadEnv({ ...base, WEB_ORIGIN: " , " })).toThrow(/WEB_ORIGIN/)
  })
})

describe("PUBLIC_API_URL", () => {
  test("a trailing slash does not produce `//api/files/...` URLs", () => {
    expect(loadEnv({ ...base, PUBLIC_API_URL: "https://api.maalgodaam.com/" }).PUBLIC_API_URL).toBe(
      "https://api.maalgodaam.com"
    )
  })
})
