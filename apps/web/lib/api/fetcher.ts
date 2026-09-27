import type { ApiResponse, ErrorCode, PageMeta } from "@workspace/types"

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode | "NETWORK"
  readonly details: { path: string; message: string }[]

  constructor(
    status: number,
    code: ErrorCode | "NETWORK",
    message: string,
    details: { path: string; message: string }[] = []
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }

  /** Field-level messages keyed by field path, for forms. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((d) => [d.path, d.message]))
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  /** Query-string parameters; undefined/null/empty values are skipped, arrays become comma lists. */
  query?: object
  token?: string | null
  /** Seconds to cache a public GET (Next data cache). Omit for no caching. */
  revalidate?: number
  signal?: AbortSignal
}

export interface ApiResult<T> {
  data: T
  meta: PageMeta | undefined
}

export function buildUrl(base: string, path: string, query?: ApiOptions["query"]): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) {
      if (value.length) url.searchParams.set(key, value.join(","))
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      if (value !== "") url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

/** Talks to the Hono API and unwraps its `{ success, data }` envelope; failures become `ApiError`. */
export async function apiRequest<T>(base: string, path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { accept: "application/json" }
  if (options.token) headers.authorization = `Bearer ${options.token}`
  let body: string | undefined
  if (options.body !== undefined) {
    headers["content-type"] = "application/json"
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(base, path, options.query), {
      method: options.method ?? "GET",
      headers,
      ...(body !== undefined ? { body } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.revalidate !== undefined && (options.method ?? "GET") === "GET"
        ? { next: { revalidate: options.revalidate } }
        : { cache: "no-store" as const }),
    })
  } catch {
    throw new ApiError(0, "NETWORK", "We couldn't reach the server. Please try again.")
  }

  let json: ApiResponse<T> | null = null
  try {
    json = (await response.json()) as ApiResponse<T>
  } catch {
    // fall through: non-JSON error page from a proxy, etc.
  }

  if (!json || !json.success) {
    const error = json && !json.success ? json.error : null
    throw new ApiError(
      response.status,
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? "Something went wrong. Please try again.",
      error?.details ?? []
    )
  }
  return { data: json.data, meta: json.meta }
}
