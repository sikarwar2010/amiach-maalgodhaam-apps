import Image from "next/image"
import { cn } from "@/lib/utils"

// Logo PNGs have their white background converted to real transparency (public/brand).
const RATIOS = {
  wordmark: 1430 / 235,
  warehouse: 580 / 360,
  tagline: 1400 / 100,
}

export function BrandLogo({
  variant = "wordmark",
  height = 30,
  className,
  preload = false,
}: {
  variant?: "wordmark" | "warehouse" | "tagline"
  height?: number
  className?: string
  preload?: boolean
}) {
  const src = `/brand/${variant}-t.png`
  const width = Math.round(height * RATIOS[variant])
  return (
    <Image
      src={src}
      alt={variant === "wordmark" ? "Maalgodaam.com" : variant === "tagline" ? "Surplus माल देगा दाम" : ""}
      aria-hidden={variant === "warehouse" ? true : undefined}
      width={width}
      height={height}
      preload={preload}
      className={cn("h-auto select-none", className)}
      style={{ width, height: "auto" }}
    />
  )
}

/** Stacked lockup used on auth / onboarding screens. */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <BrandLogo variant="warehouse" height={84} />
      <BrandLogo variant="wordmark" height={34} />
      <BrandLogo variant="tagline" height={16} />
    </div>
  )
}
