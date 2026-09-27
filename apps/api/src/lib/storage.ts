import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, resolve, sep } from "node:path"

export interface StoredFile {
  bytes: Uint8Array
  contentType: string
}

/**
 * Where uploaded files live. The API only depends on this interface; swap `createLocalStorage`
 * for an S3/R2 implementation in production without touching the routes.
 */
export interface StorageDriver {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>
  get(key: string): Promise<StoredFile | null>
  remove(key: string): Promise<void>
}

const KEY_PATTERN = /^[a-z0-9][a-z0-9/_.-]{0,200}$/

/** Keys are generated server-side, but every driver call still validates them (no traversal, no odd chars). */
export function isSafeKey(key: string): boolean {
  return KEY_PATTERN.test(key) && !key.includes("..") && !key.includes("//")
}

const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
}

export function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop() ?? ""
  return TYPE_BY_EXT[ext] ?? "application/octet-stream"
}

export function createLocalStorage(rootDir: string): StorageDriver {
  const root = resolve(rootDir)

  const pathFor = (key: string): string => {
    if (!isSafeKey(key)) throw new Error("Invalid storage key")
    const full = resolve(root, key)
    if (!full.startsWith(root + sep)) throw new Error("Invalid storage key")
    return full
  }

  return {
    async put(key, bytes) {
      const path = pathFor(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, bytes)
    },
    async get(key) {
      try {
        const bytes = await readFile(pathFor(key))
        return { bytes, contentType: contentTypeForKey(key) }
      } catch {
        return null
      }
    },
    async remove(key) {
      await rm(pathFor(key), { force: true })
    },
  }
}

export type DetectedType = {
  ext: "jpg" | "png" | "webp" | "pdf"
  contentType: string
}

/** Identify a file by its magic bytes — the client-supplied MIME type is never trusted. */
export function sniffType(bytes: Uint8Array): DetectedType | null {
  const startsWith = (...sig: number[]) => sig.every((b, i) => bytes[i] === b)
  if (startsWith(0xff, 0xd8, 0xff)) return { ext: "jpg", contentType: "image/jpeg" }
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { ext: "png", contentType: "image/png" }
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", contentType: "image/webp" }
  }
  if (startsWith(0x25, 0x50, 0x44, 0x46)) return { ext: "pdf", contentType: "application/pdf" }
  return null
}
