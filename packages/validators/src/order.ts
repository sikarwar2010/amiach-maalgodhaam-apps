import { z } from "zod"
import { ORDER_STATUSES, PAYMENT_METHODS } from "@workspace/types"

import { cuid, longText, pageQuery } from "./common"

export const checkoutInput = z.object({
  shippingAddressId: cuid,
  billingAddressId: cuid.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).default("COD"),
  notes: longText.max(1000).optional(),
})
export type CheckoutInput = z.infer<typeof checkoutInput>

export const orderListQuery = pageQuery.extend({
  status: z.enum(ORDER_STATUSES).optional(),
})

/** Transitions a vendor may drive for their own line items. */
export const vendorFulfilmentInput = z.object({
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  trackingNumber: z.string().trim().max(120).optional(),
})
export type VendorFulfilmentInput = z.infer<typeof vendorFulfilmentInput>
