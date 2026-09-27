import { createMiddleware } from "hono/factory"

import type { AppEnv } from "../context"
import { AppError } from "../lib/errors"
import { clientIp } from "../lib/ip"

interface Bucket {
  count: number
  resetAt: number
}

/**
 * Fixed-window, in-memory limiter keyed by IP (+ optional scope).
 * Per-process: behind several instances, back this with a shared store (e.g. Redis).
 */
export function rateLimit(options: {
  limit: number
  windowMs: number
  scope?: string
  skip?: (method: string) => boolean
}) {
  const buckets = new Map<string, Bucket>()

  return createMiddleware<AppEnv>(async (c, next) => {
    if (options.skip?.(c.req.method)) return next()
    const now = Date.now()
    const key = `${options.scope ?? "global"}:${clientIp(c) ?? "unknown"}`
    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs }
      buckets.set(key, bucket)
    }
    bucket.count += 1

    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    }

    if (bucket.count > options.limit) {
      c.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)))
      throw new AppError("RATE_LIMITED", "Too many requests, please slow down")
    }
    await next()
  })
}
