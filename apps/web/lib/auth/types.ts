/** Which onboarding track a visitor picked on /register (URL segments, not permissions). */
export type OnboardRole = "customer" | "vendor"
export type AccountKind = "b2b" | "b2c"

export function isRole(v: string): v is OnboardRole {
  return v === "customer" || v === "vendor"
}

export function isAccountKind(v: string): v is AccountKind {
  return v === "b2b" || v === "b2c"
}
