import { ERROR_STATUS, type ErrorCode } from "@workspace/types"

export class AppError extends Error {
  readonly code: ErrorCode
  readonly details?: { path: string; message: string }[]

  constructor(code: ErrorCode, message: string, details?: { path: string; message: string }[]) {
    super(message)
    this.name = "AppError"
    this.code = code
    if (details) this.details = details
  }

  get status(): number {
    return ERROR_STATUS[this.code]
  }
}

export const badRequest = (message = "Bad request") => new AppError("BAD_REQUEST", message)
export const unauthorized = (message = "Authentication required") => new AppError("UNAUTHORIZED", message)
export const forbidden = (message = "You do not have permission to do that") => new AppError("FORBIDDEN", message)
/** Use for both "missing" and "not yours" so resource existence is never leaked (IDOR-safe). */
export const notFound = (what = "Resource") => new AppError("NOT_FOUND", `${what} not found`)
export const conflict = (message: string) => new AppError("CONFLICT", message)
export const validation = (message: string, details?: { path: string; message: string }[]) =>
  new AppError("VALIDATION_ERROR", message, details)
