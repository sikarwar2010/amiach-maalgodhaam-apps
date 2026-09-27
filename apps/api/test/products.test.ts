import { beforeEach, describe, expect, test } from "bun:test"

import { db, del, get, makeCategory, makeProduct, makeUser, makeVendor, patch, post, put, resetDb } from "./helpers"

beforeEach(resetDb)

interface ProductCard {
  id: string
  slug: string
  title: string
  price: number
  vendor: { businessName: string }
}

const validProduct = (categoryId: string) => ({
  title: "Vitrified tiles 600x600",
  description: "Premium surplus vitrified tiles, first quality.",
  categoryId,
  condition: "SURPLUS",
  unit: "SQ_FT",
  price: 42,
  marketValue: 78,
  minOrderQty: 100,
  quantity: 5000,
  city: "Morbi",
  state: "Gujarat",
  images: [{ url: "https://example.com/tile.jpg" }],
})

describe("public catalogue", () => {
  test("only published products from approved vendors are listed", async () => {
    const cat = await makeCategory()
    const good = await makeVendor("APPROVED")
    const pending = await makeVendor("PENDING")
    const suspended = await makeVendor("SUSPENDED")
    await makeProduct(good.vendor.id, cat.id, { title: "Visible" })
    await makeProduct(good.vendor.id, cat.id, {
      title: "Draft",
      status: "DRAFT",
    })
    await makeProduct(good.vendor.id, cat.id, {
      title: "In review",
      status: "PENDING_REVIEW",
    })
    await makeProduct(good.vendor.id, cat.id, {
      title: "Archived",
      status: "ARCHIVED",
    })
    await makeProduct(pending.vendor.id, cat.id, {
      title: "From pending vendor",
    })
    await makeProduct(suspended.vendor.id, cat.id, {
      title: "From suspended vendor",
    })

    const r = await get<ProductCard[]>("/api/products")
    expect(r.status).toBe(200)
    expect(r.body.data?.map((p) => p.title)).toEqual(["Visible"])
    expect(r.body.meta?.total).toBe(1)
  })

  test("filters, sorting and pagination are applied server-side", async () => {
    const cat = await makeCategory("tiles")
    const other = await makeCategory("plywood")
    const { vendor } = await makeVendor()
    for (let i = 1; i <= 25; i++) {
      await makeProduct(vendor.id, cat.id, {
        title: `Tile ${i}`,
        price: i * 10,
        city: i % 2 ? "Morbi" : "Pune",
      })
    }
    await makeProduct(vendor.id, other.id, {
      title: "Birch plywood",
      price: 500,
    })

    const p1 = await get<ProductCard[]>("/api/products?category=tiles&sort=price_asc&pageSize=10")
    expect(p1.body.data).toHaveLength(10)
    expect(p1.body.meta).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    })
    expect(p1.body.data?.[0]?.price).toBe(10)

    const p3 = await get<ProductCard[]>("/api/products?category=tiles&sort=price_asc&pageSize=10&page=3")
    expect(p3.body.data).toHaveLength(5)

    const priced = await get<ProductCard[]>("/api/products?category=tiles&minPrice=100&maxPrice=150")
    expect(priced.body.data?.every((p) => p.price >= 100 && p.price <= 150)).toBe(true)

    const city = await get<ProductCard[]>("/api/products?city=pune&pageSize=100")
    expect(city.body.meta?.total).toBe(12)

    const byUnit = await get<ProductCard[]>("/api/products?unit=SQ_FT")
    expect(byUnit.body.data).toHaveLength(0)
    const byPiece = await get<ProductCard[]>("/api/products?unit=PIECE&pageSize=1")
    expect(byPiece.body.meta?.total).toBe(26)

    const search = await get<ProductCard[]>("/api/products?q=birch")
    expect(search.body.data?.map((p) => p.title)).toEqual(["Birch plywood"])
  })

  test("bad query params are 422, not silently ignored", async () => {
    expect((await get("/api/products?pageSize=5000")).status).toBe(422)
    expect((await get("/api/products?sort=chaos")).status).toBe(422)
  })

  test("detail hides unpublished products and never leaks vendor contact data", async () => {
    const cat = await makeCategory()
    const { vendor } = await makeVendor()
    const draft = await makeProduct(vendor.id, cat.id, { status: "DRAFT" })
    const live = await makeProduct(vendor.id, cat.id)
    expect((await get(`/api/products/${draft.slug}`)).status).toBe(404)
    const r = await get<{ vendor: Record<string, unknown> }>(`/api/products/${live.slug}`)
    expect(r.status).toBe(200)
    expect(r.body.data?.vendor).not.toHaveProperty("gstin")
    expect(r.body.data?.vendor).not.toHaveProperty("phone")
  })
})

