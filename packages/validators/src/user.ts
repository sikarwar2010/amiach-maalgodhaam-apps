import { z } from "zod"
import { ADDRESS_TYPES, BUYER_TYPES } from "@workspace/types"

import { email, gstin, longText, nameText, pan, phone, pincode } from "./common"

export const updateProfileInput = z.object({
  name: nameText.optional(),
  phone: phone.optional(),
})
export type UpdateProfileInput = z.infer<typeof updateProfileInput>

/** Role is a *request* during onboarding; the server decides what is granted. */
export const onboardingBuyerInput = z
  .object({
    buyerType: z.enum(BUYER_TYPES),
    name: nameText,
    phone,
    companyName: nameText.optional(),
    gstin: gstin.optional(),
    pan: pan.optional(),
    businessType: nameText.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.buyerType === "BUSINESS") {
      if (!v.companyName)
        ctx.addIssue({
          code: "custom",
          path: ["companyName"],
          message: "Company name is required",
        })
    }
  })
export type OnboardingBuyerInput = z.infer<typeof onboardingBuyerInput>

export const addressInput = z.object({
  type: z.enum(ADDRESS_TYPES).default("SHIPPING"),
  label: nameText.optional(),
  fullName: nameText,
  phone,
  line1: nameText,
  line2: nameText.optional(),
  city: nameText,
  state: nameText,
  pincode,
  isDefault: z.boolean().default(false),
})
export type AddressInput = z.infer<typeof addressInput>

export const buyerProfileInput = z.object({
  buyerType: z.enum(BUYER_TYPES),
  companyName: nameText.optional(),
  gstin: gstin.optional(),
  pan: pan.optional(),
  businessType: nameText.optional(),
  about: longText.optional(),
})
export type BuyerProfileInput = z.infer<typeof buyerProfileInput>

export const contactInput = z.object({
  name: nameText,
  email,
  phone: phone.optional(),
  subject: z.string().trim().max(160).optional(),
  message: longText.min(10).max(3000),
})
export type ContactInput = z.infer<typeof contactInput>
