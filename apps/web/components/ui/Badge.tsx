import { cn } from "@/lib/utils"

type Tone = "neutral" | "brand" | "accent" | "success" | "dark" | "outline"

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-50 text-brand-700",
  accent: "bg-accent-50 text-accent-700",
  success: "bg-success-50 text-success-700",
  dark: "bg-ink-900 text-white",
  outline: "bg-white text-ink-700 ring-1 ring-inset ring-ink-200",
}

export function Badge({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
  icon?: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
        toneClasses[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}