describe("vendor product management", () => {
  test("an approved vendor creates a DRAFT owned by themselves, ignoring any vendorId in the body", async () => {
    const cat = await makeCategory()
    const a = await makeVendor()
    const b = await makeVendor()
    const r = await post<{ id: string; status: string }>(
      "/api/vendor/products",
      { ...validProduct(cat.id), vendorId: b.vendor.id, status: "PUBLISHED" },
      a.user.clerkId
    )
    expect(r.status).toBe(201)
    expect(r.body.data?.status).toBe("DRAFT")
    const row = await db.product.findUniqueOrThrow({
      where: { id: r.body.data!.id },
    })
    expect(row.vendorId).toBe(a.vendor.id)
  })

  test("a pending vendor can prepare drafts but cannot submit them for review", async () => {
    const cat = await makeCategory()
    const { user } = await makeVendor("PENDING")
    const created = await post<{ id: string; status: string }>(
      "/api/vendor/products",
      validProduct(cat.id),
      user.clerkId
    )
    expect(created.status).toBe(201)
    expect(created.body.data?.status).toBe("DRAFT")
    const submit = await post(
      `/api/vendor/products/${created.body.data!.id}/status`,
      { status: "PENDING_REVIEW" },
      user.clerkId
    )
    expect(submit.status).toBe(403)
  })

  test("suspended vendors cannot create products", async () => {
    const cat = await makeCategory()
    const { user } = await makeVendor("SUSPENDED")
    expect((await post("/api/vendor/products", validProduct(cat.id), user.clerkId)).status).toBe(403)
  })

  test("validation errors carry field paths", async () => {
    const cat = await makeCategory()
    const { user } = await makeVendor()
    const r = await post(
      "/api/vendor/products",
      { ...validProduct(cat.id), price: -5, minOrderQty: 9999 },
      user.clerkId
    )
    expect(r.status).toBe(422)
    expect(r.body.error?.details?.map((d) => d.path)).toEqual(expect.arrayContaining(["price", "minOrderQty"]))
  })

  test("IDOR: vendor B cannot read, edit, publish, delete or touch images of vendor A's product", async () => {
    const cat = await makeCategory()
    const a = await makeVendor()
    const b = await makeVendor()
    const product = await makeProduct(a.vendor.id, cat.id, { status: "DRAFT" })
    const image = await db.productImage.findFirstOrThrow({
      where: { productId: product.id },
    })

    expect((await get(`/api/vendor/products/${product.id}`, b.user.clerkId)).status).toBe(404)
    expect((await patch(`/api/vendor/products/${product.id}`, { title: "Hijacked" }, b.user.clerkId)).status).toBe(404)
    expect(
      (await post(`/api/vendor/products/${product.id}/status`, { status: "PENDING_REVIEW" }, b.user.clerkId)).status
    ).toBe(404)
    expect((await del(`/api/vendor/products/${product.id}`, b.user.clerkId)).status).toBe(404)
    expect((await del(`/api/vendor/products/${product.id}/images/${image.id}`, b.user.clerkId)).status).toBe(404)
    expect(
      (await post(`/api/vendor/products/${product.id}/images`, { url: "https://example.com/x.jpg" }, b.user.clerkId))
        .status
    ).toBe(404)

    const still = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    })
    expect(still.title).toBe(product.title)
    expect(still.deletedAt).toBeNull()

    const list = await get<{ id: string }[]>("/api/vendor/products", b.user.clerkId)
    expect(list.body.data).toHaveLength(0)
  })

  test("full lifecycle: draft → review → admin publish → public; edits to reviewed fields re-trigger review", async () => {
    const cat = await makeCategory()
    const admin = await makeUser("ADMIN")
    const { user } = await makeVendor()
    const created = await post<{ id: string; slug: string }>("/api/vendor/products", validProduct(cat.id), user.clerkId)
    const id = created.body.data!.id
    const slug = created.body.data!.slug

    expect((await get(`/api/products/${slug}`)).status).toBe(404)
    // vendors cannot publish themselves
    expect((await post(`/api/vendor/products/${id}/status`, { status: "PUBLISHED" }, user.clerkId)).status).toBe(422)
    expect((await post(`/api/vendor/products/${id}/status`, { status: "PENDING_REVIEW" }, user.clerkId)).status).toBe(
      200
    )
    // …nor can they approve via the admin API
    expect((await post(`/api/admin/products/${id}/decision`, { status: "PUBLISHED" }, user.clerkId)).status).toBe(403)

    expect((await post(`/api/admin/products/${id}/decision`, { status: "REJECTED" }, admin.clerkId)).status).toBe(422)
    const approved = await post(`/api/admin/products/${id}/decision`, { status: "PUBLISHED" }, admin.clerkId)
    expect(approved.status).toBe(200)
    expect((await get(`/api/products/${slug}`)).status).toBe(200)

    // price change keeps it live; title change sends it back to review and off the storefront
    expect((await patch(`/api/vendor/products/${id}`, { price: 40 }, user.clerkId)).status).toBe(200)
    expect((await get(`/api/products/${slug}`)).status).toBe(200)
    const retitled = await patch<{ status: string }>(
      `/api/vendor/products/${id}`,
      { title: "Completely different tiles" },
      user.clerkId
    )
    expect(retitled.body.data?.status).toBe("PENDING_REVIEW")
    expect((await get(`/api/products/${slug}`)).status).toBe(404)

    const actions = (await db.auditLog.findMany({ where: { entityId: id } })).map((a) => a.action)
    expect(actions).toEqual(expect.arrayContaining(["product.created", "product.status_changed", "product.decision"]))
  })

  test("submitting for review needs an image; image order and primary are honoured", async () => {
    const cat = await makeCategory()
    const { user } = await makeVendor()
    const noImages = { ...validProduct(cat.id), images: [] }
    const created = await post<{ id: string }>("/api/vendor/products", noImages, user.clerkId)
    const id = created.body.data!.id
    expect((await post(`/api/vendor/products/${id}/status`, { status: "PENDING_REVIEW" }, user.clerkId)).status).toBe(
      422
    )

    const i1 = await post<{ id: string }>(
      `/api/vendor/products/${id}/images`,
      { url: "https://example.com/1.jpg" },
      user.clerkId
    )
    const i2 = await post<{ id: string }>(
      `/api/vendor/products/${id}/images`,
      { url: "https://example.com/2.jpg" },
      user.clerkId
    )
    const reordered = await put<{
      images: { id: string; isPrimary: boolean }[]
    }>(`/api/vendor/products/${id}/images/order`, { imageIds: [i2.body.data!.id, i1.body.data!.id] }, user.clerkId)
    expect(reordered.body.data?.images[0]).toMatchObject({
      id: i2.body.data!.id,
      isPrimary: true,
    })
    expect(
      (await put(`/api/vendor/products/${id}/images/order`, { imageIds: [i1.body.data!.id] }, user.clerkId)).status
    ).toBe(422)
    expect((await post(`/api/vendor/products/${id}/status`, { status: "PENDING_REVIEW" }, user.clerkId)).status).toBe(
      200
    )
  })

  test("suspending a vendor pulls their listings from the storefront", async () => {
    const cat = await makeCategory()
    const admin = await makeUser("ADMIN")
    const { vendor } = await makeVendor()
    const p = await makeProduct(vendor.id, cat.id)
    expect((await get(`/api/products/${p.slug}`)).status).toBe(200)
    const r = await post(
      `/api/admin/vendors/${vendor.id}/decision`,
      { status: "SUSPENDED", reason: "Policy" },
      admin.clerkId
    )
    expect(r.status).toBe(200)
    expect((await get(`/api/products/${p.slug}`)).status).toBe(404)
  })
})

