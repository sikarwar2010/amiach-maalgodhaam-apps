/**
 * Demo/dev seed: categories, sample vendors and listings carried over from the original MaalGodaam site.
 *
 * - Idempotent: safe to re-run (everything is upserted by a natural key).
 * - Additive: never deletes or truncates anything.
 * - Refuses to run when NODE_ENV=production unless SEED_ALLOW_PRODUCTION=true.
 * - Seed vendors use `@seed.maalgodaam.invalid` emails and `seed_*` Clerk ids, so nobody can sign in as them.
 */
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const rootEnv = resolve(import.meta.dirname, "../../../.env")
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
  console.error("Refusing to seed demo data with NODE_ENV=production (set SEED_ALLOW_PRODUCTION=true to override).")
  process.exit(1)
}

const { createPrismaClient } = await import("../src/client")
const { categories, listings, locations, suppliers } = await import("./seed-data/mock-data")

const db = createPrismaClient()

const enumKey = (value: string) => value.toUpperCase().replaceAll("-", "_")

type UnitKey = "SQ_FT" | "PIECE" | "BOX" | "SET" | "RUNNING_FT" | "SHEET" | "ROLL" | "UNIT"
type ConditionKey =
  | "SURPLUS"
  | "OVERSTOCK"
  | "EXCESS"
  | "DISCONTINUED"
  | "CLEARANCE"
  | "CUSTOMER_RETURN"
  | "DISPLAY_STOCK"
  | "FACTORY_STOCK"
type DealKey = "BUY_NOW" | "REQUEST_QUOTE" | "BULK_DEAL" | "CONTACT_SUPPLIER"
type LogisticsKey = "TRANSPORT_ARRANGED" | "SELF_PICKUP" | "FREIGHT" | "LOCAL_DELIVERY"

const round2 = (n: number) => Math.round(n * 100) / 100
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

