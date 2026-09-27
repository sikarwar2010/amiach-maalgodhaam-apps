export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

/** Short random suffix so slugs stay unique without a lookup loop. */
export function withSuffix(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${slugify(base) || "item"}-${suffix}`
}
