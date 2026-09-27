"use client"

import Image from "next/image"
import { useState } from "react"
import { CheckCircle2, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { categoryInput } from "@workspace/validators"

import { fieldClass, textareaClass } from "@/components/forms/formStyles"
import { Button } from "@/components/ui/Button"
import { EmptyState, ErrorNote, LoadingRows, Panel, StatusBadge } from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { useResource } from "@/lib/api/use-resource"
import { PUBLIC_API_URL } from "@/lib/config"

interface AdminCategory {
  id: string
  slug: string
  name: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
  productCount: number
  subCategories: { id: string; slug: string; name: string }[]
}

/** URL-safe slug from a name. Names with no Latin letters give "" — the admin then types a slug by hand. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

interface FormState {
  name: string
  slug: string
  slugTouched: boolean
  description: string
  imageUrl: string
  sortOrder: string
  isActive: boolean
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  slugTouched: false,
  description: "",
  imageUrl: "",
  sortOrder: "0",
  isActive: true,
}

function fromCategory(c: AdminCategory): FormState {
  return {
    name: c.name,
    slug: c.slug,
    slugTouched: true,
    description: c.description ?? "",
    imageUrl: c.imageUrl ?? "",
    sortOrder: String(c.sortOrder),
    isActive: c.isActive,
  }
}

function CategoryForm({
  initial,
  editingId,
  onDone,
  onCancel,
}: {
  initial: FormState
  editingId?: string
  onDone: (message: string) => void
  onCancel?: () => void
}) {
  const { request, getToken } = useApi()
  const [v, setV] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setV((prev) => ({ ...prev, [key]: value }))
    setErrors((e) => ({ ...e, [key]: "" }))
  }
  const setName = (name: string) =>
    setV((prev) => ({ ...prev, name, slug: prev.slugTouched ? prev.slug : slugify(name) }))

  const upload = async (file: File) => {
    setUploading(true)
    setFormError(null)
    try {
      const token = await getToken()
      const body = new FormData()
      body.set("kind", "category-image")
      body.set("file", file)
      const res = await fetch(`${PUBLIC_API_URL}/api/uploads`, {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body,
      })
      const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: { message: string } }
      if (!res.ok || !json.success || !json.data) throw new Error(json.error?.message ?? "Upload failed")
      set("imageUrl", json.data.url)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const payload = {
      name: v.name,
      slug: v.slug,
      description: v.description.trim() || undefined,
      imageUrl: v.imageUrl.trim() || undefined,
      sortOrder: Number(v.sortOrder || 0),
      isActive: v.isActive,
    }
    const parsed = categoryInput.safeParse(payload)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0] ?? "form")] ??= issue.message
      setErrors(next)
      setFormError(
        next.slug && !v.slug
          ? "Enter a URL slug (lowercase letters, numbers and hyphens)."
          : "Please fix the highlighted fields."
      )
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await request(`/api/admin/categories/${editingId}`, { method: "PATCH", body: parsed.data })
        onDone(`Saved “${parsed.data.name}”.`)
      } else {
        await request("/api/admin/categories", { method: "POST", body: parsed.data })
        setV(EMPTY)
        onDone(`Category “${parsed.data.name}” added.`)
      }
    } catch (err) {
      if (err instanceof ApiError && err.details.length) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.path.split(".")[0] ?? "form", d.message])))
      }
      setFormError(err instanceof ApiError ? err.message : "Could not save this category.")
    } finally {
      setSaving(false)
    }
  }

  const label = "text-xs font-semibold text-ink-700"
  const err = (k: string) =>
    errors[k] ? (
      <p role="alert" className="mt-1 text-xs font-medium text-danger-600">
        {errors[k]}
      </p>
    ) : null

  return (
    <form noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`cat-name-${editingId ?? "new"}`} className={label}>
          Name
        </label>
        <input
          id={`cat-name-${editingId ?? "new"}`}
          value={v.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Electronics & Electricals"
          aria-invalid={Boolean(errors.name)}
          className={fieldClass}
        />
        {err("name")}
      </div>
      <div>
        <label htmlFor={`cat-slug-${editingId ?? "new"}`} className={label}>
          URL slug
        </label>
        <input
          id={`cat-slug-${editingId ?? "new"}`}
          value={v.slug}
          onChange={(e) => setV((p) => ({ ...p, slug: e.target.value.toLowerCase(), slugTouched: true }))}
          placeholder="electronics-and-electricals"
          aria-invalid={Boolean(errors.slug)}
          className={fieldClass}
        />
        {err("slug")}
        {!errors.slug && <p className="mt-1 text-xs text-ink-400">/categories/{v.slug || "…"}</p>}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`cat-desc-${editingId ?? "new"}`} className={label}>
          Short description (shown on the category card)
        </label>
        <textarea
          id={`cat-desc-${editingId ?? "new"}`}
          rows={2}
          maxLength={500}
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
          className={textareaClass}
        />
        {err("description")}
      </div>
      <div>
        <span className={label}>Cover image</span>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-ink-100">
            {v.imageUrl && <Image src={v.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
          </span>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-ink-300 px-3 text-sm font-semibold text-ink-700 hover:border-brand-300">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
            {v.imageUrl ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void upload(f)
                e.target.value = ""
              }}
            />
          </label>
          {v.imageUrl && (
            <button
              type="button"
              onClick={() => set("imageUrl", "")}
              className="text-xs font-semibold text-danger-600 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
        {err("imageUrl")}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={`cat-order-${editingId ?? "new"}`} className={label}>
            Sort order
          </label>
          <input
            id={`cat-order-${editingId ?? "new"}`}
            type="number"
            min={0}
            value={v.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
            className={fieldClass}
          />
          {err("sortOrder")}
        </div>
        <label className="mt-7 flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={v.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 accent-[#E8722A]"
          />
          Visible on the site
        </label>
      </div>
      {formError && (
        <p
          role="alert"
          className="rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600 sm:col-span-2"
        >
          {formError}
        </p>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={saving || uploading}>
          {saving && <Loader2 size={16} className="animate-spin" />} {editingId ? "Save changes" : "Add category"}
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

function SubCategoryAdder({
  categoryId,
  onAdded,
  onError,
}: {
  categoryId: string
  onAdded: () => void
  onError: (m: string) => void
}) {
  const { request } = useApi()
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const n = name.trim()
        const slug = slugify(n)
        if (!n) return
        if (!slug) return onError("Sub-category names need at least one letter or number (Latin) for the URL slug.")
        setBusy(true)
        request(`/api/admin/categories/${categoryId}/subcategories`, { method: "POST", body: { name: n, slug } })
          .then(() => {
            setName("")
            onAdded()
          })
          .catch((err: unknown) => onError(err instanceof ApiError ? err.message : "Could not add the sub-category."))
          .finally(() => setBusy(false))
      }}
    >
      <input
        aria-label="New sub-category name"
        placeholder="Add sub-category…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9 flex-1 rounded-lg border border-ink-200 bg-white px-3 text-sm focus:border-brand-400 focus:outline-none"
      />
      <Button type="submit" size="sm" variant="outline" disabled={busy || !name.trim()}>
        <Plus size={14} /> Add
      </Button>
    </form>
  )
}

export function CategoryManager() {
  const { request } = useApi()
  const list = useResource<AdminCategory[]>("/api/admin/categories")
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setError(null)
    setNotice(null)
    try {
      await fn()
      if (ok) setNotice(ok)
      await list.reload()
    } catch (e) {
      setError(e instanceof ApiError ? (e.details[0]?.message ?? e.message) : "That didn't work.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-success-50 p-3 text-sm font-medium text-success-700"
        >
          <CheckCircle2 size={16} /> {notice}
        </p>
      )}
      {error && <ErrorNote message={error} />}

      {adding ? (
        <Panel
          title="New category"
          action={
            <button onClick={() => setAdding(false)} aria-label="Close" className="text-ink-400 hover:text-ink-700">
              <X size={18} />
            </button>
          }
        >
          <CategoryForm
            initial={EMPTY}
            onDone={(m) => {
              setNotice(m)
              setAdding(false)
              void list.reload()
            }}
            onCancel={() => setAdding(false)}
          />
        </Panel>
      ) : (
        <div>
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} /> Add category
          </Button>
        </div>
      )}

      {list.error ? (
        <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
      ) : list.loading && !list.data ? (
        <LoadingRows />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState icon={Plus} title="No categories yet" text="Add the first category buyers will browse." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(list.data ?? []).map((c) =>
            editing === c.id ? (
              <Panel key={c.id} title={`Edit ${c.name}`}>
                <CategoryForm
                  initial={fromCategory(c)}
                  editingId={c.id}
                  onDone={(m) => {
                    setNotice(m)
                    setEditing(null)
                    void list.reload()
                  }}
                  onCancel={() => setEditing(null)}
                />
              </Panel>
            ) : (
              <Panel key={c.id} title={c.name} action={<StatusBadge status={c.isActive ? "ACTIVE" : "ARCHIVED"} />}>
                <div className="flex gap-3">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-ink-100">
                    {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                  </span>
                  <div className="min-w-0 text-xs text-ink-500">
                    <p>
                      /{c.slug} · {c.productCount} products · order {c.sortOrder}
                    </p>
                    {c.description && <p className="mt-1 line-clamp-2 text-ink-600">{c.description}</p>}
                  </div>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {c.subCategories.map((s) => (
                    <li
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-700"
                    >
                      {s.name}
                      <button
                        aria-label={`Remove ${s.name}`}
                        onClick={() =>
                          void run(() =>
                            request(`/api/admin/categories/${c.id}/subcategories/${s.id}`, { method: "DELETE" })
                          )
                        }
                        className="text-ink-400 hover:text-danger-500"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <SubCategoryAdder categoryId={c.id} onAdded={() => void list.reload()} onError={setError} />
                <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
                  <button
                    onClick={() => setEditing(c.id)}
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() =>
                      void run(
                        () =>
                          request(`/api/admin/categories/${c.id}`, {
                            method: "PATCH",
                            body: { isActive: !c.isActive },
                          }),
                        c.isActive ? `“${c.name}” hidden from the site.` : `“${c.name}” is now visible.`
                      )
                    }
                    className="text-ink-700 hover:underline"
                  >
                    {c.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() =>
                      window.confirm(`Delete “${c.name}”? This only works while it has no products.`) &&
                      void run(
                        () => request(`/api/admin/categories/${c.id}`, { method: "DELETE" }),
                        `“${c.name}” deleted.`
                      )
                    }
                    className="inline-flex items-center gap-1 text-danger-600 hover:underline"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </Panel>
            )
          )}
        </div>
      )}
    </div>
  )
}
