import { z } from "zod"
import { INQUIRY_STATUSES, MATERIAL_UNITS, QUOTE_STATUSES } from "@workspace/types"

import { cuid, longText, money, nameText, pageQuery, pincode, positiveInt } from "./common"

export const createInquiryInput = z.object({
  productId: cuid.optional(),
  /** When set, the RFQ is private to this vendor. Derived from the product when productId is given. */
  vendorId: cuid.optional(),
  title: z.string().trim().min(3).max(200),
  description: longText.min(10),
  quantity: positiveInt,
  unit: z.enum(MATERIAL_UNITS),
  targetUnitPrice: money.positive().optional(),
  deliveryCity: nameText,
  deliveryPincode: pincode.optional(),
  neededBy: z.coerce.date().optional(),
})
export type CreateInquiryInput = z.infer<typeof createInquiryInput>

export const inquiryListQuery = pageQuery.extend({
  status: z.enum(INQUIRY_STATUSES).optional(),
})

export const submitQuoteInput = z.object({
  unitPrice: money.positive(),
  quantity: positiveInt,
  leadTimeDays: z.number().int().min(0).max(365).default(7),
  validUntil: z.coerce.date().refine((d) => d.getTime() > Date.now(), "validUntil must be in the future"),
  terms: longText.max(2000).optional(),
})
export type SubmitQuoteInput = z.infer<typeof submitQuoteInput>

export const quoteDecisionInput = z.object({
  reason: z.string().trim().max(500).optional(),
})

export const acceptQuoteInput = z.object({
  shippingAddressId: cuid,
  billingAddressId: cuid.optional(),
})
export type AcceptQuoteInput = z.infer<typeof acceptQuoteInput>

export const quoteListQuery = pageQuery.extend({
  status: z.enum(QUOTE_STATUSES).optional(),
})
