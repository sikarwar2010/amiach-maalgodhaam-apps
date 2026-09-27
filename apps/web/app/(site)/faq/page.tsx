import type { Metadata } from "next"
import { faqs } from "@/lib/content"
import { AccordionSection } from "@/components/ui/Accordion"

export const metadata: Metadata = { title: "FAQ" }

export default function FaqPage() {
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <div className="container-page pb-24">
          <span className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Support</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Frequently Asked Questions
          </h1>

          <div className="mt-8 max-w-2xl rounded-3xl border border-ink-100 bg-white p-6 sm:p-8">
            {faqs.map((f) => (
              <AccordionSection key={f.q} title={f.q} defaultOpen={false}>
                <p className="text-sm leading-relaxed text-ink-600">{f.a}</p>
              </AccordionSection>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
