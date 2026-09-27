import { createPrismaClient, type PrismaClient } from "@workspace/db"
import type { Role } from "@workspace/types"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { createApp } from "../src/app"
import { loadEnv } from "../src/env"
import type { ExternalProfile, IdentityProvider } from "../src/identity/provider"
import { createLocalStorage } from "../src/lib/storage"
import { testDatabaseUrl } from "./db-url"

export const db: PrismaClient = createPrismaClient(testDatabaseUrl())

/** In-memory identity provider: the bearer token is literally `test:<clerkId>`. */
export const knownProfiles = new Map<string, ExternalProfile>()
export const metadataSync: {
  clerkId: string
  role: Role
  onboarded: boolean
}[] = []

const identity: IdentityProvider = {
  async verify(token) {
    return token.startsWith("test:") ? { clerkId: token.slice(5) } : null
  },
  async fetchProfile(clerkId) {
    return knownProfiles.get(clerkId) ?? null
  },
  async syncMetadata(clerkId, metadata) {
    metadataSync.push({ clerkId, ...metadata })
  },
}

export const uploadDir = mkdtempSync(join(tmpdir(), "mg-uploads-"))

export const app = createApp({
  db,
  identity,
  storage: createLocalStorage(uploadDir),
  env: loadEnv({
    NODE_ENV: "test",
    DATABASE_URL: testDatabaseUrl(),
    WEB_ORIGIN: "http://localhost:3000",
    SUPER_ADMIN_EMAILS: "owner@example.com",
  }),
})

export interface ApiResult<T = unknown> {
  status: number
  body: {
    success: boolean
    data?: T
    meta?: { page: number; pageSize: number; total: number; totalPages: number }
    error?: {
      code: string
      message: string
      details?: { path: string; message: string }[]
    }
  }
}

export async function call<T = unknown>(
  method: string,
  path: string,
  options: {
    as?: string
    json?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { ...options.headers }
  if (options.as) headers.authorization = `Bearer test:${options.as}`
  let body: string | undefined
  if (options.json !== undefined) {
    headers["content-type"] = "application/json"
    body = JSON.stringify(options.json)
  }
  const res = await app.request(path, {
    method,
    headers,
    ...(body !== undefined ? { body } : {}),
  })
  return {
    status: res.status,
    body: (await res.json()) as ApiResult<T>["body"],
  }
}

export const get = <T = unknown>(path: string, as?: string) => call<T>("GET", path, as ? { as } : {})
export const post = <T = unknown>(path: string, json: unknown, as?: string) =>
  call<T>("POST", path, { json, ...(as ? { as } : {}) })
export const patch = <T = unknown>(path: string, json: unknown, as?: string) =>
  call<T>("PATCH", path, { json, ...(as ? { as } : {}) })
export const put = <T = unknown>(path: string, json: unknown, as?: string) =>
  call<T>("PUT", path, { json, ...(as ? { as } : {}) })
export const del = <T = unknown>(path: string, as?: string) => call<T>("DELETE", path, as ? { as } : {})

export async function resetDb(): Promise<void> {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (tables.length > 0) {
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ")
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
  }
  knownProfiles.clear()
  metadataSync.length = 0
}

/* ----------------------------- factories ----------------------------- */

let counter = 0
const next = () => ++counter

export async function makeUser(role: Role = "BUYER", overrides: { status?: "ACTIVE" | "SUSPENDED" } = {}) {
  const n = next()
  return db.user.create({
    data: {
      clerkId: `clerk_${n}`,
      email: `user${n}@example.com`,
      name: `User ${n}`,
      role,
      onboarded: true,
      ...(overrides.status ? { status: overrides.status } : {}),
    },
  })
}

export async function makeBusinessBuyer() {
  const user = await makeUser("BUYER")
  await db.buyerProfile.create({
    data: {
      userId: user.id,
      buyerType: "BUSINESS",
      companyName: "Acme Builders",
      gstin: "24AAAAA0000A1Z5",
    },
  })
  return user
}

export async function makeAddress(userId: string) {
  return db.address.create({
    data: {
      userId,
      fullName: "Test Buyer",
      phone: "9876543210",
      line1: "1 MG Road",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      isDefault: true,
    },
  })
}

export async function makeVendor(status: "PENDING" | "APPROVED" | "SUSPENDED" = "APPROVED") {
  const n = next()
  const user = await makeUser("VENDOR")
  const vendor = await db.vendor.create({
    data: {
      userId: user.id,
      businessName: `Vendor ${n}`,
      slug: `vendor-${n}`,
      contactName: "Owner",
      phone: "9876543210",
      gstin: `27AAAAA${String(1000 + n).padStart(4, "0")}A1Z5`,
      addressLine: "Plot 1",
      city: "Morbi",
      state: "Gujarat",
      pincode: "363641",
      categories: [],
      status,
      ...(status === "APPROVED" ? { verifiedAt: new Date() } : {}),
    },
  })
  return { user, vendor }
}

export async function makeCategory(slug = "tiles") {
  return db.category.upsert({
    where: { slug },
    create: { slug, name: slug.charAt(0).toUpperCase() + slug.slice(1) },
    update: {},
  })
}

export async function makeProduct(
  vendorId: string,
  categoryId: string,
  overrides: {
    title?: string
    status?: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "ARCHIVED" | "OUT_OF_STOCK"
    price?: number
    quantity?: number
    minOrderQty?: number
    city?: string
  } = {}
) {
  const n = next()
  const status = overrides.status ?? "PUBLISHED"
  return db.product.create({
    data: {
      vendorId,
      categoryId,
      slug: `product-${n}`,
      title: overrides.title ?? `Product ${n}`,
      description: "A perfectly good surplus product for testing.",
      condition: "SURPLUS",
      unit: "PIECE",
      price: overrides.price ?? 100,
      marketValue: 150,
      minOrderQty: overrides.minOrderQty ?? 1,
      city: overrides.city ?? "Morbi",
      state: "Gujarat",
      status,
      ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
      inventory: { create: { quantity: overrides.quantity ?? 50 } },
      images: {
        create: [{ url: "https://example.com/a.jpg", position: 0, isPrimary: true }],
      },
    },
  })
}
