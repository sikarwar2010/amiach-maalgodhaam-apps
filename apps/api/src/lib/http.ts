import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { PageMeta } from "@workspace/types"
import type { z } from "zod"

import { validation } from "./errors"

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ success: true as const, data }, status)
}

export function page<T>(c: Context, data: T[], meta: PageMeta) {
  return c.json({ success: true as const, data, meta }, 200)
}

export function pageMeta(total: number, page: number, pageSize: number): PageMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export function skipTake(q: { page: number; pageSize: number }) {
  return { skip: (q.page - 1) * q.pageSize, take: q.pageSize }
}

function issues(error: z.ZodError) {
  return error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }))
}

export function parseWith<S extends z.ZodType>(schema: S, value: unknown, what: string): z.output<S> {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw validation(`Invalid ${what}`, issues(result.error))
  }
  return result.data
}

export async function jsonBody<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    throw validation("Request body must be valid JSON")
  }
  return parseWith(schema, raw, "request body")
}

export function query<S extends z.ZodType>(c: Context, schema: S): z.output<S> {
  return parseWith(schema, c.req.query(), "query parameters")
}

export function params<S extends z.ZodType>(c: Context, schema: S): z.output<S> {
  return parseWith(schema, c.req.param(), "path parameters")
}
