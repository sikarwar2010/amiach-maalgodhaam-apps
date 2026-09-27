/**
 * Clerk is active only when a publishable key is present. Without keys the public storefront still
 * renders (it needs no session) and the auth pages explain that sign-in is not configured yet.
 */
export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

/** Where server components reach the Hono API (may be an internal network address). */
export const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100"

/** Where the browser reaches the Hono API. */
export const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100"

export const SITE_URL = "https://www.maalgodaam.com"
