import type { Metadata, Viewport } from "next"
import { Manrope } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"

import "@workspace/ui/globals.css"
import "./clerk.css"
import { ThemeProvider } from "@/components/theme-provider"
import { MeProvider } from "@/components/session/MeProvider"
import { WishlistProvider } from "@/components/wishlist/WishlistProvider"
import { clerkAppearance } from "@/components/auth/clerkAppearance"
import { clerkEnabled, SITE_URL } from "@/lib/config"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MaalGodaam.com — Quality Surplus Building & Interior Materials",
    template: "%s | MaalGodaam.com",
  },
  description:
    "MaalGodaam.com connects buyers with quality surplus, excess and overstock tiles, furniture, sanitaryware, plywood, flooring and interior materials from trusted suppliers across India. Build more for less.",
  keywords: [
    "surplus building materials",
    "surplus tiles India",
    "surplus plywood",
    "sanitaryware surplus",
    "overstock furniture",
    "interior materials marketplace",
    "excess inventory building materials",
    "pan-India material sourcing",
  ],
  openGraph: {
    title: "MaalGodaam.com — Quality Surplus. Greater Possibilities.",
    description:
      "Premium building & interior materials at exceptional value, sourced from trusted suppliers across India.",
    url: SITE_URL,
    siteName: "MaalGodaam.com",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/brand/logo-full.jpg",
        width: 1600,
        height: 783,
        alt: "Maalgodaam.com — Surplus माल देगा दाम",
      },
    ],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: "#173C8A",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const shell = (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-ink-25 font-sans text-ink-900 antialiased">
        {/* The brand palette is light-only, so the theme is pinned rather than following the OS. */}
        <ThemeProvider forcedTheme="light" defaultTheme="light" enableSystem={false}>
          <TooltipProvider>
            <MeProvider>
              <WishlistProvider>
                {/* Each route group (site, auth, portal) brings its own chrome. */}
                {children}
              </WishlistProvider>
            </MeProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )

  // ClerkProvider is only mounted when keys are configured (see lib/config.ts).
  return clerkEnabled ? (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/register"
      appearance={{ theme: shadcn, variables: clerkAppearance.variables }}
    >
      {shell}
    </ClerkProvider>
  ) : (
    shell
  )
}
