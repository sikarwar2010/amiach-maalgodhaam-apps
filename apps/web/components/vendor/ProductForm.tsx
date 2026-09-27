"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import { ArrowDown, ArrowUp, Loader2, Plus, Star, Trash2, Upload } from "lucide-react"
import type { CategoryDto, DealType, LogisticsMethod, MaterialUnit, ProductCondition } from "@workspace/types"
import { createProductInput } from "@workspace/validators"

import { fieldClass, textareaClass } from "@/components/forms/formStyles"
import { Button } from "@/components/ui/Button"
import { ErrorNote, Panel } from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { PUBLIC_API_URL } from "@/lib/config"
import {
  CONDITIONS,
  DEAL_TYPES,
  UNITS,
  conditionLabels,
  dealTypeLabels,
  logisticsLabels,
  unitLabels,
} from "@/lib/labels"

export interface ProductFormValues {
  id?: string
  title: string
  brand: string
  description: string
  categoryId: string
  subCategoryId: string
  condition: ProductCondition
  dealType: DealType
  unit: MaterialUnit
  price: string
  marketValue: string
  minOrderQty: string
  quantity: string
  city: string
  state: string
  pincode: string
  logisticsMethods: LogisticsMethod[]
  conditionNotes: string
  specifications: { label: string; value: string }[]
  tags: string
  images: { url: string; alt: string }[]
  bulkPrices: { minQty: string; maxQty: string; unitPrice: string }[]
}

export const EMPTY_PRODUCT: ProductFormValues = {
  title: "",
  brand: "",
  description: "",
  categoryId: "",
  subCategoryId: "",
  condition: "SURPLUS",
  dealType: "BUY_NOW",
  unit: "SQ_FT",
  price: "",
  marketValue: "",
  minOrderQty: "1",
  quantity: "",
  city: "",
  state: "",
  pincode: "",
  logisticsMethods: [],
  conditionNotes: "",
  specifications: [],
  tags: "",
  images: [],
  bulkPrices: [],
}

const LOGISTICS = Object.keys(logisticsLabels) as LogisticsMethod[]

const optNum = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v))

