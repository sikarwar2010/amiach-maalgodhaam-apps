"use client"

import { useState } from "react"
import { CheckCircle2, FileUp, Loader2 } from "lucide-react"
import type { DocumentStatus, VendorDocumentType, VendorStatus, VendorType } from "@workspace/types"
import { vendorProfileUpdateInput } from "@workspace/validators"

import { fieldClass, textareaClass } from "@/components/forms/formStyles"
import { useZodForm } from "@/components/forms/useZodForm"
import { Button } from "@/components/ui/Button"
import { ErrorNote, LoadingRows, Panel, StatusBadge } from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { useResource } from "@/lib/api/use-resource"
import { useOpenFile } from "@/lib/api/use-open-file"
import { PUBLIC_API_URL } from "@/lib/config"

interface VendorProfileData {
  id: string
  vendorType: VendorType
  businessName: string
  contactName: string
  phone: string
  email: string | null
  gstin: string | null
  pan: string | null
  description: string | null
  addressLine: string | null
  city: string
  state: string
  pincode: string
  status: VendorStatus
  rejectionReason: string | null
}

interface DocRow {
  id: string
  type: VendorDocumentType
  name: string
  url: string
  status: DocumentStatus
}

const DOC_TYPES: { value: VendorDocumentType; label: string }[] = [
  { value: "GST_CERTIFICATE", label: "GST certificate" },
  { value: "PAN_CARD", label: "PAN card" },
  { value: "BUSINESS_REGISTRATION", label: "Business registration" },
  { value: "CANCELLED_CHEQUE", label: "Cancelled cheque" },
  { value: "OTHER", label: "Other (e.g. ID proof)" },
]

export function VendorProfile() {
  const profile = useResource<VendorProfileData>("/api/vendor/profile")
  if (profile.error) return <ErrorNote message={profile.error.message} onRetry={() => void profile.reload()} />
  if (profile.loading || !profile.data) return <LoadingRows />
  return (
    <div className="flex flex-col gap-6">
      <ProfileForm data={profile.data} onSaved={() => void profile.reload()} />
      <Documents />
    </div>
  )
}

