import type { Metadata } from "next"
import { Mail } from "lucide-react"

export const metadata: Metadata = { title: "Careers" }

export default function CareersPage() {
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <div className="container-page max-w-3xl pb-24">
          <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Careers</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Build the Future of Building Materials With Us
          </h1>
          <p className="mt-4 text-ink-500">
            We&apos;re not actively listing open roles here yet. As MaalGodaam.com grows, we&apos;ll post opportunities
            across sourcing, engineering, operations and supplier success.
          </p>
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Mail size={17} />
            </span>
            <div className="text-sm text-ink-600">
              Interested in working with us? Write to{" "}
              <a href="mailto:partners@maalgodaam.com" className="font-semibold text-brand-700 hover:text-brand-800">
                partners@maalgodaam.com
              </a>
              .
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
