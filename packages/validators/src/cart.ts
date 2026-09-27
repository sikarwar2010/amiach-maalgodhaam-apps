import { z } from "zod"

import { cuid, positiveInt } from "./common"

export const addCartItemInput = z.object({
  productId: cuid,
  variantId: cuid.optional(),
  quantity: positiveInt.default(1),
})
export type AddCartItemInput = z.infer<typeof addCartItemInput>

export const updateCartItemInput = z.object({
  quantity: positiveInt,
})

export const addWishlistItemInput = z.object({ productId: cuid })
