import { isBackOffice } from "@workspace/auth"
import { Hono } from "hono"

import type { AppEnv } from "../context"
import { badRequest, forbidden, notFound, validation } from "../lib/errors"
import { ok } from "../lib/http"
import { contentTypeForKey, isSafeKey, sniffType } from "../lib/storage"
import { currentUser, requireAuth } from "../middleware/auth"

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/**
 * kind → who may read the file later, and which types it may be.
 * - product-image / vendor-logo: public (they appear on the storefront)
 * - vendor-document: private (GST/PAN/ID proofs) — owner and back-office only
 */
const KINDS = {
  "product-image": { visibility: "public", types: ["jpg", "png", "webp"] },
  "vendor-logo": { visibility: "public", types: ["jpg", "png", "webp"] },
  "category-image": { visibility: "public", types: ["jpg", "png", "webp"] },
  "vendor-document": {
    visibility: "private",
    types: ["jpg", "png", "webp", "pdf"],
  },
} as const
type Kind = keyof typeof KINDS

function isKind(value: unknown): value is Kind {
  return typeof value === "string" && Object.hasOwn(KINDS, value)
}

export const uploadRoutes = new Hono<AppEnv>()

uploadRoutes.post("/uploads", requireAuth, async (c) => {
  const user = currentUser(c)
  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    throw badRequest("Expected multipart/form-data")
  }
  const kind = form.get("kind")
  const file = form.get("file")
  if (!isKind(kind)) {
    throw validation("Unknown upload kind", [
      {
        path: "kind",
        message: "Must be one of " + Object.keys(KINDS).join(", "),
      },
    ])
  }
  if (!(file instanceof File)) throw validation("Missing file", [{ path: "file", message: "Required" }])
  if (file.size === 0) throw validation("The file is empty", [{ path: "file", message: "Empty file" }])
  if (file.size > MAX_UPLOAD_BYTES)
    throw validation("The file is larger than 5 MB", [{ path: "file", message: "Max 5 MB" }])

  // Storefront assets come from vendors (or staff acting for them); identity documents from anyone signed in.
  if (kind === "category-image" && !isBackOffice(user.role)) {
    throw forbidden("Only staff can upload category images")
  }
  if (kind !== "vendor-document" && user.role !== "VENDOR" && !isBackOffice(user.role)) {
    throw forbidden("Only vendors can upload storefront images")
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const detected = sniffType(bytes)
  const allowed: readonly string[] = KINDS[kind].types
  if (!detected || !allowed.includes(detected.ext)) {
    throw validation("Unsupported file type", [{ path: "file", message: `Allowed: ${allowed.join(", ")}` }])
  }

  const scope = KINDS[kind].visibility === "public" ? "public" : `private/${user.id}`
  const key = `${scope}/${kind}/${crypto.randomUUID()}.${detected.ext}`
  await c.get("storage").put(key, bytes, detected.contentType)

  const base = c.get("env").PUBLIC_API_URL
  return ok(
    c,
    {
      key,
      url: `${base}/api/files/${key}`,
      contentType: detected.contentType,
      size: bytes.length,
    },
    201
  )
})

/** Public files are open (immutable, long-cached); private ones need the owner or back-office. */
uploadRoutes.get("/files/*", async (c) => {
  const key = c.req.path.replace(/^\/api\/files\//, "")
  if (!isSafeKey(key)) throw notFound("File")

  if (key.startsWith("private/")) {
    const user = c.get("user")
    const ownerId = key.split("/")[1]
    if (!user || user.status !== "ACTIVE" || (user.id !== ownerId && !isBackOffice(user.role))) {
      // Same answer for "missing" and "not yours".
      throw notFound("File")
    }
  } else if (!key.startsWith("public/")) {
    throw notFound("File")
  }

  const stored = await c.get("storage").get(key)
  if (!stored) throw notFound("File")
  return new Response(stored.bytes, {
    headers: {
      "content-type": contentTypeForKey(key),
      "content-length": String(stored.bytes.length),
      "cache-control": key.startsWith("public/") ? "public, max-age=31536000, immutable" : "private, no-store",
      "x-content-type-options": "nosniff",
      "content-disposition": "inline",
      "cross-origin-resource-policy": "cross-origin",
    },
  })
})
