import { contactInput } from "@workspace/validators"
import { Hono } from "hono"

import type { AppEnv } from "../context"
import { jsonBody, ok } from "../lib/http"
import { rateLimit } from "../middleware/rate-limit"

export const contactRoutes = new Hono<AppEnv>()

// Public endpoint, so it is throttled harder than the rest of the API.
contactRoutes.post("/contact", rateLimit({ limit: 5, windowMs: 60 * 60 * 1000, scope: "contact" }), async (c) => {
  const input = await jsonBody(c, contactInput)
  const saved = await c.get("db").contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      subject: input.subject ?? null,
      message: input.message,
    },
    select: { id: true },
  })
  return ok(c, { received: true, id: saved.id }, 201)
})
