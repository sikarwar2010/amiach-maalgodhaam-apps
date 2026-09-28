import { beforeEach, describe, expect, test } from "bun:test"

import { app, makeUser, makeVendor, resetDb } from "./helpers"

beforeEach(resetDb)

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])
const PDF = new TextEncoder().encode("%PDF-1.4 test")
const EXE = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 1, 2, 3])

async function upload(as: string | null, kind: string, bytes: Uint8Array, name = "f.png") {
  const form = new FormData()
  form.set("kind", kind)
  form.set("file", new File([bytes], name))
  const res = await app.request("/api/uploads", {
    method: "POST",
    body: form,
    headers: as ? { authorization: `Bearer test:${as}` } : {},
  })
  return {
    status: res.status,
    body: (await res.json()) as {
      data?: { key: string; url: string }
      error?: { code: string }
    },
  }
}

async function fetchFile(key: string, as?: string) {
  const res = await app.request(`/api/files/${key}`, {
    headers: as ? { authorization: `Bearer test:${as}` } : {},
  })
  return res
}

describe("uploads", () => {
  test("requires a session", async () => {
    expect((await upload(null, "product-image", PNG)).status).toBe(401)
  })

  test("vendors upload public product images that anyone can fetch", async () => {
    const { user } = await makeVendor()
    const r = await upload(user.clerkId, "product-image", PNG)
    expect(r.status).toBe(201)
    const file = await fetchFile(r.body.data!.key)
    expect(file.status).toBe(200)
    expect(file.headers.get("content-type")).toBe("image/png")
    expect(file.headers.get("x-content-type-options")).toBe("nosniff")
    // The storefront (www.) embeds images served by the API (api.) — a different origin.
    expect(file.headers.get("cross-origin-resource-policy")).toBe("cross-origin")
  })

  test("buyers cannot upload storefront images", async () => {
    const buyer = await makeUser("BUYER")
    expect((await upload(buyer.clerkId, "product-image", PNG)).status).toBe(403)
  })

  test("file type is decided by content, not by name or client MIME type", async () => {
    const { user } = await makeVendor()
    const r = await upload(user.clerkId, "product-image", EXE, "totally-an-image.png")
    expect(r.status).toBe(422)
    expect((await upload(user.clerkId, "product-image", PDF)).status).toBe(422)
    expect((await upload(user.clerkId, "nonsense", PNG)).status).toBe(422)
  })

  test("size limit is enforced", async () => {
    const { user } = await makeVendor()
    const big = new Uint8Array(5 * 1024 * 1024 + 10)
    big.set(PNG)
    expect([413, 422]).toContain((await upload(user.clerkId, "product-image", big)).status)
  })

  test("private documents are visible only to their owner and back-office", async () => {
    const owner = await makeUser("BUYER")
    const other = await makeUser("BUYER")
    const admin = await makeUser("ADMIN")
    const r = await upload(owner.clerkId, "vendor-document", PDF, "gst.pdf")
    expect(r.status).toBe(201)
    const key = r.body.data!.key
    expect((await fetchFile(key)).status).toBe(404)
    expect((await fetchFile(key, other.clerkId)).status).toBe(404)
    expect((await fetchFile(key, owner.clerkId)).status).toBe(200)
    expect((await fetchFile(key, admin.clerkId)).status).toBe(200)
  })

  test("path traversal and unknown scopes are refused", async () => {
    expect((await fetchFile("public/../../etc/passwd")).status).toBe(404)
    expect((await fetchFile("..%2f..%2fsecret.png")).status).toBe(404)
    expect((await fetchFile("other/scope/x.png")).status).toBe(404)
  })
})
