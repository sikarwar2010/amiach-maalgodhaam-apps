import { describe, expect, test } from "bun:test"

import { activeFilterCount, parseFilters, slugifyCity, toApiQuery } from "./catalogue-filters"

describe("parseFilters", () => {
  test("defaults", () => {
    const f = parseFilters({})
    expect(f).toMatchObject({ q: "", sort: "newest", page: 1, conditions: [] })
  })

  test("reads valid values and ignores junk", () => {
    const f = parseFilters({
      q: " tiles ",
      condition: "SURPLUS,CLEARANCE,nonsense",
      dealType: "BULK_DEAL",
      unit: "NOPE",
      minPrice: "100",
      maxPrice: "-5",
      sort: "price_asc",
      page: "3",
    })
    expect(f.q).toBe("tiles")
    expect(f.conditions).toEqual(["SURPLUS", "CLEARANCE"])
    expect(f.dealType).toBe("BULK_DEAL")
    expect(f.unit).toBeUndefined()
    expect(f.minPrice).toBe(100)
    expect(f.maxPrice).toBeUndefined()
    expect(f.sort).toBe("price_asc")
    expect(f.page).toBe(3)
  })

  test("bad sort and page fall back", () => {
    const f = parseFilters({ sort: "chaos", page: "-2" })
    expect(f.sort).toBe("newest")
    expect(f.page).toBe(1)
  })
})

describe("query building", () => {
  test("presets win over the URL so a category page cannot be re-pointed", () => {
    const f = parseFilters({ category: "furniture" })
    expect(toApiQuery(f, { category: "tiles" }).category).toBe("tiles")
  })

  test("locked facets do not count as active filters", () => {
    const f = parseFilters({ category: "tiles", condition: "SURPLUS" })
    expect(activeFilterCount(f)).toBe(2)
    expect(activeFilterCount(f, ["category"])).toBe(1)
  })

  test("city slugs", () => {
    expect(slugifyCity("Delhi NCR")).toBe("delhi-ncr")
    expect(slugifyCity("  Navi Mumbai ")).toBe("navi-mumbai")
  })
})
