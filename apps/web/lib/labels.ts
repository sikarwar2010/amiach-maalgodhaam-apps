import type { DealType, LogisticsMethod, MaterialUnit, ProductCondition } from "@workspace/types"

export const conditionLabels: Record<ProductCondition, string> = {
  SURPLUS: "Surplus",
  OVERSTOCK: "Overstock",
  EXCESS: "Excess Inventory",
  DISCONTINUED: "Discontinued",
  CLEARANCE: "Clearance",
  CUSTOMER_RETURN: "Customer Return",
  DISPLAY_STOCK: "Display Stock",
  FACTORY_STOCK: "Factory Stock",
}

export const conditionTone: Record<ProductCondition, "neutral" | "brand" | "accent"> = {
  SURPLUS: "brand",
  OVERSTOCK: "neutral",
  EXCESS: "neutral",
  DISCONTINUED: "accent",
  CLEARANCE: "accent",
  CUSTOMER_RETURN: "neutral",
  DISPLAY_STOCK: "neutral",
  FACTORY_STOCK: "brand",
}

export const dealTypeLabels: Record<DealType, string> = {
  BUY_NOW: "Buy Now",
  REQUEST_QUOTE: "Request Quote",
  BULK_DEAL: "Bulk Deal",
  CONTACT_SUPPLIER: "Contact Supplier",
}

export const unitLabels: Record<MaterialUnit, string> = {
  SQ_FT: "sq.ft",
  PIECE: "pieces",
  BOX: "boxes",
  SET: "sets",
  RUNNING_FT: "running ft",
  SHEET: "sheets",
  ROLL: "rolls",
  UNIT: "units",
}

export const unitLabelSingular: Record<MaterialUnit, string> = {
  SQ_FT: "sq.ft",
  PIECE: "piece",
  BOX: "box",
  SET: "set",
  RUNNING_FT: "running ft",
  SHEET: "sheet",
  ROLL: "roll",
  UNIT: "unit",
}

export const logisticsLabels: Record<LogisticsMethod, string> = {
  TRANSPORT_ARRANGED: "Transport Arranged",
  SELF_PICKUP: "Self Pickup",
  FREIGHT: "Freight",
  LOCAL_DELIVERY: "Local Delivery",
}

export const CONDITIONS = Object.keys(conditionLabels) as ProductCondition[]
export const DEAL_TYPES = Object.keys(dealTypeLabels) as DealType[]
export const UNITS = Object.keys(unitLabels) as MaterialUnit[]
