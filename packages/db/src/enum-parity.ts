/**
 * Compile-time guard: every enum in `@workspace/types` must equal the Prisma enum of the same name.
 * If the schema and the shared constants drift, `tsc` fails here.
 */
import type * as T from "@workspace/types"

import type * as P from "./generated/enums"

type Same<A extends string, B extends string> = [A] extends [B] ? ([B] extends [A] ? true : never) : never

export type EnumParity = [
  Same<T.Role, P.Role>,
  Same<T.UserStatus, P.UserStatus>,
  Same<T.BuyerType, P.BuyerType>,
  Same<T.VendorType, P.VendorType>,
  Same<T.VendorStatus, P.VendorStatus>,
  Same<T.ProductStatus, P.ProductStatus>,
  Same<T.ProductCondition, P.ProductCondition>,
  Same<T.DealType, P.DealType>,
  Same<T.MaterialUnit, P.MaterialUnit>,
  Same<T.LogisticsMethod, P.LogisticsMethod>,
  Same<T.OrderStatus, P.OrderStatus>,
  Same<T.OrderChannel, P.OrderChannel>,
  Same<T.PaymentMethod, P.PaymentMethod>,
  Same<T.PaymentStatus, P.PaymentStatus>,
  Same<T.InquiryStatus, P.InquiryStatus>,
  Same<T.QuoteStatus, P.QuoteStatus>,
  Same<T.DocumentStatus, P.DocumentStatus>,
  Same<T.VendorDocumentType, P.VendorDocumentType>,
  Same<T.ProductDocumentType, P.ProductDocumentType>,
  Same<T.AddressType, P.AddressType>,
  Same<T.NotificationType, P.NotificationType>,
]
