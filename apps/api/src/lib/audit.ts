import type { Prisma, PrismaClient } from "@workspace/db"
import type { ActorRole } from "@workspace/types"

import type { CurrentUser } from "../context"

type Db = PrismaClient | Prisma.TransactionClient

export interface AuditEntry {
  actor: Pick<CurrentUser, "id" | "role"> | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Prisma.InputJsonValue
  ip?: string | null
}

/**
 * Append-only audit trail. Pass the transaction client when the audited change itself runs in a
 * transaction so the record commits or rolls back together with the change.
 */
export async function audit(db: Db, entry: AuditEntry): Promise<void> {
  const role: ActorRole = entry.actor?.role ?? "PUBLIC"
  await db.auditLog.create({
    data: {
      actorId: entry.actor?.id ?? null,
      actorRole: role,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      ...(entry.metadata !== undefined ? { metadata: entry.metadata } : {}),
      ip: entry.ip ?? null,
    },
  })
}
