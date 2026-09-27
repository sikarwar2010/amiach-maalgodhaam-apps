import Link from "next/link"
import { Mail, MapPin, Phone } from "lucide-react"
import { BrandLogo } from "@/components/brand/BrandLogo"

const columns = [
  {
    title: "Marketplace",
    links: [
      { label: "Catalogue", href: "/products" },
      { label: "Deals Around You", href: "/deals" },
      { label: "Categories", href: "/categories" },
      { label: "Suppliers", href: "/vendors" },
    ],
  },
  {
    title: "For Buyers",
    links: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "Post Requirement", href: "/post-requirement" },
      { label: "Buyer Support", href: "/contact" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "For Sellers",
    links: [
      { label: "Sell Surplus", href: "/sell-surplus" },
      { label: "Seller Guide", href: "/how-it-works" },
      { label: "Seller Support", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Shipping", href: "/shipping" },
      { label: "Refund", href: "/refund" },
      { label: "FAQ", href: "/faq" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-white pt-16 pb-28 lg:pb-16">
      <div className="container-page">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-7">
          <div className="col-span-2">
            <Link href="/" aria-label="Maalgodaam.com home" className="inline-block">
              <BrandLogo height={34} />
            </Link>
            <div className="mt-3">
              <BrandLogo variant="tagline" height={14} />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
              India&apos;s marketplace for quality surplus building and interior materials — connecting buyers with
              trusted suppliers. Build more for less.
            </p>
            <div className="mt-5 flex flex-col gap-2 text-sm text-ink-600">
              <a href="mailto:partners@maalgodaam.com" className="inline-flex items-center gap-2 hover:text-brand-700">
                <Mail size={15} className="text-ink-400" /> partners@maalgodaam.com
              </a>
              <a href="tel:+919876543210" className="inline-flex items-center gap-2 hover:text-brand-700">
                <Phone size={15} className="text-ink-400" /> +91 9837157525
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin size={15} className="text-ink-400" /> Noida, Uttar Pradesh — HQ
              </span>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-bold text-ink-900">{col.title}</h4>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-ink-500 transition-colors hover:text-brand-700">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-ink-100 pt-6 sm:flex-row">
          <p className="text-xs text-ink-400">© {new Date().getFullYear()} MaalGodaam.com. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-ink-400">
            <Link href="/terms" className="hover:text-ink-700">
              Terms & Conditions
            </Link>
            <Link href="/privacy" className="hover:text-ink-700">
              Privacy Policy
            </Link>
            <Link href="/faq" className="hover:text-ink-700">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
