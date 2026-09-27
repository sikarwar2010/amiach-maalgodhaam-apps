import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "./generated/client"

/** Fail a dead database quickly instead of hanging until Docker marks the container unhealthy. */
function withConnectTimeout(connectionString: string): string {
  if (/(?:^|[?&])connect_timeout=/.test(connectionString)) return connectionString
  const joiner = connectionString.includes("?") ? "&" : "?"
  return `${connectionString}${joiner}connect_timeout=15`
}

export function createPrismaClient(connectionString?: string): PrismaClient {
  const url = connectionString ?? process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: withConnectTimeout(url) }) })
}

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

/** Lazily-created shared client (survives hot reloads in dev). */
export function getDb(): PrismaClient {
  globalForPrisma.__prisma ??= createPrismaClient()
  return globalForPrisma.__prisma
}
