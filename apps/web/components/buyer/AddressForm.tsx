"use client"

import { Loader2 } from "lucide-react"
import type { AddressDto } from "@workspace/types"
import { addressInput } from "@workspace/validators"

import { Button } from "@/components/ui/Button"
import { useApi } from "@/lib/api/client"
import { useZodForm } from "@/components/forms/useZodForm"
import { fieldClass } from "@/components/forms/formStyles"

const FIELDS: {
  name: string
  label: string
  span?: boolean
  autoComplete?: string
  inputMode?: "numeric" | "tel"
}[] = [
  { name: "fullName", label: "Full name", autoComplete: "name" },
  {
    name: "phone",
    label: "Mobile number",
    autoComplete: "tel",
    inputMode: "tel",
  },
  {
    name: "line1",
    label: "Address line 1",
    span: true,
    autoComplete: "address-line1",
  },
  {
    name: "line2",
    label: "Address line 2 (optional)",
    span: true,
    autoComplete: "address-line2",
  },
  { name: "city", label: "City", autoComplete: "address-level2" },
  { name: "state", label: "State", autoComplete: "address-level1" },
  {
    name: "pincode",
    label: "PIN code",
    autoComplete: "postal-code",
    inputMode: "numeric",
  },
  { name: "label", label: "Label (e.g. Site, Office)" },
]

export function AddressForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: AddressDto
  onSaved: (address: AddressDto) => void
  onCancel?: () => void
}) {
  const { request } = useApi()
  const form = useZodForm(addressInput, {
    fullName: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    line1: initial?.line1 ?? "",
    line2: initial?.line2 ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    pincode: initial?.pincode ?? "",
    label: initial?.label ?? "",
    isDefault: initial?.isDefault ?? false,
  })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void form.submit(
          (raw) => ({
            type: "SHIPPING",
            fullName: raw.fullName,
            phone: String(raw.phone).replace(/\s/g, ""),
            line1: raw.line1,
            line2: raw.line2 || undefined,
            city: raw.city,
            state: raw.state,
            pincode: raw.pincode,
            label: raw.label || undefined,
            isDefault: Boolean(raw.isDefault),
          }),
          async (data) => {
            const path = initial ? `/api/me/addresses/${initial.id}` : "/api/me/addresses"
            const res = await request<AddressDto>(path, {
              method: initial ? "PUT" : "POST",
              body: data,
            })
            onSaved(res.data)
          }
        )
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {FIELDS.map((f) => (
        <div key={f.name} className={f.span ? "sm:col-span-2" : undefined}>
          <label htmlFor={`addr-${f.name}`} className="text-xs font-semibold text-ink-700">
            {f.label}
          </label>
          <input
            id={`addr-${f.name}`}
            value={String(form.values[f.name] ?? "")}
            onChange={(e) => form.set(f.name, e.target.value)}
            autoComplete={f.autoComplete}
            inputMode={f.inputMode}
            aria-invalid={Boolean(form.errors[f.name])}
            className={fieldClass}
          />
          {form.errors[f.name] && (
            <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
              {form.errors[f.name]}
            </p>
          )}
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm text-ink-700 sm:col-span-2">
        <input
          type="checkbox"
          checked={Boolean(form.values.isDefault)}
          onChange={(e) => form.set("isDefault", e.target.checked)}
          className="h-4 w-4 accent-[#E8722A]"
        />
        Use as my default address
      </label>
      {form.formError && (
        <p
          role="alert"
          className="rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600 sm:col-span-2"
        >
          {form.formError}
        </p>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={form.submitting}>
          {form.submitting && <Loader2 size={16} className="animate-spin" />} Save address
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
