import type { PrismaClient } from "@workspace/db"
import { ERROR_STATUS } from "@workspace/types"
import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { cors } from "hono/cors"
import { HTTPException } from "hono/http-exception"
import { secureHeaders } from "hono/secure-headers"
import { ZodError } from "zod"

import type { AppEnv } from "./context"
import type { Env } from "./env"
import type { IdentityProvider } from "./identity/provider"
import { AppError } from "./lib/errors"
import type { StorageDriver } from "./lib/storage"
import { attachUser } from "./middleware/auth"
import { rateLimit } from "./middleware/rate-limit"
import { MAX_UPLOAD_BYTES, uploadRoutes } from "./routes/uploads"
import { adminRoutes } from "./routes/admin"
import { b2bRoutes, vendorB2bRoutes } from "./routes/b2b"
import { catalogRoutes } from "./routes/catalog"
import { contactRoutes } from "./routes/contact"
import { cartRoutes, orderRoutes, wishlistRoutes } from "./routes/commerce"
import { meRoutes } from "./routes/me"
import { vendorRoutes } from "./routes/vendor"
import { webhookRoutes } from "./routes/webhooks"

export interface AppDeps {
  db: PrismaClient
  env: Env
  identity: IdentityProvider
  storage: StorageDriver
}

function failure(code: keyof typeof ERROR_STATUS, message: string, details?: { path: string; message: string }[]) {
  return {
    success: false as const,
    error: { code, message, ...(details ? { details } : {}) },
  }
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>()

  app.use("*", async (c, next) => {
    c.set("db", deps.db)
    c.set("env", deps.env)
    c.set("identity", deps.identity)
    c.set("storage", deps.storage)
    c.set("requestId", crypto.randomUUID())
    c.header("X-Request-Id", c.get("requestId"))
    await next()
  })
  app.use("*", secureHeaders())
  app.use(
    "/api/*",
    cors({
      origin: deps.env.webOrigins,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type"],
      exposeHeaders: ["X-Request-Id", "X-Unread-Count"],
      maxAge: 600,
    })
  )
  const jsonLimit = bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => c.json(failure("BAD_REQUEST", "Request body is too large"), 413),
  })
  // Uploads get a larger (but still bounded) limit; everything else is small JSON.
  const uploadLimit = bodyLimit({
    maxSize: MAX_UPLOAD_BYTES + 64 * 1024,
    onError: (c) => c.json(failure("BAD_REQUEST", "The file is larger than 5 MB"), 413),
  })
  app.use("/api/*", (c, next) => (c.req.path === "/api/uploads" ? uploadLimit(c, next) : jsonLimit(c, next)))
  // Reads are cheap and cacheable (and server-rendered pages call the API from a single IP), so they get a
  // generous ceiling; writes are throttled hard.
  const isRead = (method: string) => method === "GET" || method === "HEAD" || method === "OPTIONS"
  const test = deps.env.NODE_ENV === "test"
  app.use(
    "/api/*",
    rateLimit({ limit: test ? 1_000_000 : 6000, windowMs: 60_000, scope: "api-read", skip: (m) => !isRead(m) })
  )
  app.use("/api/*", rateLimit({ limit: test ? 1_000_000 : 300, windowMs: 60_000, scope: "api-write", skip: isRead }))

  app.get("/api/health", async (c) => {
    try {
      await deps.db.$queryRaw`SELECT 1`
      return c.json({
        success: true as const,
        data: {
          status: "ok",
          database: "up",
          uptimeSeconds: Math.round(process.uptime()),
        },
      })
    } catch {
      return c.json(failure("INTERNAL_ERROR", "Database is unreachable"), 503)
    }
  })

  // Signature-verified, not session-authenticated.
  app.route("/api/webhooks", webhookRoutes)

  app.use("/api/*", attachUser)

  app.route("/api", uploadRoutes)
  app.route("/api", contactRoutes)
  app.route("/api", catalogRoutes)
  app.route("/api/me", meRoutes)
  app.route("/api/wishlist", wishlistRoutes)
  app.route("/api/cart", cartRoutes)
  app.route("/api/orders", orderRoutes)
  app.route("/api/b2b", b2bRoutes)
  app.route("/api/vendor/b2b", vendorB2bRoutes)
  app.route("/api/vendor", vendorRoutes)
  app.route("/api/admin", adminRoutes)

  app.notFound((c) => c.json(failure("NOT_FOUND", `Route ${c.req.method} ${c.req.path} not found`), 404))

  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json(failure(error.code, error.message, error.details), error.status as 400)
    }
    if (error instanceof ZodError) {
      return c.json(
        failure(
          "VALIDATION_ERROR",
          "Invalid input",
          error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          }))
        ),
        422
      )
    }
    if (error instanceof HTTPException) {
      const code =
        error.status === 401
          ? "UNAUTHORIZED"
          : error.status === 403
            ? "FORBIDDEN"
            : error.status === 404
              ? "NOT_FOUND"
              : "BAD_REQUEST"
      return c.json(failure(code, error.message || "Request failed"), error.status as 400)
    }
    // Never echo internals to the client; the request id lets support find the log line.
    console.error(
      `[${c.get("requestId")}] ${c.req.method} ${c.req.path}`,
      error instanceof Error ? `${error.name}: ${error.message}` : "unknown error"
    )
    return c.json(failure("INTERNAL_ERROR", "Something went wrong on our side"), 500)
  })

  return app
}

export type App = ReturnType<typeof createApp>
