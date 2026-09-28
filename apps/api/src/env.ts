import { z } from "zod"

const boolFromString = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1")

/**
 * Wraps a genuinely-optional string field so a BLANK value is treated the same as an absent one.
 *
 * `.optional()` alone only bypasses validation for `undefined` (the key missing entirely). Several
 * deployment tools — Dokploy included — write every configured environment variable to `.env` even
 * when its UI field was left empty, producing `KEY=` (an empty string), not an absent key. Without
 * this, leaving such a field blank in Dokploy's Environment tab crashes startup with a raw Zod
 * message ("Too small: expected string to have >=1 characters") instead of actually being optional.
 */
const optionalString = <S extends z.ZodString>(schema: S) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional())

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** Clerk Backend API key. Required in production (checked below); without it the API cannot verify sessions. */
  CLERK_SECRET_KEY: optionalString(z.string().min(1)),
  /** Origin(s) of the web app, comma-separated. Used for CORS and Clerk `azp` checks. */
  WEB_ORIGIN: z.string().default("http://localhost:3000,http://localhost:3001"),
  TRUST_PROXY: boolFromString.default(false),
  /** Comma-separated e-mails that become SUPER_ADMIN once Clerk reports the address as verified. */
  SUPER_ADMIN_EMAILS: z.string().default(""),
  /** Directory for uploaded files (local storage driver). */
  UPLOAD_DIR: z.string().default("./uploads"),
  /** Public base URL of this API, used to build file URLs returned to clients. */
  PUBLIC_API_URL: optionalString(z.string().url()),
})

export type Env = Omit<z.infer<typeof envSchema>, "PUBLIC_API_URL"> & {
  superAdminEmails: string[]
  PUBLIC_API_URL: string
  webOrigins: string[]
}

/**
 * Browsers send `Origin: https://host` and Clerk stamps the same bare value into the token's `azp`, and both
 * are compared by exact string. A pasted `https://host/` would otherwise reject every CORS request and every
 * signed-in session, so reduce each entry to its origin and refuse anything that is not one.
 */
function parseOrigins(raw: string): string[] {
  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (entries.length === 0) throw new Error("Invalid environment: WEB_ORIGIN must list at least one origin")
  return entries.map((entry) => {
    const url = URL.parse(entry)
    if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
      throw new Error(`Invalid environment: WEB_ORIGIN entry "${entry}" is not an http(s) origin like https://www.example.com`)
    }
    return url.origin
  })
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`).join("; ")
    throw new Error(`Invalid environment: ${problems}`)
  }
  const env = parsed.data
  if (env.NODE_ENV === "production" && !env.CLERK_SECRET_KEY) {
    throw new Error("Invalid environment: CLERK_SECRET_KEY is required in production")
  }
  return {
    ...env,
    PUBLIC_API_URL: (env.PUBLIC_API_URL ?? `http://localhost:${env.API_PORT}`).replace(/\/+$/, ""),
    superAdminEmails: env.SUPER_ADMIN_EMAILS.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    webOrigins: parseOrigins(env.WEB_ORIGIN),
  }
}
