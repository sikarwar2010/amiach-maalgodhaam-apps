import { z } from "zod"

/** Indian identifiers. Kept identical to the onboarding form so client and server agree. */
export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/
export const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/
export const PHONE_REGEX = /^[6-9]\d{9}$/
export const PINCODE_REGEX = /^\d{6}$/

export const cuid = z.string().min(1).max(64)
export const slug = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")

export const nameText = z.string().trim().min(1).max(120)
export const longText = z.string().trim().max(5000)

export const gstin = z.string().trim().toUpperCase().regex(GSTIN_REGEX, "Enter a valid 15-character GSTIN")
export const pan = z.string().trim().toUpperCase().regex(PAN_REGEX, "Enter a valid 10-character PAN")
export const phone = z.string().trim().regex(PHONE_REGEX, "Enter a valid 10-digit Indian mobile number")
export const pincode = z.string().trim().regex(PINCODE_REGEX, "Enter a valid 6-digit pincode")
export const email = z.string().trim().toLowerCase().pipe(z.email().max(254))
/** http(s) URL. Production deployments serve assets over https; local development uses http://localhost. */
export const httpsUrl = z.url({ protocol: /^https?$/ }).max(2048)

/** Money: a non-negative number with at most 2 decimals. */
export const money = z
  .number()
  .finite()
  .nonnegative()
  .max(1_000_000_000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "At most 2 decimals")

export const positiveInt = z.number().int().positive().max(100_000_000)

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export type PageQuery = z.infer<typeof pageQuery>

export const idParam = z.object({ id: cuid })
export const slugParam = z.object({ slug })

/** Query strings send lists as comma-separated values. */
export const csvList = z
  .string()
  .transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  )
  .pipe(z.array(z.string().max(80)).max(30))
