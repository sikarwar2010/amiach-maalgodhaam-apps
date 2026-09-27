/**
 * Shared, framework-free domain types and constants.
 * The const arrays mirror the enums in `packages/db/prisma/schema.prisma`;
 * `packages/db` has a compile-time check that the two never drift.
 */

export const ROLES = ["BUYER", "VENDOR", "ADMIN", "SUPER_ADMIN", "STAFF"] as const
export type Role = (typeof ROLES)[number]

/** An unauthenticated caller. Never stored on a user. */
export type ActorRole = Role | "PUBLIC"

export const USER_STATUSES = ["ACTIVE", "SUSPENDED", "DELETED"] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const BUYER_TYPES = ["INDIVIDUAL", "BUSINESS"] as const
export type BuyerType = (typeof BUYER_TYPES)[number]

export const VENDOR_TYPES = ["BUSINESS", "INDIVIDUAL"] as const
export type VendorType = (typeof VENDOR_TYPES)[number]

export const VENDOR_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const
export type VendorStatus = (typeof VENDOR_STATUSES)[number]

export const PRODUCT_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED",
  "OUT_OF_STOCK",
] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

export const PRODUCT_CONDITIONS = [
  "SURPLUS",
  "OVERSTOCK",
  "EXCESS",
  "DISCONTINUED",
  "CLEARANCE",
  "CUSTOMER_RETURN",
  "DISPLAY_STOCK",
  "FACTORY_STOCK",
] as const
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number]

export const DEAL_TYPES = ["BUY_NOW", "REQUEST_QUOTE", "BULK_DEAL", "CONTACT_SUPPLIER"] as const
export type DealType = (typeof DEAL_TYPES)[number]

export const MATERIAL_UNITS = ["SQ_FT", "PIECE", "BOX", "SET", "RUNNING_FT", "SHEET", "ROLL", "UNIT"] as const
export type MaterialUnit = (typeof MATERIAL_UNITS)[number]

export const LOGISTICS_METHODS = ["TRANSPORT_ARRANGED", "SELF_PICKUP", "FREIGHT", "LOCAL_DELIVERY"] as const
export type LogisticsMethod = (typeof LOGISTICS_METHODS)[number]

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_CHANNELS = ["B2C", "B2B"] as const
export type OrderChannel = (typeof ORDER_CHANNELS)[number]

export const PAYMENT_METHODS = ["COD", "ONLINE", "BANK_TRANSFER"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const INQUIRY_STATUSES = ["OPEN", "QUOTED", "ACCEPTED", "REJECTED", "CANCELLED", "EXPIRED"] as const
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number]

export const QUOTE_STATUSES = ["SUBMITTED", "ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const DOCUMENT_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

export const VENDOR_DOCUMENT_TYPES = [
  "GST_CERTIFICATE",
  "PAN_CARD",
  "BUSINESS_REGISTRATION",
  "CANCELLED_CHEQUE",
  "OTHER",
] as const
export type VendorDocumentType = (typeof VENDOR_DOCUMENT_TYPES)[number]

export const PRODUCT_DOCUMENT_TYPES = ["SPEC_SHEET", "CERTIFICATE", "TEST_REPORT", "OTHER"] as const
export type ProductDocumentType = (typeof PRODUCT_DOCUMENT_TYPES)[number]

export const ADDRESS_TYPES = ["SHIPPING", "BILLING"] as const
export type AddressType = (typeof ADDRESS_TYPES)[number]

export const NOTIFICATION_TYPES = ["SYSTEM", "ORDER", "PRODUCT", "VENDOR", "INQUIRY", "QUOTE"] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/* ------------------------------------------------------------------ */
/* API envelope                                                        */
/* ------------------------------------------------------------------ */

export const ERROR_CODES = [
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export interface PageMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: PageMeta
}

export interface ApiFailure {
  success: false
  error: {
    code: ErrorCode
    message: string
    /** Field-level problems for VALIDATION_ERROR. */
    details?: { path: string; message: string }[]
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

/** Maps an error code to its HTTP status. */
export const ERROR_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const satisfies Record<ErrorCode, number>

/** The signed-in user as the API describes them to the UI. Never used for authorization on the client. */
export interface SessionUser {
  id: string
  email: string
  name: string | null
  imageUrl: string | null
  phone: string | null
  role: Role
  onboarded: boolean
  vendorStatus: VendorStatus | null
  unreadNotifications: number
}

export type * from "./dto"

export * from "./pricing"