describe("categories", () => {
  test("only admins manage categories; deletion is blocked while products exist", async () => {
    const admin = await makeUser("ADMIN")
    const buyer = await makeUser("BUYER")
    const body = { name: "Sanitaryware", slug: "sanitaryware" }
    expect((await post("/api/admin/categories", body, buyer.clerkId)).status).toBe(403)
    const created = await post<{ id: string }>("/api/admin/categories", body, admin.clerkId)
    expect(created.status).toBe(201)
    expect((await post("/api/admin/categories", body, admin.clerkId)).status).toBe(409)

    const { vendor } = await makeVendor()
    await makeProduct(vendor.id, created.body.data!.id)
    expect((await del(`/api/admin/categories/${created.body.data!.id}`, admin.clerkId)).status).toBe(409)
    expect((await get("/api/categories")).body.data).toHaveLength(1)
  })
})

describe("contact form", () => {
  test("stores valid messages and rejects junk", async () => {
    const ok = await post("/api/contact", {
      name: "Asha",
      email: "asha@example.com",
      message: "I would like to know about bulk tile pricing.",
    })
    expect(ok.status).toBe(201)
    expect(await db.contactMessage.count()).toBe(1)
    expect((await post("/api/contact", { name: "", email: "nope", message: "x" })).status).toBe(422)
  })

  test("only back-office can read the inbox", async () => {
    const buyer = await makeUser("BUYER")
    const admin = await makeUser("ADMIN")
    expect((await get("/api/admin/contact-messages", buyer.clerkId)).status).toBe(403)
    expect((await get("/api/admin/contact-messages", admin.clerkId)).status).toBe(200)
  })
})

