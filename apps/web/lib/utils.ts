import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

// Indian numbering: lakh (L) above 1,00,000 and crore (Cr) above 1,00,00,000.
export function formatCompactCurrency(value: number): string {
  if (value >= 1_00_00_000) {
    const cr = value / 1_00_00_000
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)} Cr`
  }
  if (value >= 1_00_000) {
    const lakh = value / 1_00_000
    return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} L`
  }
  return formatCurrency(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value)
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function savingsPercent(marketValue: number, price: number): number {
  if (marketValue <= 0) return 0
  return Math.round(((marketValue - price) / marketValue) * 100)
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}
