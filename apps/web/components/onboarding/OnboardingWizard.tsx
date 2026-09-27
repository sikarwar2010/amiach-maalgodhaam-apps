"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Clock, Loader2, ShieldCheck } from "lucide-react"
import type { CategoryDto, SessionUser } from "@workspace/types"
import { ROLE_HOME } from "@workspace/auth"

import { Button } from "@/components/ui/Button"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { PUBLIC_API_URL } from "@/lib/config"
import { toBuyerOnboarding, toVendorRegistration } from "@/lib/auth/onboarding-map"
import { stepsFor, validateField, validateSubmission, type OnboardingValues } from "@/lib/auth/onboarding-schema"
import type { AccountKind, OnboardRole } from "@/lib/auth/types"
import { cn } from "@/lib/utils"

import { FieldControl } from "./FieldControl"

const TYPE_LABEL: Record<AccountKind, string> = {
  b2b: "Business (B2B)",
  b2c: "Individual (B2C)",
}

const DOC_FIELDS: Record<string, "GST_CERTIFICATE" | "PAN_CARD" | "OTHER"> = {
  gstDoc: "GST_CERTIFICATE",
  panDoc: "PAN_CARD",
  idDoc: "OTHER",
}

export function OnboardingWizard({
  role,
  type,
  categories,
}: {
  role: OnboardRole
  type: AccountKind
  categories: CategoryDto[]
}) {
  const router = useRouter()
  const { request, isLoaded, isSignedIn, getToken } = useApi()
  const steps = useMemo(() => stepsFor(role, type), [role, type])

  const [me, setMe] = useState<SessionUser | null>(null)
  const [meLoaded, setMeLoaded] = useState(false)
  const [index, setIndex] = useState(0)
  const [values, setValues] = useState<OnboardingValues>({})
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState<"pending" | "ready" | null>(null)
  const prefilled = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    request<SessionUser>("/api/me")
      .then(({ data }) => {
        if (cancelled) return
        setMe(data)
        if (!prefilled.current) {
          prefilled.current = true
          setValues((v) => ({
            contactName: data.name ?? "",
            email: data.email,
            ...v,
          }))
        }
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setMeLoaded(true))
    return () => {
      cancelled = true
    }
  }, [request, isLoaded, isSignedIn])

  useEffect(() => headingRef.current?.focus(), [index, done])

  const step = steps[index]
  const isLast = index === steps.length - 1
  const roleWord = role === "vendor" ? "vendor" : "customer"

  if (!isLoaded || (isSignedIn && !meLoaded)) {
    return <div className="h-96 animate-pulse rounded-4xl bg-ink-100" aria-label="Loading" />
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-4xl border border-ink-100 bg-white p-8 text-center shadow-soft-sm">
        <h1 className="text-xl font-extrabold text-ink-900">Create your account first</h1>
        <p className="mt-2 text-sm text-ink-500">You need to sign up before completing your {roleWord} profile.</p>
        <Button href={`/register/${role}/${type}`} className="mt-5">
          Sign up
        </Button>
      </div>
    )
  }

  if (!step) return null

  const alreadyDone = me && ((role === "vendor" && me.vendorStatus !== null) || (role === "customer" && me.onboarded))
  if (alreadyDone && !done) {
    return (
      <div className="rounded-4xl border border-ink-100 bg-white p-8 text-center shadow-soft-sm">
        <BadgeCheck size={32} className="mx-auto text-brand-700" />
        <h1 className="mt-3 text-xl font-extrabold text-ink-900">You&apos;re already registered</h1>
        <p className="mt-2 text-sm text-ink-500">Your profile is set up.</p>
        <Button href={ROLE_HOME[me.role]} className="mt-5">
          Go to dashboard
        </Button>
      </div>
    )
  }

  const setValue = (name: string, v: string | string[] | boolean) => {
    setValues((prev) => ({ ...prev, [name]: v }))
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }))
  }

  const validateStep = () => {
    const next: Record<string, string> = {}
    for (const f of step.fields) {
      const err = validateField(f, values[f.name])
      if (err) next[f.name] = err
    }
    setErrors(next)
    const firstInvalid = Object.keys(next)[0]
    if (firstInvalid) {
      document.getElementById(`f-${firstInvalid}`)?.focus()
      return false
    }
    return true
  }

  const upload = async (file: File, kind: "vendor-document"): Promise<string> => {
    const token = await getToken()
    const body = new FormData()
    body.set("kind", kind)
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
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error?.message ?? "Upload failed. Please try again.")
    }
    return json.data.url
  }

  const submit = async () => {
    setSubmitting(true)
    setServerError(null)
    const invalid = validateSubmission(role, type, values)
    if (invalid) {
      setServerError(invalid)
      setSubmitting(false)
      return
    }
    try {
      if (role === "vendor") {
        await request("/api/vendor/register", {
          method: "POST",
          body: toVendorRegistration(type, values),
        })
        // Documents are attached after registration so a failed upload never blocks the account.
        for (const [field, docType] of Object.entries(DOC_FIELDS)) {
          const file = files[field]
          if (!file) continue
          const url = await upload(file, "vendor-document")
          await request("/api/vendor/documents", {
            method: "POST",
            body: { type: docType, name: file.name.slice(0, 120), url },
          })
        }
        setDone("pending")
      } else {
        await request("/api/me/onboarding/buyer", {
          method: "POST",
          body: toBuyerOnboarding(type, values),
        })
        if (type === "b2b" && values.address) {
          await request("/api/me/addresses", {
            method: "POST",
            body: {
              type: "SHIPPING",
              label: "Primary",
              fullName: String(values.contactName ?? ""),
              phone: String(values.phone ?? "").replace(/\s/g, ""),
              line1: String(values.address),
              city: String(values.city ?? ""),
              state: String(values.state ?? ""),
              pincode: String(values.pincode ?? ""),
              isDefault: true,
            },
          }).catch(() => undefined)
        }
        setDone(type === "b2b" ? "pending" : "ready")
      }
    } catch (e) {
      if (e instanceof ApiError && e.details.length) {
        const first = e.details[0]
        setServerError(first ? `${first.path}: ${first.message}` : e.message)
      } else {
        setServerError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onNext = () => {
    if (!validateStep()) return
    if (isLast) void submit()
    else setIndex((i) => i + 1)
  }

  if (done) {
    const pending = done === "pending"
    const home = role === "vendor" ? "/vendor" : "/buyer"
    return (
      <div className="rounded-4xl border border-ink-100 bg-white p-8 text-center shadow-soft-sm sm:p-10">
        <span
          className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
            pending ? "bg-accent-50 text-accent-600" : "bg-success-50 text-success-600"
          )}
        >
          {pending ? <Clock size={26} /> : <CheckCircle2 size={26} />}
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 outline-none"
        >
          {pending ? "Submitted for verification" : "You're all set"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
          {pending
            ? role === "vendor"
              ? "Our team reviews your documents, usually within 1–2 business days. Your listings go live once you're approved."
              : "You can browse, save deals and request quotes right away. Add your GSTIN in your profile to unlock B2B quotes."
            : "Your account is ready. Explore deals near you or post a requirement."}
        </p>
        <ul className="mx-auto mt-6 flex max-w-xs flex-col gap-2 text-left text-sm text-ink-600">
          <li className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success-600" /> Account created
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success-600" /> Profile completed ({TYPE_LABEL[type]})
          </li>
          <li className="flex items-center gap-2">
            {pending ? (
              <Clock size={16} className="text-accent-600" />
            ) : (
              <ShieldCheck size={16} className="text-success-600" />
            )}
            {pending ? "Verification in progress" : "Ready to go"}
          </li>
        </ul>
        <Button onClick={() => router.push(home)} size="lg" className="mt-7 w-full sm:w-auto">
          Go to my dashboard <ArrowRight size={18} />
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-4xl border border-ink-100 bg-white p-6 shadow-soft-sm sm:p-9">
      <nav aria-label="Onboarding progress">
        <ol className="flex items-center gap-2">
          {steps.map((s, i) => (
            <li key={s.id} aria-current={i === index ? "step" : undefined} className="flex flex-1 flex-col gap-1.5">
              <span
                className={cn("h-1.5 rounded-full transition-colors", i <= index ? "bg-accent-500" : "bg-ink-100")}
              />
              <span
                className={cn(
                  "hidden text-[11px] font-semibold sm:block",
                  i === index ? "text-ink-900" : "text-ink-400"
                )}
              >
                {s.title}
              </span>
            </li>
          ))}
        </ol>
      </nav>
      <p className="mt-4 text-xs font-semibold tracking-wide text-accent-600 uppercase" aria-live="polite">
        Step {index + 1} of {steps.length} · {TYPE_LABEL[type]} {roleWord}
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 outline-none"
      >
        {step.title}
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">{step.description}</p>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          onNext()
        }}
        className="mt-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {step.fields.map((f) => (
            <FieldControl
              key={f.name}
              field={f}
              value={values[f.name]}
              error={errors[f.name]}
              categories={categories}
              onChange={(v) => setValue(f.name, v)}
              onFile={(file) => setFiles((prev) => ({ ...prev, [f.name]: file }))}
            />
          ))}
        </div>

        {serverError && (
          <p role="alert" className="mt-4 rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm font-medium text-danger-600">
            {serverError}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          {index > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setIndex((i) => i - 1)}>
              <ArrowLeft size={16} /> Back
            </Button>
          ) : (
            <Link href="/register" className="text-sm font-medium text-ink-500 hover:text-ink-800">
              Change account type
            </Link>
          )}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {isLast ? "Submit for review" : "Continue"}
            {!submitting && <ArrowRight size={18} />}
          </Button>
        </div>
      </form>
    </div>
  )
}
