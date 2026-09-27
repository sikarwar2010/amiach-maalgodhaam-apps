"use client"

import { Check, FileUp, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CategoryDto } from "@workspace/types"
import type { Field } from "@/lib/auth/onboarding-schema"
import { fieldClass, textareaClass } from "@/components/forms/formStyles"

type Value = string | string[] | boolean | undefined

export function FieldControl({
  field,
  value,
  error,
  categories,
  onChange,
  onFile,
}: {
  field: Field
  value: Value
  error?: string
  categories: CategoryDto[]
  onChange: (v: string | string[] | boolean) => void
  /** Receives the actual File for `file` fields (the text value only carries its name). */
  onFile?: (file: File | null) => void
}) {
  const id = `f-${field.name}`
  const describedBy =
    [error ? `${id}-err` : null, field.hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined
  const invalid = Boolean(error)
  const inputClass = cn(
    fieldClass,
    invalid && "border-danger-500 bg-danger-50/40 focus:border-danger-500 focus:ring-danger-50"
  )

  const options =
    field.optionsFrom === "categories"
      ? categories.map((c) => ({ value: c.slug, label: c.name }))
      : (field.options ?? [])

  let control: React.ReactNode

  if (field.kind === "checkbox") {
    control = (
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-ink-200 bg-ink-25 p-4 text-sm leading-relaxed text-ink-700"
      >
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#E8722A]"
        />
        {field.label}
      </label>
    )
  } else if (field.kind === "multiselect") {
    const selected = Array.isArray(value) ? value : []
    control = (
      <div
        id={id}
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        className="mt-2 flex flex-wrap gap-2"
      >
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                on
                  ? "border-accent-500 bg-accent-50 text-accent-800"
                  : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
              )}
            >
              {on && <Check size={14} />} {o.label}
            </button>
          )
        })}
      </div>
    )
  } else if (field.kind === "select") {
    control = (
      <select
        id={id}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={inputClass}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  } else if (field.kind === "textarea") {
    control = (
      <textarea
        id={id}
        rows={3}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={textareaClass}
      />
    )
  } else if (field.kind === "file") {
    const name = typeof value === "string" ? value : ""
    control = (
      <div className="mt-1.5">
        <label
          htmlFor={id}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed bg-ink-25 px-4 py-3.5 text-sm transition-colors focus-within:ring-4 focus-within:ring-brand-50 hover:border-brand-300",
            invalid ? "border-danger-500" : "border-ink-300"
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <FileUp size={17} />
          </span>
          <span className="min-w-0 flex-1 truncate text-ink-600">{name || "Choose a file to upload"}</span>
          {name && (
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={(e) => {
                e.preventDefault()
                onChange("")
                onFile?.(null)
              }}
              className="rounded-full p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            >
              <X size={15} />
            </button>
          )}
        </label>
        <input
          id={id}
          type="file"
          accept={field.accept}
          className="sr-only"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f && f.size > 5 * 1024 * 1024) {
              onChange("")
              onFile?.(null)
            } else {
              onChange(f?.name ?? "")
              onFile?.(f ?? null)
            }
          }}
        />
      </div>
    )
  } else {
    control = (
      <input
        id={id}
        type={field.kind === "number" ? "number" : field.kind}
        inputMode={field.kind === "tel" ? "numeric" : undefined}
        autoComplete={field.kind === "email" ? "email" : field.kind === "tel" ? "tel" : undefined}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={inputClass}
      />
    )
  }

  return (
    <div className={field.span === 2 ? "sm:col-span-2" : undefined}>
      {field.kind !== "checkbox" && (
        <label id={`${id}-label`} htmlFor={id} className="text-xs font-semibold text-ink-700">
          {field.label}{" "}
          {field.required && (
            <span className="text-accent-600" aria-hidden>
              *
            </span>
          )}
          {field.required && <span className="sr-only">(required)</span>}
        </label>
      )}
      {control}
      {field.hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-400">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  )
}
