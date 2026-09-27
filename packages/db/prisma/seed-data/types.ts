// Core data architecture for the MaalGodaam.com marketplace.
// These types mirror what would come back from the API; data.ts
// populates them for now so every UI is already shaped for real data.

export type ConditionType =
  | "surplus"
  | "overstock"
  | "excess"
  | "discontinued"
  | "clearance"
  | "customer-return"
  | "display-stock"
  | "factory-stock"

export type DealType = "buy-now" | "request-quote" | "bulk-deal" | "contact-supplier"

export type MaterialUnit = "sq-ft" | "piece" | "box" | "set" | "running-ft" | "sheet" | "roll" | "unit"

export type LogisticsMethod = "transport-arranged" | "self-pickup" | "freight" | "local-delivery"

export interface Location {
  id: string
  city: string
  state: string
  region: string
  pincode?: string
  country: string
  listingCount: number
  lat?: number
  lng?: number
}

export interface Category {
  id: string
  slug: string
  name: string
  descriptor: string
  listingCount: number
  imageUrl: string
  parentId?: string | null
  subcategories?: string[]
  /** Attribute names suppliers fill in when listing in this category. */
  specFields?: string[]
}

export interface Supplier {
  id: string
  slug: string
  name: string
  logoUrl: string
  verified: boolean
  location: string
  categories: string[]
  activeListings: number
  availableInventoryUnits: number
  yearsActive?: number
  responseRate: number // 0-100
  rating: number // 0-5
  reviewCount: number
  memberSince: string // ISO date
  description?: string
}

export interface SpecificationEntry {
  label: string
  value: string
}

export interface MaterialListing {
  id: string
  slug: string
  title: string
  brand: string
  categoryId: string
  subcategory?: string
  condition: ConditionType
  images: string[]
  quantity: number
  unit: MaterialUnit
  minOrderQuantity: number
  locationId: string
  supplierId: string
  dealType: DealType
  marketValue: number
  price: number
  logisticsMethods: LogisticsMethod[]
  description: string
  conditionNotes?: string
  specifications: SpecificationEntry[]
  dimensions?: string
  material?: string
  finish?: string
  color?: string
  packaging?: string
  dateAdded: string // ISO date
  featured?: boolean
  wishlistCount?: number
}

export interface Requirement {
  id: string
  material: string
  categoryId: string
  quantity: number
  unit: MaterialUnit
  preferredLocation: string
  budget?: string
  requiredBy?: string
  additionalRequirements?: string
  status: "open" | "matching" | "fulfilled" | "closed"
  createdAt: string
}

export interface Enquiry {
  id: string
  listingId: string
  supplierId: string
  type: "quote" | "contact" | "bulk"
  buyerName: string
  message?: string
  status: "pending" | "responded" | "closed"
  createdAt: string
}

export interface PlatformStats {
  inventoryValue: number
  activeListings: number
  verifiedSuppliers: number
  categories: number
  cities: number
}
