import { Check, FlaskConical } from "lucide-react"
import { BrandLockup } from "@/components/brand/BrandLogo"

/** Shown instead of Clerk's forms when no Clerk keys are configured (development / preview builds). */
export function AuthUnavailable() {
  return (
    <div
      role="note"
      className="rounded-3xl border border-accent-200 bg-accent-50 p-5 text-sm leading-relaxed text-accent-800"
    >
      <div className="flex items-start gap-2.5">
        <FlaskConical size={17} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Sign-in is not configured on this deployment.</p>
          <p className="mt-1">
            Add <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and <code>CLERK_SECRET_KEY</code> (see{" "}
            <code>.env.example</code>) to enable email and Google sign-in. Browsing the marketplace works without it.
          </p>
        </div>
      </div>
    </div>
  )
}

/** Split-screen frame for sign in / sign up / onboarding. Brand panel hidden on small screens. */
export function AuthShell({
  eyebrow,
  title,
  points,
  children,
  wide = false,
}: {
  eyebrow: string
  title: string
  points: readonly string[]
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <main className="min-h-[calc(100vh-4rem)] lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-700/40 blur-3xl"
        />
        <div className="relative">
          <span className="text-xs font-semibold tracking-widest text-accent-400 uppercase">{eyebrow}</span>
          <h2 className="mt-3 max-w-md text-3xl leading-tight font-extrabold tracking-tight text-balance">{title}</h2>
          <ul className="mt-8 flex max-w-md flex-col gap-3.5">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-white/75">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mt-12 rounded-3xl bg-white p-6 shadow-soft-xl">
          <BrandLockup />
        </div>
      </aside>

      <section className="flex justify-center px-4 pt-10 pb-16 sm:px-8 lg:items-center lg:pt-10">
        <div className={wide ? "w-full max-w-2xl" : "w-full max-w-md"}>{children}</div>
      </section>
    </main>
  )
}
