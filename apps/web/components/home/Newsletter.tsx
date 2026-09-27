"use client"

import { useState } from "react"
import { CheckCircle2, Mail } from "lucide-react"

export function Newsletter() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  return (
    <section className="py-16 sm:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl rounded-4xl border border-ink-100 bg-white px-6 py-12 text-center shadow-soft-sm sm:px-12">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
            <Mail size={22} />
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900">
            Get the Best Material Deals in Your Inbox
          </h2>
          <p className="mt-2 text-ink-500">New listings · Price drops · Bulk opportunities</p>

          {submitted ? (
            <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-2 rounded-2xl bg-success-50 px-4 py-3 text-sm font-semibold text-success-700">
              <CheckCircle2 size={18} />
              You&apos;re subscribed. Watch your inbox.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (email.trim()) setSubmitted(true)
              }}
              className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row"
            >
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Business email address"
                className="h-12 w-full rounded-xl border border-ink-200 px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-xl bg-accent-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
              >
                Get Deal Alerts
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
