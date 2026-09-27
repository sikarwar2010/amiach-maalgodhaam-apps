import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { faqs } from "@/lib/content"
import { AccordionSection } from "@/components/ui/Accordion"

export function FaqSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <Link
            href="/faq"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:inline-flex"
          >
            View full FAQ <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="mt-8 max-w-2xl rounded-3xl border border-ink-100 bg-white p-6 sm:p-8">
          {faqs.slice(0, 4).map((f) => (
            <AccordionSection key={f.q} title={f.q} defaultOpen={false}>
              <p className="text-sm leading-relaxed text-ink-600">{f.a}</p>
            </AccordionSection>
          ))}
        </div>

        <Link
          href="/faq"
          className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 sm:hidden"
        >
          View full FAQ <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  )
}
