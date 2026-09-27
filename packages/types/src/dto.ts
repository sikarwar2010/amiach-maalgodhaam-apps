/**
 * JSON shapes returned by the API. The API serializers are typed against these, so the web app
 * and the server cannot drift apart. Dates are ISO-8601 strings; money is a number in INR.
 */
import type {
  DealType,
  InquiryStatus,
  LogisticsMethod,
  MaterialUnit,
  OrderChannel,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductCondition,
  ProductStatus,
  QuoteStatus,
} from "./index"

export interface CategoryRefDto {
  id: string
  slug: string
  name: string
}

export interface SubCategoryDto {
  id: string
  slug: string
  name: string
}

export interface CategoryDto extends CategoryRefDto {
  description: string | null
  imageUrl: string | null
  productCount: number
  subCategories: SubCategoryDto[]
}

export interface VendorRefDto {
  id: string
  slug: string
  businessName: string
  verified: boolean
}

export interface ProductCardDto {
  id: string
  slug: string
  title: string
  brand: string | null
  status: ProductStatus
  condition: ProductCondition
  dealType: DealType
  unit: MaterialUnit
  /** Selling price per unit, INR. */
  price: number
  /** Original market value per unit, INR. */
  marketValue: number | null
  discountPct: number
  currency: string
  minOrderQty: number
  availableQuantity: number
  city: string
  state: string
  featured: boolean
  image: string | null
  category: CategoryRefDto
  vendor: VendorRefDto
  publishedAt: string | null
}

export interface ProductImageDto {
  id: string
  url: string
  alt: string | null
  isPrimary: boolean
}

export interface BulkPriceDto {
  id: string
  minQty: number
  maxQty: number | null
  unitPrice: number
}

export interface ProductDetailDto extends ProductCardDto {
  description: string
  conditionNotes: string | null
  logisticsMethods: LogisticsMethod[]
  specifications: { label: string; value: string }[]
  tags: string[]
  pincode: string | null
  subCategory: SubCategoryDto | null
  images: ProductImageDto[]
  bulkPrices: BulkPriceDto[]
  documents: { id: string; type: string; name: string; url: string }[]
  vendor: VendorRefDto & { city: string; state: string }
}

export interface PublicVendorDto {
  id: string
  slug: string
  businessName: string
  description: string | null
  logoUrl: string | null
  city: string
  state: string
  categories: string[]
  verifiedAt: string | null
  createdAt: string
  activeListings: number
  verified: true
}

export interface SearchResultDto {
  products: ProductCardDto[]
  categories: CategoryRefDto[]
  vendors: { id: string; slug: string; businessName: string }[]
}

export interface LocationDto {
  city: string
  state: string
  listingCount: number
}

export interface PlatformStatsDto {
  activeListings: number
  verifiedSuppliers: number
  categories: number
  cities: number
  inventoryValue: number
}

/* ---------------------------- wishlist & cart --------------------------- */

export interface WishlistItemDto {
  id: string
  addedAt: string
  product: ProductCardDto
}

export type CartIssueCode = "UNAVAILABLE" | "BELOW_MIN_ORDER" | "INSUFFICIENT_STOCK"

export interface CartLineDto {
  id: string
  quantity: number
  variant: { id: string; name: string; sku: string } | null
  unitPrice: number
  lineTotal: number
  available: number
  issues: CartIssueCode[]
  product: ProductCardDto
}

export interface CartDto {
  items: CartLineDto[]
  itemCount: number
  subtotal: number
  currency: string
  canCheckout: boolean
}

/* -------------------------------- orders -------------------------------- */

export interface AddressSnapshotDto {
  fullName: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  country: string
}

export interface OrderItemDto {
  id: string
  productId: string | null
  title: string
  unit: MaterialUnit
  unitPrice: number
  quantity: number
  lineTotal: number
  status: OrderStatus
  trackingNumber: string | null
}

export interface OrderDto {
  id: string
  orderNumber: string
  channel: OrderChannel
  status: OrderStatus
  subtotal: number
  shippingFee: number
  tax: number
  total: number
  currency: string
  shippingAddress: AddressSnapshotDto
  billingAddress: AddressSnapshotDto | null
  notes: string | null
  placedAt: string
  items: OrderItemDto[]
  payments: {
    id: string
    method: PaymentMethod
    status: PaymentStatus
    amount: number
    paidAt: string | null
  }[]
}

export interface AddressDto extends AddressSnapshotDto {
  id: string
  type: "SHIPPING" | "BILLING"
  label: string | null
  isDefault: boolean
}

/* --------------------------------- B2B ---------------------------------- */

export interface InquiryDto {
  id: string
  title: string
  description: string
  quantity: number
  unit: MaterialUnit
  targetUnitPrice: number | null
  deliveryCity: string
  deliveryPincode: string | null
  neededBy: string | null
  status: InquiryStatus
  vendorId: string | null
  product: { id: string; slug: string; title: string } | null
  createdAt: string
}

export interface QuoteDto {
  id: string
  inquiryId: string
  unitPrice: number
  quantity: number
  totalPrice: number
  leadTimeDays: number
  validUntil: string
  terms: string | null
  status: QuoteStatus
  orderId: string | null
  createdAt: string
}
