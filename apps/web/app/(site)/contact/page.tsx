import type { Metadata } from "next"
import { Mail, MapPin, Phone } from "lucide-react"
import { ContactForm } from "@/components/forms/ContactForm"

export const metadata: Metadata = { title: "Contact Us" }

export default function ContactPage() {
  return (
    <>
      <main className="pt-28 sm:pt-32">
        <div className="container-page pb-24">
          <span className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Contact</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Get in Touch</h1>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <ContactForm />

            <div className="flex flex-col gap-4">
              {[
                {
                  icon: Mail,
                  label: "Email",
                  value: "partners@maalgodaam.com",
                },
                { icon: Phone, label: "Phone", value: "+91 98765 43210" },
                {
                  icon: MapPin,
                  label: "Headquarters",
                  value: "Gurugram, Haryana",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon size={17} />
                  </span>
                  <div>
                    <div className="text-xs text-ink-500">{label}</div>
                    <div className="text-sm font-semibold text-ink-900">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
