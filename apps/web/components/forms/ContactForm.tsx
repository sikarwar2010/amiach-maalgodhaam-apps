"use client"

import { useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { contactInput } from "@workspace/validators"

import { Button } from "@/components/ui/Button"
import { apiRequest } from "@/lib/api/fetcher"
import { PUBLIC_API_URL } from "@/lib/config"

import { fieldClass, textareaClass } from "./formStyles"
import { useZodForm } from "./useZodForm"

export function ContactForm() {
  const [sent, setSent] = useState(false)
  const form = useZodForm(contactInput, {
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-center rounded-3xl bg-success-50 px-6 py-10 text-center">
        <CheckCircle2 size={32} className="text-success-600" />
        <h3 className="text-success-800 mt-3 text-lg font-bold">Message sent</h3>
        <p className="mt-1.5 max-w-sm text-sm text-success-700">
          Thanks for reaching out — our team will reply to your email shortly.
        </p>
      </div>
    )
  }

  const input = (name: string, label: string, type = "text", autoComplete?: string) => (
    <div>
      <label htmlFor={`c-${name}`} className="text-xs font-semibold text-ink-700">
        {label}
      </label>
      <input
        id={`c-${name}`}
        type={type}
        autoComplete={autoComplete}
        value={String(form.values[name] ?? "")}
        onChange={(e) => form.set(name, e.target.value)}
        aria-invalid={Boolean(form.errors[name])}
        className={fieldClass}
      />
      {form.errors[name] && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
          {form.errors[name]}
        </p>
      )}
    </div>
  )

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void form
          .submit(
            (raw) => ({
              name: raw.name,
              email: raw.email,
              phone: String(raw.phone).replace(/\s/g, "") || undefined,
              subject: raw.subject || undefined,
              message: raw.message,
            }),
            async (data) => {
              await apiRequest(PUBLIC_API_URL, "/api/contact", {
                method: "POST",
                body: data,
              })
            }
          )
          .then((ok) => ok && setSent(true))
      }}
      className="rounded-3xl border border-ink-100 bg-white p-6 sm:p-8"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {input("name", "Full name", "text", "name")}
        {input("email", "Email", "email", "email")}
        {input("phone", "Mobile (optional)", "tel", "tel")}
        {input("subject", "Subject (optional)")}
      </div>
      <div className="mt-4">
        <label htmlFor="c-message" className="text-xs font-semibold text-ink-700">
          Message
        </label>
        <textarea
          id="c-message"
          rows={5}
          value={String(form.values.message ?? "")}
          onChange={(e) => form.set("message", e.target.value)}
          aria-invalid={Boolean(form.errors.message)}
          placeholder="How can we help?"
          className={textareaClass}
        />
        {form.errors.message && (
          <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
            {form.errors.message}
          </p>
        )}
      </div>
      {form.formError && (
        <p role="alert" className="mt-4 rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600">
          {form.formError}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-5" disabled={form.submitting}>
        {form.submitting && <Loader2 size={18} className="animate-spin" />} Send Message
      </Button>
    </form>
  )
}
