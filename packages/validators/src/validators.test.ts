import { describe, expect, test } from "bun:test"

import {
  addCartItemInput,
  createInquiryInput,
  categoryInput,
  categoryUpdateInput,
  createProductInput,
  gstin,
  onboardingBuyerInput,
  pan,
  phone,
  productListQuery,
  updateProductInput,
  vendorRegistrationInput,
} from "./index"

describe("Indian identifiers", () => {
  test("GSTIN", () => {
    expect(gstin.safeParse("27aapfu0939f1zv").success).toBe(true)
    expect(gstin.safeParse("not-a-gstin").success).toBe(false)
  })
  test("PAN", () => {
    expect(pan.safeParse("ABCDE1234F").success).toBe(true)
    expect(pan.safeParse("ABCDE12345").success).toBe(false)
  })
  test("phone", () => {
    expect(phone.safeParse("9876543210").success).toBe(true)
    expect(phone.safeParse("1234567890").success).toBe(false)
  })
})

const validProduct = {
  title: "Vitrified tiles 600x600",
  description: "Premium surplus vitrified tiles, first quality.",
  categoryId: "cat_1",
  condition: "SURPLUS",
  unit: "SQ_FT",
  price: 42,
  marketValue: 78,
  minOrderQty: 100,
  quantity: 5000,
  city: "Morbi",
  state: "Gujarat",
}

describe("createProductInput", () => {
  test("accepts a valid product and applies defaults", () => {
    const parsed = createProductInput.parse(validProduct)
    expect(parsed.dealType).toBe("BUY_NOW")
    expect(parsed.images).toEqual([])
  })
  test("rejects market value below price", () => {
    const r = createProductInput.safeParse({ ...validProduct, marketValue: 10 })
    expect(r.success).toBe(false)
  })
  test("rejects MOQ above stock", () => {
    const r = createProductInput.safeParse({
      ...validProduct,
      minOrderQty: 6000,
    })
    expect(r.success).toBe(false)
  })
  test("rejects duplicate bulk tiers", () => {
    const r = createProductInput.safeParse({
      ...validProduct,
      bulkPrices: [
        { minQty: 500, unitPrice: 40 },
        { minQty: 500, unitPrice: 38 },
      ],
    })
    expect(r.success).toBe(false)
  })
  test("rejects non-http image urls and bad money", () => {
    expect(
      createProductInput.safeParse({
        ...validProduct,
        images: [{ url: "javascript:alert(1)" }],
      }).success
    ).toBe(false)
    expect(
      createProductInput.safeParse({
        ...validProduct,
        images: [{ url: "ftp://example.com/x.jpg" }],
      }).success
    ).toBe(false)
    expect(createProductInput.safeParse({ ...validProduct, price: 10.123 }).success).toBe(false)
    expect(createProductInput.safeParse({ ...validProduct, price: -1 }).success).toBe(false)
  })
  test("ignores client-supplied vendor identity", () => {
    const parsed = createProductInput.parse({
      ...validProduct,
      vendorId: "someone_else",
    })
    expect("vendorId" in parsed).toBe(false)
  })
})

describe("productListQuery", () => {
  test("coerces and clamps paging", () => {
    const q = productListQuery.parse({ page: "2", pageSize: "50" })
    expect(q.page).toBe(2)
    expect(q.pageSize).toBe(50)
    expect(productListQuery.safeParse({ pageSize: "1000" }).success).toBe(false)
  })
  test("parses csv and boolean filters", () => {
    const q = productListQuery.parse({
      condition: "SURPLUS,CLEARANCE",
      inStock: "true",
    })
    expect(q.condition).toEqual(["SURPLUS", "CLEARANCE"])
    expect(q.inStock).toBe(true)
  })
})

describe("cart / onboarding / vendor / b2b", () => {
  test("cart quantity must be a positive integer", () => {
    expect(addCartItemInput.safeParse({ productId: "p1", quantity: 0 }).success).toBe(false)
    expect(addCartItemInput.safeParse({ productId: "p1", quantity: 1.5 }).success).toBe(false)
    expect(addCartItemInput.parse({ productId: "p1" }).quantity).toBe(1)
  })
  test("business buyers need a company name (GSTIN can follow later)", () => {
    const r = onboardingBuyerInput.safeParse({
      buyerType: "BUSINESS",
      name: "Asha",
      phone: "9876543210",
    })
    expect(r.success).toBe(false)
    expect(
      onboardingBuyerInput.safeParse({
        buyerType: "INDIVIDUAL",
        name: "Asha",
        phone: "9876543210",
      }).success
    ).toBe(true)
  })
  test("vendor registration requires GSTIN", () => {
    const base = {
      businessName: "Shree Tiles",
      contactName: "Ramesh",
      phone: "9876543210",
      addressLine: "Plot 4",
      city: "Morbi",
      state: "Gujarat",
      pincode: "363641",
    }
    expect(vendorRegistrationInput.safeParse(base).success).toBe(false)
    expect(vendorRegistrationInput.safeParse({ ...base, gstin: "24AAAAA0000A1Z5" }).success).toBe(true)
  })
  test("inquiry needs a sensible quantity", () => {
    const r = createInquiryInput.safeParse({
      title: "Need 5000 sqft tiles",
      description: "Looking for 600x600 vitrified tiles for a project.",
      quantity: 0,
      unit: "SQ_FT",
      deliveryCity: "Pune",
    })
    expect(r.success).toBe(false)
  })
})

describe("partial updates never inject defaults", () => {
  test("a product edit contains only the fields that were sent", () => {
    expect(updateProductInput.parse({ price: 5 })).toEqual({ price: 5 })
  })
  test("a category edit does not reset order or visibility", () => {
    expect(categoryUpdateInput.parse({ name: "Renamed" })).toEqual({ name: "Renamed" })
    // …while creating still defaults them
    expect(categoryInput.parse({ name: "New", slug: "new" })).toMatchObject({ sortOrder: 0, isActive: true })
  })
})