async function main() {
  // ---- categories ----------------------------------------------------------
  const categoryIdBySeedId = new Map<string, string>()
  for (const [index, c] of categories.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.descriptor,
        imageUrl: c.imageUrl,
        sortOrder: index,
      },
      update: {
        name: c.name,
        description: c.descriptor,
        imageUrl: c.imageUrl,
        sortOrder: index,
      },
    })
    categoryIdBySeedId.set(c.id, row.id)
  }

  // sub-categories: declared ones plus every one referenced by a listing
  const subNames = new Map<string, Set<string>>()
  for (const c of categories) subNames.set(c.id, new Set(c.subcategories ?? []))
  for (const l of listings) if (l.subcategory) subNames.get(l.categoryId)?.add(l.subcategory)
  const subIdByKey = new Map<string, string>()
  for (const [seedCategoryId, names] of subNames) {
    const categoryId = categoryIdBySeedId.get(seedCategoryId)
    if (!categoryId) continue
    for (const name of names) {
      const slug = slugify(name)
      const row = await db.subCategory.upsert({
        where: { categoryId_slug: { categoryId, slug } },
        create: { categoryId, slug, name },
        update: { name },
      })
      subIdByKey.set(`${seedCategoryId}:${name}`, row.id)
    }
  }

  // ---- vendors ---------------------------------------------------------------
  const locationByLabel = (label: string) => {
    const city = label.split(",")[0]?.trim() ?? label
    const state = label.split(",")[1]?.trim() ?? ""
    return { city, state, pincode: "000000" }
  }
  const vendorIdBySeedId = new Map<string, string>()
  for (const [index, s] of suppliers.entries()) {
    const loc = locationByLabel(s.location)
    const user = await db.user.upsert({
      where: { clerkId: `seed_${s.slug}` },
      create: {
        clerkId: `seed_${s.slug}`,
        email: `${s.slug}@seed.maalgodaam.invalid`,
        name: s.name,
        role: "VENDOR",
        onboarded: true,
      },
      update: {},
    })
    const gstin = `27AAAAA${String(1001 + index).padStart(4, "0")}A1Z5`
    const vendor = await db.vendor.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        businessName: s.name,
        slug: s.slug,
        contactName: s.name,
        phone: "9000000000",
        gstin,
        description: s.description ?? null,
        logoUrl: s.logoUrl,
        addressLine: "Registered office (demo)",
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode === "000000" ? "110001" : loc.pincode,
        categories: s.categories,
        status: "APPROVED",
        verifiedAt: new Date(s.memberSince),
      },
      update: {
        businessName: s.name,
        description: s.description ?? null,
        logoUrl: s.logoUrl,
        categories: s.categories,
      },
    })
    vendorIdBySeedId.set(s.id, vendor.id)
  }

  // ---- products --------------------------------------------------------------
  let created = 0
  for (const l of listings) {
    const vendorId = vendorIdBySeedId.get(l.supplierId)
    const categoryId = categoryIdBySeedId.get(l.categoryId)
    const location = locations.find((loc) => loc.id === l.locationId)
    if (!vendorId || !categoryId || !location) {
      console.warn(`skipping ${l.slug}: missing vendor/category/location`)
      continue
    }
    // The original site priced whole lots; the marketplace prices per unit.
    const unitPrice = round2(l.price / l.quantity)
    const unitMarket = round2(l.marketValue / l.quantity)
    const subCategoryId = l.subcategory ? (subIdByKey.get(`${l.categoryId}:${l.subcategory}`) ?? null) : null
    const specs: { label: string; value: string }[] = [...l.specifications]
    for (const [label, value] of [
      ["Dimensions", l.dimensions],
      ["Material", l.material],
      ["Finish", l.finish],
      ["Colour", l.color],
      ["Packaging", l.packaging],
    ] as const) {
      if (value) specs.push({ label, value })
    }
    const data = {
      vendorId,
      categoryId,
      subCategoryId,
      title: l.title,
      brand: l.brand,
      description: l.description,
      condition: enumKey(l.condition) as ConditionKey,
      dealType: enumKey(l.dealType) as DealKey,
      unit: enumKey(l.unit) as UnitKey,
      price: unitPrice,
      marketValue: unitMarket,
      minOrderQty: l.minOrderQuantity,
      city: location.city,
      state: location.state,
      logisticsMethods: l.logisticsMethods.map((m) => enumKey(m) as LogisticsKey),
      conditionNotes: l.conditionNotes ?? null,
      specifications: specs,
      tags: ["demo", l.categoryId, l.brand.toLowerCase()],
      featured: l.featured ?? false,
      status: "PUBLISHED" as const,
      publishedAt: new Date(l.dateAdded),
    }
    const existing = await db.product.findUnique({
      where: { slug: l.slug },
      select: { id: true },
    })
    if (existing) {
      await db.product.update({ where: { id: existing.id }, data })
      continue
    }
    const product = await db.product.create({
      data: {
        ...data,
        slug: l.slug,
        inventory: { create: { quantity: l.quantity } },
        images: {
          create: l.images.map((url, position) => ({
            url,
            alt: l.title,
            position,
            isPrimary: position === 0,
          })),
        },
      },
    })
    if (l.dealType === "bulk-deal") {
      await db.b2BPrice.createMany({
        data: [
          {
            productId: product.id,
            minQty: l.minOrderQuantity * 2,
            maxQty: l.minOrderQuantity * 5 - 1,
            unitPrice: round2(unitPrice * 0.97),
          },
          {
            productId: product.id,
            minQty: l.minOrderQuantity * 5,
            unitPrice: round2(unitPrice * 0.93),
          },
        ],
        skipDuplicates: true,
      })
    }
    created++
  }

  console.log(
    `Seed complete: ${categories.length} categories, ${suppliers.length} vendors, ${listings.length} listings (${created} new).`
  )
}

try {
  await main()
} finally {
  await db.$disconnect()
}
