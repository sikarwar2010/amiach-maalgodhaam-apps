import type { Context } from "hono"
import { getConnInfo } from "hono/bun"

import type { AppEnv } from "../context"

/** Client IP, honouring X-Forwarded-For only when the deployment says a trusted proxy sets it. */
export function clientIp(c: Context<AppEnv>): string | null {
  if (c.get("env").TRUST_PROXY) {
    const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
    if (forwarded) return forwarded
  }
  try {
    return getConnInfo(c).remote.address ?? null
  } catch {
    // No socket info (e.g. in-process test requests).
    return null
  }
}
