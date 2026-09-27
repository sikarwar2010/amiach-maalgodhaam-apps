"use client"

import { useState } from "react"
import type { z } from "zod"

import { ApiError } from "@/lib/api/fetcher"

/**
 * Tiny form helper: validates with the same Zod schema the API uses (so messages match), then
 * merges server-side field errors back in. Values stay strings until validation converts them.
 */
export function useZodForm<S extends z.ZodType>(schema: S, initial: Record<string, string | boolean>) {
  const [values, setValues] = useState<Record<string, string | boolean>>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (name: string, value: string | boolean) => {
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((e) => ({ ...e, [name]: "" }))
  }

  const reset = (next: Record<string, string | boolean> = initial) => {
    setValues(next)
    setErrors({})
    setFormError(null)
  }

  /** Runs `onValid` with parsed data. Returns true on success. */
  const submit = async (
    prepare: (raw: Record<string, string | boolean>) => unknown,
    onValid: (data: z.output<S>) => Promise<void>
  ): Promise<boolean> => {
    setFormError(null)
    const parsed = schema.safeParse(prepare(values))
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".")
        if (!next[key]) next[key] = issue.message
      }
      setErrors(next)
      return false
    }
    setSubmitting(true)
    try {
      await onValid(parsed.data)
      return true
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors)
        setFormError(e.details.length ? null : e.message)
      } else {
        setFormError("Something went wrong. Please try again.")
      }
      return false
    } finally {
      setSubmitting(false)
    }
  }

  return {
    values,
    errors,
    formError,
    submitting,
    set,
    reset,
    submit,
    setFormError,
  }
}
