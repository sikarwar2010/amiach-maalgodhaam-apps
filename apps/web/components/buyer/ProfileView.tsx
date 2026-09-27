"use client"

import { useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import type { SessionUser } from "@workspace/types"
import { buyerProfileInput, updateProfileInput } from "@workspace/validators"

import { fieldClass } from "@/components/forms/formStyles"
import { useZodForm } from "@/components/forms/useZodForm"
import { Button } from "@/components/ui/Button"
import { ErrorNote, LoadingRows, Panel } from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { useResource } from "@/lib/api/use-resource"

interface BuyerProfile {
  buyerType: "INDIVIDUAL" | "BUSINESS"
  companyName: string | null
  gstin: string | null
  pan: string | null
  businessType: string | null
  about: string | null
}

export function ProfileView() {
  const me = useResource<SessionUser>("/api/me")
  const profile = useResource<BuyerProfile | null>("/api/me/buyer-profile")

  if (me.error) return <ErrorNote message={me.error.message} onRetry={() => void me.reload()} />
  if (me.loading || profile.loading || !me.data) return <LoadingRows rows={3} />
  return <ProfileForms me={me.data} profile={profile.data} />
}

function Field({
  form,
  name,
  label,
  hint,
}: {
  form: Pick<ReturnType<typeof useZodForm>, "values" | "errors" | "set">
  name: string
  label: string
  hint?: string
}) {
  return (
    <div>
      <label htmlFor={`p-${name}`} className="text-xs font-semibold text-ink-700">
        {label}
      </label>
      <input
        id={`p-${name}`}
        value={String(form.values[name] ?? "")}
        onChange={(e) => form.set(name, e.target.value)}
        aria-invalid={Boolean(form.errors[name])}
        className={fieldClass}
      />
      {hint && !form.errors[name] && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {form.errors[name] && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
          {form.errors[name]}
        </p>
      )}
    </div>
  )
}

function ProfileForms({ me, profile }: { me: SessionUser; profile: BuyerProfile | null }) {
  const { request } = useApi()
  const [saved, setSaved] = useState(false)

  const personal = useZodForm(updateProfileInput, {
    name: me.name ?? "",
    phone: me.phone ?? "",
  })
  const business = useZodForm(buyerProfileInput, {
    buyerType: profile?.buyerType ?? "INDIVIDUAL",
    companyName: profile?.companyName ?? "",
    gstin: profile?.gstin ?? "",
    pan: profile?.pan ?? "",
    businessType: profile?.businessType ?? "",
    about: profile?.about ?? "",
  })

  return (
    <div className="flex flex-col gap-6">
      {saved && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-success-50 p-3 text-sm font-medium text-success-700"
        >
          <CheckCircle2 size={16} /> Saved.
        </p>
      )}

      <Panel title="Your details">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            setSaved(false)
            void personal
              .submit(
                (raw) => ({
                  name: raw.name || undefined,
                  phone: String(raw.phone).replace(/\s/g, "") || undefined,
                }),
                async (data) => {
                  await request("/api/me", { method: "PATCH", body: data })
                }
              )
              .then((ok) => ok && setSaved(true))
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field form={personal} name="name" label="Full name" />
          <Field form={personal} name="phone" label="Mobile number" />
          <p className="text-xs text-ink-500 sm:col-span-2">Email: {me.email}</p>
          {personal.formError && (
            <p role="alert" className="text-sm text-danger-600 sm:col-span-2">
              {personal.formError}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={personal.submitting}>
              {personal.submitting && <Loader2 size={16} className="animate-spin" />} Save details
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Business profile (for B2B quotes)">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            setSaved(false)
            void business
              .submit(
                (raw) => ({
                  buyerType: raw.buyerType,
                  companyName: raw.companyName || undefined,
                  gstin: raw.gstin || undefined,
                  pan: raw.pan || undefined,
                  businessType: raw.businessType || undefined,
                  about: raw.about || undefined,
                }),
                async (data) => {
                  await request("/api/me/buyer-profile", {
                    method: "PUT",
                    body: data,
                  })
                }
              )
              .then((ok) => ok && setSaved(true))
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div>
            <label htmlFor="p-buyerType" className="text-xs font-semibold text-ink-700">
              Account type
            </label>
            <select
              id="p-buyerType"
              value={String(business.values.buyerType)}
              onChange={(e) => business.set("buyerType", e.target.value)}
              className={fieldClass}
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="BUSINESS">Business</option>
            </select>
          </div>
          <Field form={business} name="companyName" label="Company / firm name" />
          <Field form={business} name="gstin" label="GSTIN" hint="Required to request B2B quotes." />
          <Field form={business} name="pan" label="PAN" />
          <Field form={business} name="businessType" label="Business type" />
          {business.formError && (
            <p role="alert" className="text-sm text-danger-600 sm:col-span-2">
              {business.formError}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={business.submitting}>
              {business.submitting && <Loader2 size={16} className="animate-spin" />} Save business profile
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
