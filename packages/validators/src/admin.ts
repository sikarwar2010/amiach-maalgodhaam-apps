import { z } from "zod"
import { PRODUCT_STATUSES, ROLES, USER_STATUSES, VENDOR_STATUSES } from "@workspace/types"

import { cuid, pageQuery } from "./common"

export const adminUserListQuery = pageQuery.extend({
  q: z.string().trim().max(120).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
})

export const adminSetRoleInput = z.object({ role: z.enum(ROLES) })
export const adminSetUserStatusInput = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
})

export const adminVendorListQuery = pageQuery.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum(VENDOR_STATUSES).optional(),
})

export const adminVendorDecisionInput = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  reason: z.string().trim().max(500).optional(),
})

export const adminProductListQuery = pageQuery.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  vendorId: cuid.optional(),
})

export const adminProductDecisionInput = z.object({
  status: z.enum(["PUBLISHED", "REJECTED", "ARCHIVED"]),
  reason: z.string().trim().max(500).optional(),
})

export const auditLogQuery = pageQuery.extend({
  action: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(80).optional(),
  actorId: cuid.optional(),
})
