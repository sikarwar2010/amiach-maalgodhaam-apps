import type { OnboardingBuyerInput, VendorRegistrationInput } from "@workspace/validators"

import type { OnboardingValues } from "./onboarding-schema"

const str = (v: OnboardingValues[string] | undefined): string => (typeof v === "string" ? v.trim() : "")

const optional = (v: OnboardingValues[string] | undefined): string | undefined => {
  const s = str(v)
  return s ? s : undefined
}

const list = (v: OnboardingValues[string] | undefined): string[] => (Array.isArray(v) ? v : [])

/** Wizard answers → the API's vendor registration body. The API re-validates everything. */
export function toVendorRegistration(kind: "b2b" | "b2c", values: OnboardingValues): VendorRegistrationInput {
  const email = optional(values.email)
  if (kind === "b2b") {
    return {
      vendorType: "BUSINESS",
      businessName: str(values.legalName),
      contactName: str(values.contactName),
      phone: str(values.phone).replace(/\s/g, ""),
      ...(email ? { email } : {}),
      gstin: str(values.gstin).toUpperCase(),
      pan: str(values.pan).toUpperCase(),
      addressLine: str(values.address),
      city: str(values.city),
      state: str(values.state),
      pincode: str(values.pincode),
      categories: list(values.categories),
    }
  }
  return {
    vendorType: "INDIVIDUAL",
    businessName: str(values.contactName),
    contactName: str(values.contactName),
    phone: str(values.phone).replace(/\s/g, ""),
    ...(email ? { email } : {}),
    city: str(values.city),
    state: str(values.state),
    pincode: str(values.pincode),
    categories: list(values.categories),
  }
}

/** Wizard answers → the API's buyer onboarding body. */
export function toBuyerOnboarding(kind: "b2b" | "b2c", values: OnboardingValues): OnboardingBuyerInput {
  const base = {
    name: str(values.contactName),
    phone: str(values.phone).replace(/\s/g, ""),
  }
  if (kind === "b2c") return { buyerType: "INDIVIDUAL", ...base }
  const gstin = optional(values.gstin)
  const businessType = optional(values.businessType)
  return {
    buyerType: "BUSINESS",
    ...base,
    companyName: str(values.legalName),
    ...(gstin ? { gstin: gstin.toUpperCase() } : {}),
    ...(businessType ? { businessType } : {}),
  }
}
