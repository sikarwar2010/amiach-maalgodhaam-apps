import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { PORTAL_ACCESS, ROLE_HOME } from "@workspace/auth"
import type { SessionUser } from "@workspace/types"

import { API_URL, clerkEnabled } from "../config"
import { ApiError, apiRequest, type ApiOptions, type ApiResult } from "./fetcher"

/** Bearer token for the signed-in user, or null (signed out / Clerk not configured). */
async function serverToken(): Promise<string | null> {
  if (!clerkEnabled) return null
  const session = await auth()
  return session.getToken()
}

/** Authenticated API call from a server component. The API — not this code — decides what the caller may see. */
export async function serverApi<T>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  return apiRequest<T>(API_URL, path, {
    ...options,
    token: await serverToken(),
  })
}

/**
 * Clerk says the person is signed in, but the API would not accept their session. Surfaced as a real error
 * (instead of quietly bouncing to /login, which loops) so the cause is visible.
 */
export class SessionBridgeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SessionBridgeError"
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!clerkEnabled) return null
  const session = await auth()
  if (!session.userId) return null

  const token = await session.getToken()
  if (!token) throw new SessionBridgeError("You are signed in, but Clerk did not issue a session token for the API.")
  try {
    return (await apiRequest<SessionUser>(API_URL, "/api/me", { token })).data
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw new SessionBridgeError(
        `You are signed in, but the API rejected your session (${error.status}: ${error.message}). Check the API log.`
      )
    }
    throw error
  }
}

export type Portal = "buyer" | "vendor" | "admin"

/**
 * Server-side gate for the portal layouts. It redirects people who are signed out, un-onboarded or in the
 * wrong portal — a UX convenience. Every API call the pages then make is authorized again by the API.
 */
export async function requirePortalAccess(portal: Portal): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect(`/login?redirect_url=${encodeURIComponent(`/${portal}`)}`)

  const rule = PORTAL_ACCESS.find((p) => p.prefix === `/${portal}`)
  if (!rule?.roles.includes(user.role)) redirect(ROLE_HOME[user.role])
  if (portal === "buyer" && !user.onboarded && user.role === "BUYER") redirect("/register")
  // The supplier portal only exists for people with a vendor registration; an admin without one has nothing to see there.
  if (portal === "vendor" && user.vendorStatus === null)
    redirect(ROLE_HOME[user.role] === "/vendor" ? "/sell-surplus" : ROLE_HOME[user.role])
  return user
}

/** Where a signed-in person belongs: their portal, or the registration chooser if they never finished onboarding. */
export function homeFor(user: SessionUser): string {
  return !user.onboarded && user.role === "BUYER" ? "/register" : ROLE_HOME[user.role]
}

/**
 * For the auth pages: send people who are already signed in to their own portal instead of showing the form.
 * If the API is unreachable we show the form rather than failing the page.
 */
export async function redirectIfSignedIn(options: { allowUnfinished?: boolean } = {}): Promise<void> {
  let user: SessionUser | null = null
  try {
    user = await getSessionUser()
  } catch (error) {
    // A rejected session must be visible; only an unreachable API falls back to showing the form.
    if (error instanceof SessionBridgeError) throw error
    return
  }
  if (!user) return
  const unfinished = !user.onboarded && user.role === "BUYER"
  if (unfinished && options.allowUnfinished) return
  redirect(homeFor(user))
}

/**
 * For the sign-up and onboarding pages of a given track: a signed-in person who already finished that track
 * goes to their portal; one who has not yet goes to (or stays on) the onboarding step.
 */
export async function routeForTrack(
  track: "customer" | "vendor",
  kind: string,
  page: "signup" | "onboarding"
): Promise<void> {
  let user: SessionUser | null = null
  try {
    user = await getSessionUser()
  } catch (error) {
    // A rejected session must be visible; only an unreachable API falls back to showing the form.
    if (error instanceof SessionBridgeError) throw error
    return
  }
  if (!user) return
  const done = track === "vendor" ? user.vendorStatus !== null : user.onboarded
  if (done) redirect(track === "vendor" ? "/vendor" : ROLE_HOME[user.role])
  if (page === "signup") redirect(`/onboarding/${track}/${kind}`)
}
