import { describe, expect, test } from "bun:test"

import { subjectFromVerification } from "../src/identity/clerk"

describe("subjectFromVerification", () => {
  test("bare claims (current @clerk/backend)", () => {
    expect(subjectFromVerification({ sub: "user_1", sid: "sess_1", azp: "http://localhost:3000" })).toBe("user_1")
  })
  test("legacy { data } wrapper", () => {
    expect(subjectFromVerification({ data: { sub: "user_2" } })).toBe("user_2")
  })
  test("errors, missing or non-string subjects, and junk are rejected", () => {
    expect(subjectFromVerification({ errors: [new Error("expired")] })).toBeNull()
    expect(subjectFromVerification({ data: { sub: "" } })).toBeNull()
    expect(subjectFromVerification({ sub: 42 })).toBeNull()
    expect(subjectFromVerification({})).toBeNull()
    expect(subjectFromVerification(null)).toBeNull()
    expect(subjectFromVerification("token")).toBeNull()
  })
})
