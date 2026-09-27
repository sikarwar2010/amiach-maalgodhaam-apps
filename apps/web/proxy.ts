import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { clerkEnabled } from "@/lib/config"

/**
 * Next.js 16 "proxy" (formerly middleware). It only answers "is there a session?" for private areas.
 * Which *role* may see a page is decided server-side by the portal layouts (against the API), and the
 * API enforces the same rules on every request — this file is a convenience redirect, not a security boundary.
 */
const isPrivate = createRouteMatcher([
  "/buyer(.*)",
  "/vendor(.*)",
  "/admin(.*)",
  "/cart(.*)",
  "/checkout(.*)",
  "/wishlist(.*)",
  "/account(.*)",
  "/onboarding(.*)",
])

const withClerk = clerkMiddleware(
  async (auth, req) => {
    if (isPrivate(req)) {
      const login = new URL("/login", req.url)
      login.searchParams.set("redirect_url", req.nextUrl.pathname)
      await auth.protect({ unauthenticatedUrl: login.toString() })
    }
  },
  // Tolerate a few seconds of clock drift between this server and Clerk (see the API's token verification).
  { clockSkewInMs: 60_000 }
)

// Without Clerk keys nobody can sign in, so private areas send visitors to the (explanatory) login page.
function withoutClerk(req: NextRequest) {
  if (isPrivate(req)) {
    const url = new URL("/login", req.url)
    url.searchParams.set("redirect_url", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export default clerkEnabled ? withClerk : withoutClerk

export const config = {
  matcher: [
    // Skip Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