describe("edits do not wipe untouched data", () => {
  test("changing only the price keeps images, tiers, tags and deal type", async () => {
    const cat = await makeCategory()
    const { user } = await makeVendor()
    const created = await post<{ id: string }>(
      "/api/vendor/products",
      {
        ...validProduct(cat.id),
        dealType: "BULK_DEAL",
        tags: ["marble"],
        bulkPrices: [{ minQty: 500, unitPrice: 40 }],
      },
      user.clerkId
    )
    const id = created.body.data!.id
    expect((await patch(`/api/vendor/products/${id}`, { price: 41 }, user.clerkId)).status).toBe(200)
    const row = await db.product.findUniqueOrThrow({
      where: { id },
      include: { images: true, bulkPrices: true },
    })
    expect(Number(row.price)).toBe(41)
    expect(row.dealType).toBe("BULK_DEAL")
    expect(row.tags).toEqual(["marble"])
    expect(row.images).toHaveLength(1)
    expect(row.bulkPrices).toHaveLength(1)
  })

  test("renaming a hidden category keeps it hidden", async () => {
    const admin = await makeUser("ADMIN")
    const created = await post<{ id: string }>(
      "/api/admin/categories",
      { name: "Hidden", slug: "hidden", isActive: false, sortOrder: 7 },
      admin.clerkId
    )
    expect(
      (await patch(`/api/admin/categories/${created.body.data!.id}`, { name: "Still hidden" }, admin.clerkId)).status
    ).toBe(200)
    const row = await db.category.findUniqueOrThrow({ where: { id: created.body.data!.id } })
    expect(row).toMatchObject({ name: "Still hidden", isActive: false, sortOrder: 7 })
  })

  test("category creation via the admin API with image, description and order works end to end", async () => {
    const admin = await makeUser("SUPER_ADMIN")
    const r = await post<{ slug: string }>(
      "/api/admin/categories",
      {
        name: "Electronics & Electricals",
        slug: "electronics-and-electricals",
        description: "Wiring and fittings",
        imageUrl: "http://localhost:4100/api/files/public/category-image/x.png",
        sortOrder: 3,
      },
      admin.clerkId
    )
    expect(r.status).toBe(201)
    expect((await get<{ slug: string }[]>("/api/categories")).body.data?.map((c) => c.slug)).toContain(
      "electronics-and-electricals"
    )
  })
})
