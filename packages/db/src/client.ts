import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "./generated/client"

export function createPrismaClient(connectionString?: string): PrismaClient {
  const url = connectionString ?? process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
}

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

/** Lazily-created shared client (survives hot reloads in dev). */
export function getDb(): PrismaClient {
  globalForPrisma.__prisma ??= createPrismaClient()
  return globalForPrisma.__prisma
}