export function ProductForm({
  initial = EMPTY_PRODUCT,
  categories,
  canSubmit = false,
}: {
  initial?: ProductFormValues
  categories: CategoryDto[]
  /** Approved vendors can send a product straight to review; pending vendors can only save drafts. */
  canSubmit?: boolean
}) {
  const router = useRouter()
  const { request, getToken } = useApi()
  const [v, setV] = useState<ProductFormValues>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(initial.id)
  const [uploading, setUploading] = useState(false)

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setV((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }))
  }

  const subCategories = categories.find((c) => c.id === v.categoryId)?.subCategories ?? []

  const uploadImages = async (files: FileList) => {
    setUploading(true)
    setFormError(null)
    try {
      const token = await getToken()
      const added: { url: string; alt: string }[] = []
      for (const file of Array.from(files)) {
        const body = new FormData()
        body.set("kind", "product-image")
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
        added.push({ url: json.data.url, alt: "" })
      }
      set("images", [...v.images, ...added].slice(0, 12))
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const move = (index: number, delta: number) => {
    const next = [...v.images]
    const target = index + delta
    const a = next[index]
    const b = next[target]
    if (!a || !b) return
    next[index] = b
    next[target] = a
    set("images", next)
  }

  const submit = async (e: React.SyntheticEvent, forReview = false) => {
    e.preventDefault()
    setFormError(null)
    const payload = {
      title: v.title,
      brand: v.brand || undefined,
      description: v.description,
      categoryId: v.categoryId,
      subCategoryId: v.subCategoryId || undefined,
      condition: v.condition,
      dealType: v.dealType,
      unit: v.unit,
      price: optNum(v.price),
      marketValue: optNum(v.marketValue),
      minOrderQty: optNum(v.minOrderQty),
      quantity: optNum(v.quantity),
      city: v.city,
      state: v.state,
      pincode: v.pincode || undefined,
      logisticsMethods: v.logisticsMethods,
      conditionNotes: v.conditionNotes || undefined,
      specifications: v.specifications.filter((s) => s.label.trim() && s.value.trim()),
      tags: v.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images: v.images.map((i) => ({
        url: i.url,
        ...(i.alt ? { alt: i.alt } : {}),
      })),
      bulkPrices: v.bulkPrices
        .filter((b) => b.minQty && b.unitPrice)
        .map((b) => ({
          minQty: Number(b.minQty),
          ...(b.maxQty ? { maxQty: Number(b.maxQty) } : {}),
          unitPrice: Number(b.unitPrice),
        })),
    }
    const parsed = createProductInput.safeParse(payload)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form")
        if (!next[key]) next[key] = issue.message
      }
      setErrors(next)
      setFormError("Please fix the highlighted fields.")
      return
    }

    setSaving(true)
    try {
      let id = savedId
      if (id) {
        await request(`/api/vendor/products/${id}`, {
          method: "PATCH",
          body: parsed.data,
        })
      } else {
        const created = await request<{ id: string }>("/api/vendor/products", {
          method: "POST",
          body: parsed.data,
        })
        id = created.data.id
        // From here on this form edits the product it just created, so a retry never duplicates it.
        setSavedId(id)
      }
      if (forReview) {
        await request(`/api/vendor/products/${id}/status`, {
          method: "POST",
          body: { status: "PENDING_REVIEW" },
        })
      }
      router.push("/vendor/products")
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.details.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.path.split(".")[0] ?? "form", d.message])))
        setFormError("The server rejected some fields.")
      } else {
        setFormError(err instanceof ApiError ? err.message : "Could not save this product.")
      }
    } finally {
      setSaving(false)
    }
  }

  const err = (key: string) =>
    errors[key] ? (
      <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
        {errors[key]}
      </p>
    ) : null
  const label = "text-xs font-semibold text-ink-700"

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <Panel title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="pf-title" className={label}>
              Title
            </label>
            <input
              id="pf-title"
              value={v.title}
              onChange={(e) => set("title", e.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(errors.title)}
            />
            {err("title")}
          </div>
          <div>
            <label htmlFor="pf-brand" className={label}>
              Brand
            </label>
            <input
              id="pf-brand"
              value={v.brand}
              onChange={(e) => set("brand", e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="pf-cat" className={label}>
              Category
            </label>
            <select
              id="pf-cat"
              value={v.categoryId}
              onChange={(e) => {
                set("categoryId", e.target.value)
                set("subCategoryId", "")
              }}
              className={fieldClass}
              aria-invalid={Boolean(errors.categoryId)}
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {err("categoryId")}
          </div>
          {subCategories.length > 0 && (
            <div>
              <label htmlFor="pf-sub" className={label}>
                Sub-category
              </label>
              <select
                id="pf-sub"
                value={v.subCategoryId}
                onChange={(e) => set("subCategoryId", e.target.value)}
                className={fieldClass}
              >
                <option value="">None</option>
                {subCategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="pf-cond" className={label}>
              Condition
            </label>
            <select
              id="pf-cond"
              value={v.condition}
              onChange={(e) => set("condition", e.target.value as ProductCondition)}
              className={fieldClass}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {conditionLabels[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pf-deal" className={label}>
              Deal type
            </label>
            <select
              id="pf-deal"
              value={v.dealType}
              onChange={(e) => set("dealType", e.target.value as DealType)}
              className={fieldClass}
            >
              {DEAL_TYPES.map((d) => (
                <option key={d} value={d}>
                  {dealTypeLabels[d]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="pf-desc" className={label}>
              Description
            </label>
            <textarea
              id="pf-desc"
              rows={5}
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              className={textareaClass}
              aria-invalid={Boolean(errors.description)}
            />
            {err("description")}
          </div>
        </div>
      </Panel>

      <Panel title="Pricing & stock">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pf-unit" className={label}>
              Unit
            </label>
            <select
              id="pf-unit"
              value={v.unit}
              onChange={(e) => set("unit", e.target.value as MaterialUnit)}
              className={fieldClass}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {unitLabels[u]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pf-price" className={label}>
              Price per unit (₹)
            </label>
            <input
              id="pf-price"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={v.price}
              onChange={(e) => set("price", e.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(errors.price)}
            />
            {err("price")}
          </div>
          <div>
            <label htmlFor="pf-mv" className={label}>
              Market value per unit (₹)
            </label>
            <input
              id="pf-mv"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={v.marketValue}
              onChange={(e) => set("marketValue", e.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(errors.marketValue)}
            />
            {err("marketValue")}
          </div>
          <div>
            <label htmlFor="pf-qty" className={label}>
              Quantity available
            </label>
            <input
              id="pf-qty"
              type="number"
              min={0}
              inputMode="numeric"
              value={v.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(errors.quantity)}
            />
            {err("quantity")}
          </div>
          <div>
            <label htmlFor="pf-moq" className={label}>
              Minimum order quantity
            </label>
            <input
              id="pf-moq"
              type="number"
              min={1}
              inputMode="numeric"
              value={v.minOrderQty}
              onChange={(e) => set("minOrderQty", e.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(errors.minOrderQty)}
            />
            {err("minOrderQty")}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-900">Bulk price tiers (B2B)</h3>
            <button
              type="button"
              onClick={() => set("bulkPrices", [...v.bulkPrices, { minQty: "", maxQty: "", unitPrice: "" }])}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"
            >
              <Plus size={13} /> Add tier
            </button>
          </div>
          {v.bulkPrices.map((b, i) => (
            <div key={i} className="mt-2 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
              <input
                aria-label="Tier minimum quantity"
                placeholder="Min qty"
                type="number"
                value={b.minQty}
                onChange={(e) =>
                  set(
                    "bulkPrices",
                    v.bulkPrices.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x))
                  )
                }
                className={fieldClass}
              />
              <input
                aria-label="Tier maximum quantity"
                placeholder="Max qty (optional)"
                type="number"
                value={b.maxQty}
                onChange={(e) =>
                  set(
                    "bulkPrices",
                    v.bulkPrices.map((x, j) => (j === i ? { ...x, maxQty: e.target.value } : x))
                  )
                }
                className={fieldClass}
              />
              <input
                aria-label="Tier unit price"
                placeholder="₹ / unit"
                type="number"
                step="0.01"
                value={b.unitPrice}
                onChange={(e) =>
                  set(
                    "bulkPrices",
                    v.bulkPrices.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x))
                  )
                }
                className={fieldClass}
              />
              <button
                type="button"
                aria-label="Remove tier"
                onClick={() =>
                  set(
                    "bulkPrices",
                    v.bulkPrices.filter((_, j) => j !== i)
                  )
                }
                className="h-11 px-2 text-ink-400 hover:text-danger-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {err("bulkPrices")}
        </div>
      </Panel>

      <Panel title="Location & logistics">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pf-city" className={label}>
              City
            </label>
            <input
              id="pf-city"
              value={v.city}
              onChange={(e) => set("city", e.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(errors.city)}
            />
            {err("city")}
          </div>
          <div>
            <label htmlFor="pf-state" className={label}>
              State
            </label>
            <input
              id="pf-state"
              value={v.state}
              onChange={(e) => set("state", e.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(errors.state)}
            />
            {err("state")}
          </div>
          <div>
            <label htmlFor="pf-pin" className={label}>
              PIN code
            </label>
            <input
              id="pf-pin"
              value={v.pincode}
              onChange={(e) => set("pincode", e.target.value)}
              className={fieldClass}
              aria-invalid={Boolean(errors.pincode)}
            />
            {err("pincode")}
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className={label}>Logistics you offer</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {LOGISTICS.map((m) => (
              <label key={m} className="inline-flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="accent-[#E8722A]"
                  checked={v.logisticsMethods.includes(m)}
                  onChange={(e) =>
                    set(
                      "logisticsMethods",
                      e.target.checked ? [...v.logisticsMethods, m] : v.logisticsMethods.filter((x) => x !== m)
                    )
                  }
                />
                {logisticsLabels[m]}
              </label>
            ))}
          </div>
        </fieldset>
      </Panel>

      <Panel title="Details">
        <div className="grid gap-4">
          <div>
            <label htmlFor="pf-notes" className={label}>
              Condition notes
            </label>
            <textarea
              id="pf-notes"
              rows={3}
              value={v.conditionNotes}
              onChange={(e) => set("conditionNotes", e.target.value)}
              className={textareaClass}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className={label}>Specifications</span>
              <button
                type="button"
                onClick={() => set("specifications", [...v.specifications, { label: "", value: "" }])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {v.specifications.map((s, i) => (
              <div key={i} className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  aria-label="Specification name"
                  placeholder="e.g. Size"
                  value={s.label}
                  onChange={(e) =>
                    set(
                      "specifications",
                      v.specifications.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                    )
                  }
                  className={fieldClass}
                />
                <input
                  aria-label="Specification value"
                  placeholder="e.g. 600x600 mm"
                  value={s.value}
                  onChange={(e) =>
                    set(
                      "specifications",
                      v.specifications.map((x, j) => (j === i ? { ...x, value: e.target.value } : x))
                    )
                  }
                  className={fieldClass}
                />
                <button
                  type="button"
                  aria-label="Remove specification"
                  onClick={() =>
                    set(
                      "specifications",
                      v.specifications.filter((_, j) => j !== i)
                    )
                  }
                  className="px-2 text-ink-400 hover:text-danger-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div>
            <label htmlFor="pf-tags" className={label}>
              Search tags (comma separated)
            </label>
            <input id="pf-tags" value={v.tags} onChange={(e) => set("tags", e.target.value)} className={fieldClass} />
          </div>
        </div>
      </Panel>

      <Panel title="Images">
        <p className="text-xs text-ink-500">
          JPG, PNG or WebP up to 5 MB each. The first image is the cover; reorder or star to change it.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {v.images.map((img, i) => (
            <div key={img.url} className="overflow-hidden rounded-2xl border border-ink-100">
              <div className="relative aspect-square bg-ink-100">
                <Image src={img.url} alt="" fill sizes="160px" className="object-cover" />
                {i === 0 && (
                  <span className="absolute top-2 left-2 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    COVER
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-1.5">
                <button
                  type="button"
                  aria-label="Move earlier"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="p-1 text-ink-500 disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Make cover"
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...v.images]
                    const [it] = next.splice(i, 1)
                    if (it) set("images", [it, ...next])
                  }}
                  className="p-1 text-ink-500 disabled:opacity-30"
                >
                  <Star size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Move later"
                  disabled={i === v.images.length - 1}
                  onClick={() => move(i, 1)}
                  className="p-1 text-ink-500 disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() =>
                    set(
                      "images",
                      v.images.filter((_, j) => j !== i)
                    )
                  }
                  className="p-1 text-danger-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {v.images.length < 12 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ink-300 text-xs font-semibold text-ink-500 hover:border-brand-300">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? "Uploading…" : "Add images"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  if (e.target.files?.length) void uploadImages(e.target.files)
                  e.target.value = ""
                }}
              />
            </label>
          )}
        </div>
      </Panel>

      {formError && <ErrorNote message={formError} />}
      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={saving || uploading}>
          {saving && <Loader2 size={18} className="animate-spin" />} {savedId ? "Save changes" : "Save as draft"}
        </Button>
        {canSubmit && (
          <Button
            type="button"
            variant="brand"
            size="lg"
            disabled={saving || uploading}
            onClick={(e) => void submit(e, true)}
          >
            Save &amp; submit for review
          </Button>
        )}
        <Button type="button" variant="ghost" size="lg" onClick={() => router.push("/vendor/products")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
