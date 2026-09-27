import { cn } from "@/lib/utils"
import Link from "next/link"
import type { ComponentPropsWithoutRef } from "react"

type Variant = "primary" | "brand" | "outline" | "ghost" | "dark"
type Size = "sm" | "md" | "lg"

// Orange is the CTA color; green is reserved for brand/structural actions.
const variantClasses: Record<Variant, string> = {
  primary: "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-soft-sm",
  brand: "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-soft-sm",
  outline: "bg-transparent text-ink-900 border border-ink-200 hover:border-ink-300 hover:bg-ink-50",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100",
  dark: "bg-white/10 text-white border border-white/15 hover:bg-white/20 backdrop-blur",
}

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-xl",
  md: "h-11 px-5 text-sm gap-2 rounded-xl",
  lg: "h-[3.25rem] px-7 text-base gap-2.5 rounded-2xl",
}

interface BaseProps {
  variant?: Variant
  size?: Size
  className?: string
  children: React.ReactNode
}

type ButtonProps = BaseProps & ComponentPropsWithoutRef<"button"> & { href?: undefined }

type LinkProps = BaseProps & ComponentPropsWithoutRef<typeof Link> & { href: string }

export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", className, children, ...rest } = props

  const classes = cn(
    "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 ease-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    variantClasses[variant],
    sizeClasses[size],
    className
  )

  if ("href" in props && props.href) {
    const { href, ...linkRest } = rest as ComponentPropsWithoutRef<typeof Link>
    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...(rest as ComponentPropsWithoutRef<"button">)}>
      {children}
    </button>
  )
}