function ProfileForm({ data, onSaved }: { data: VendorProfileData; onSaved: () => void }) {
  const { request } = useApi()
  const [saved, setSaved] = useState(false)
  const locked = data.status === "APPROVED"
  const form = useZodForm(vendorProfileUpdateInput, {
    businessName: data.businessName,
    contactName: data.contactName,
    phone: data.phone,
    email: data.email ?? "",
    gstin: data.gstin ?? "",
    pan: data.pan ?? "",
    description: data.description ?? "",
    addressLine: data.addressLine ?? "",
    city: data.city,
    state: data.state,
    pincode: data.pincode,
  })

  const input = (name: string, label: string, disabled = false) => (
    <div>
      <label htmlFor={`vp-${name}`} className="text-xs font-semibold text-ink-700">
        {label}
      </label>
      <input
        id={`vp-${name}`}
        disabled={disabled}
        value={String(form.values[name] ?? "")}
        onChange={(e) => form.set(name, e.target.value)}
        aria-invalid={Boolean(form.errors[name])}
        className={`${fieldClass} disabled:bg-ink-50 disabled:text-ink-500`}
      />
      {form.errors[name] && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
          {form.errors[name]}
        </p>
      )}
    </div>
  )

  return (
    <Panel title="Business profile" action={<StatusBadge status={data.status} />}>
      {data.rejectionReason && (
        <p role="alert" className="mb-4 rounded-2xl bg-danger-50 p-3 text-sm text-danger-600">
          Reason: {data.rejectionReason}
        </p>
      )}
      {saved && (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-2xl bg-success-50 p-3 text-sm font-medium text-success-700"
        >
          <CheckCircle2 size={16} /> Saved.
        </p>
      )}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setSaved(false)
          void form
            .submit(
              (raw) => {
                const out: Record<string, unknown> = {}
                for (const [k, val] of Object.entries(raw)) {
                  if (typeof val === "string" && val.trim() !== "")
                    out[k] = k === "phone" ? val.replace(/\s/g, "") : val
                }
                // Tax identifiers cannot change after approval; don't send them.
                if (locked) {
                  delete out.gstin
                  delete out.pan
                }
                return out
              },
              async (parsed) => {
                await request("/api/vendor/profile", {
                  method: "PATCH",
                  body: parsed,
                })
              }
            )
            .then((ok) => {
              if (ok) {
                setSaved(true)
                onSaved()
              }
            })
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {input("businessName", "Business name")}
        {input("contactName", "Contact person")}
        {input("phone", "Mobile number")}
        {input("email", "Email")}
        {data.vendorType === "BUSINESS" && (
          <>
            {input("gstin", "GSTIN", locked)}
            {input("pan", "PAN", locked)}
            <div className="sm:col-span-2">{input("addressLine", "Address")}</div>
          </>
        )}
        {input("city", "City")}
        {input("state", "State")}
        {input("pincode", "PIN code")}
        <div className="sm:col-span-2">
          <label htmlFor="vp-description" className="text-xs font-semibold text-ink-700">
            About your business
          </label>
          <textarea
            id="vp-description"
            rows={4}
            value={String(form.values.description ?? "")}
            onChange={(e) => form.set("description", e.target.value)}
            className={textareaClass}
          />
        </div>
        {locked && (
          <p className="text-xs text-ink-500 sm:col-span-2">
            Tax identifiers are locked after approval. Contact support to change them.
          </p>
        )}
        {form.formError && (
          <p role="alert" className="text-sm text-danger-600 sm:col-span-2">
            {form.formError}
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={form.submitting || data.status === "SUSPENDED"}>
            {form.submitting && <Loader2 size={16} className="animate-spin" />} Save profile
          </Button>
        </div>
      </form>
    </Panel>
  )
}

function Documents() {
  const { request, getToken } = useApi()
  const openFile = useOpenFile()
  const docs = useResource<DocRow[]>("/api/vendor/documents")
  const [type, setType] = useState<VendorDocumentType>("GST_CERTIFICATE")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const token = await getToken()
      const body = new FormData()
      body.set("kind", "vendor-document")
      body.set("file", file)
      const res = await fetch(`${PUBLIC_API_URL}/api/uploads`, {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body,
      })
      const json = (await res.json()) as {
        success: boolean
        data?: { url: string }
        error?: { message: string }
      }
      if (!res.ok || !json.success || !json.data) throw new Error(json.error?.message ?? "Upload failed")
      await request("/api/vendor/documents", {
        method: "POST",
        body: { type, name: file.name.slice(0, 120), url: json.data.url },
      })
      await docs.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    await request(`/api/vendor/documents/${id}`, { method: "DELETE" }).catch(() => undefined)
    await docs.reload()
  }

  return (
    <Panel title="Verification documents">
      <p className="text-xs text-ink-500">Only you and the MaalGodaam review team can open these files.</p>
      {docs.loading ? (
        <div className="mt-3">
          <LoadingRows rows={2} />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-ink-100 text-sm">
          {(docs.data ?? []).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <button
                  type="button"
                  onClick={() =>
                    void openFile(d.url).catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : "Could not open file")
                    )
                  }
                  className="block max-w-full truncate text-left font-semibold text-brand-700 hover:underline"
                >
                  {d.name}
                </button>
                <span className="text-xs text-ink-500">{DOC_TYPES.find((t) => t.value === d.type)?.label}</span>
              </span>
              <span className="flex items-center gap-3">
                <StatusBadge status={d.status} />
                <button
                  onClick={() => void remove(d.id)}
                  className="text-xs font-semibold text-danger-600 hover:underline"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
          {(docs.data ?? []).length === 0 && <li className="py-2 text-ink-500">No documents uploaded yet.</li>}
        </ul>
      )}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          aria-label="Document type"
          value={type}
          onChange={(e) => setType(e.target.value as VendorDocumentType)}
          className={`${fieldClass} sm:w-64`}
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-4 text-sm font-semibold text-ink-700 hover:border-brand-300">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}{" "}
          {busy ? "Uploading…" : "Upload PDF or image"}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void upload(f)
              e.target.value = ""
            }}
          />
        </label>
      </div>
      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}
    </Panel>
  )
}
