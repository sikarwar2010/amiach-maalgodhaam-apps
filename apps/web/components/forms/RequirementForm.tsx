"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarClock, CheckCircle2, Loader2, PackageSearch } from "lucide-react"
import type { CategoryDto, LocationDto } from "@workspace/types"
import { createInquiryInput } from "@workspace/validators"

import { Button } from "@/components/ui/Button"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { MATERIAL_UNITS } from "@workspace/types"
import { unitLabels } from "@/lib/labels"

import { fieldClass, textareaClass } from "./formStyles"
import { useZodForm } from "./useZodForm"

function SectionHeader({ icon: Icon, title }: { icon: typeof PackageSearch; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon size={17} />
      </span>
      <h3 className="text-sm font-bold text-ink-900">{title}</h3>
    </div>
  )
}

/** An open requirement is an RFQ with no product or vendor: every approved supplier can quote, the buyer stays anonymous. */
export function RequirementForm({ categories, locations }: { categories: CategoryDto[]; locations: LocationDto[] }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { request, isSignedIn, isLoaded } = useApi()
  const [done, setDone] = useState(false)
  const [needsBusiness, setNeedsBusiness] = useState(false)

  const categorySlug = searchParams.get("category") ?? ""
  const form = useZodForm(createInquiryInput, {
    material: searchParams.get("material") ?? "",
    category: categorySlug,
    deliveryCity: "",
    quantity: "",
    unit: "SQ_FT",
    budget: "",
    neededBy: "",
    extra: "",
  })

  if (done) {
    return (
      <div role="status" className="flex flex-col items-center rounded-3xl bg-success-50 px-6 py-10 text-center">
        <CheckCircle2 size={32} className="text-success-600" />
        <h3 className="text-success-800 mt-3 text-lg font-bold">Requirement posted</h3>
        <p className="mt-1.5 max-w-sm text-sm text-success-700">
          Verified suppliers can now quote on your requirement. You&apos;ll see quotes in your dashboard.
        </p>
        <Button href="/buyer/inquiries" className="mt-5">
          View my requirements
        </Button>
      </div>
    )
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className="rounded-3xl bg-ink-25 p-6 text-center ring-1 ring-ink-100 ring-inset">
        <p className="text-sm text-ink-600">Sign in with a business account to post a requirement.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button href={`/login?redirect_url=${encodeURIComponent(pathname)}`}>Sign in</Button>
          <Button href="/register/customer/b2b" variant="outline">
            Create business account
          </Button>
        </div>
      </div>
    )
  }

  const err = (name: string) =>
    form.errors[name] ? (
      <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
        {form.errors[name]}
      </p>
    ) : null

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setNeedsBusiness(false)
        void form
          .submit(
            (raw) => {
              const categoryName = categories.find((c) => c.slug === raw.category)?.name
              const details = [
                categoryName ? `Category: ${categoryName}` : null,
                raw.budget ? `Budget: ${raw.budget}` : null,
                raw.extra ? String(raw.extra) : null,
              ]
                .filter(Boolean)
                .join("\n")
              return {
                title: raw.material,
                description: details || `Looking for ${String(raw.material)}.`,
                quantity: Number(raw.quantity),
                unit: raw.unit,
                deliveryCity: raw.deliveryCity,
                neededBy: raw.neededBy ? new Date(String(raw.neededBy)).toISOString() : undefined,
              }
            },
            async (data) => {
              try {
                await request("/api/b2b/inquiries", {
                  method: "POST",
                  body: data,
                })
              } catch (e) {
                if (e instanceof ApiError && e.status === 403) setNeedsBusiness(true)
                if (e instanceof ApiError && e.status === 401)
                  router.push(`/login?redirect_url=${encodeURIComponent(pathname)}`)
                throw e
              }
            }
          )
          .then((ok) => ok && setDone(true))
      }}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-4">
        <SectionHeader icon={PackageSearch} title="What do you need?" />
        <div className="grid grid-cols-1 gap-4 pl-12 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="r-material" className="text-xs font-semibold text-ink-700">
              Material
            </label>
            <input
              id="r-material"
              value={String(form.values.material)}
              onChange={(e) => form.set("material", e.target.value)}
              placeholder="e.g. Vitrified floor tiles"
              className={fieldClass}
              aria-invalid={Boolean(form.errors.title)}
            />
            {form.errors.title && (
              <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
                {form.errors.title}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="r-cat" className="text-xs font-semibold text-ink-700">
              Category
            </label>
            <select
              id="r-cat"
              value={String(form.values.category)}
              onChange={(e) => form.set("category", e.target.value)}
              className={fieldClass}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="r-city" className="text-xs font-semibold text-ink-700">
              Delivery city
            </label>
            <input
              id="r-city"
              list="r-city-list"
              value={String(form.values.deliveryCity)}
              onChange={(e) => form.set("deliveryCity", e.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(form.errors.deliveryCity)}
            />
            <datalist id="r-city-list">
              {locations.map((l) => (
                <option key={`${l.city}-${l.state}`} value={l.city} />
              ))}
            </datalist>
            {err("deliveryCity")}
          </div>
          <div>
            <label htmlFor="r-qty" className="text-xs font-semibold text-ink-700">
              Quantity
            </label>
            <input
              id="r-qty"
              type="number"
              min={1}
              inputMode="numeric"
              value={String(form.values.quantity)}
              onChange={(e) => form.set("quantity", e.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(form.errors.quantity)}
            />
            {err("quantity")}
          </div>
          <div>
            <label htmlFor="r-unit" className="text-xs font-semibold text-ink-700">
              Unit
            </label>
            <select
              id="r-unit"
              value={String(form.values.unit)}
              onChange={(e) => form.set("unit", e.target.value)}
              className={fieldClass}
            >
              {MATERIAL_UNITS.map((u) => (
                <option key={u} value={u}>
                  {unitLabels[u]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="h-px bg-ink-100" />

      <div className="flex flex-col gap-4">
        <SectionHeader icon={CalendarClock} title="Budget & Timeline" />
        <div className="grid grid-cols-1 gap-4 pl-12 sm:grid-cols-2">
          <div>
            <label htmlFor="r-budget" className="text-xs font-semibold text-ink-700">
              Budget (optional)
            </label>
            <input
              id="r-budget"
              value={String(form.values.budget)}
              onChange={(e) => form.set("budget", e.target.value)}
              placeholder="e.g. ₹1,00,000 – ₹1,50,000"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="r-date" className="text-xs font-semibold text-ink-700">
              Required by
            </label>
            <input
              id="r-date"
              type="date"
              value={String(form.values.neededBy)}
              onChange={(e) => form.set("neededBy", e.target.value)}
              className={fieldClass + " text-ink-700"}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="r-extra" className="text-xs font-semibold text-ink-700">
              Additional requirements
            </label>
            <textarea
              id="r-extra"
              rows={4}
              maxLength={2000}
              value={String(form.values.extra)}
              onChange={(e) => form.set("extra", e.target.value)}
              placeholder="Grade, finish, brand preference, delivery constraints..."
              className={textareaClass}
            />
            {form.errors.description && (
              <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
                {form.errors.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {needsBusiness && (
        <p role="alert" className="rounded-xl bg-accent-50 px-3.5 py-3 text-sm text-accent-800">
          Requirements are for business buyers. Add your business name and GSTIN in{" "}
          <Link href="/buyer/profile" className="font-bold underline">
            your profile
          </Link>{" "}
          and try again.
        </p>
      )}
      {form.formError && !needsBusiness && (
        <p role="alert" className="rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600">
          {form.formError}
        </p>
      )}

      <Button type="submit" size="lg" className="mt-1" disabled={form.submitting}>
        {form.submitting ? <Loader2 size={18} className="animate-spin" /> : null} Post Your Requirement
        {!form.submitting && <CheckCircle2 size={18} />}
      </Button>
    </form>
  )
}
