import { z } from "zod"
import { VENDOR_DOCUMENT_TYPES, VENDOR_TYPES } from "@workspace/types"

import { email, gstin, httpsUrl, longText, nameText, pan, phone, pincode } from "./common"

export const vendorRegistrationInput = z
  .object({
    /** BUSINESS vendors are GST-registered; INDIVIDUAL sellers clear leftover renovation/project stock. */
    vendorType: z.enum(VENDOR_TYPES).default("BUSINESS"),
    businessName: nameText,
    contactName: nameText,
    phone,
    email: email.optional(),
    gstin: gstin.optional(),
    pan: pan.optional(),
    description: longText.optional(),
    addressLine: nameText.optional(),
    city: nameText,
    state: nameText,
    pincode,
    categories: z.array(z.string().max(80)).max(20).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.vendorType === "BUSINESS") {
      if (!v.gstin) {
        ctx.addIssue({
          code: "custom",
          path: ["gstin"],
          message: "GSTIN is required for business vendors",
        })
      }
      if (!v.addressLine) {
        ctx.addIssue({
          code: "custom",
          path: ["addressLine"],
          message: "Address is required for business vendors",
        })
      }
    }
  })
export type VendorRegistrationInput = z.infer<typeof vendorRegistrationInput>

export const vendorProfileUpdateInput = z.object({
  businessName: nameText.optional(),
  contactName: nameText.optional(),
  phone: phone.optional(),
  email: email.optional(),
  gstin: gstin.optional(),
  pan: pan.optional(),
  description: longText.optional(),
  addressLine: nameText.optional(),
  city: nameText.optional(),
  state: nameText.optional(),
  pincode: pincode.optional(),
  categories: z.array(z.string().max(80)).max(20).optional(),
  logoUrl: httpsUrl.optional(),
})
export type VendorProfileUpdateInput = z.infer<typeof vendorProfileUpdateInput>

export const vendorDocumentInput = z.object({
  type: z.enum(VENDOR_DOCUMENT_TYPES),
  name: nameText,
  url: httpsUrl,
})
export type VendorDocumentInput = z.infer<typeof vendorDocumentInput>
