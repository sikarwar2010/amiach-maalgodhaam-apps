import type { Prisma, PrismaClient } from "@workspace/db"
import type { NotificationType } from "@workspace/types"

type Db = PrismaClient | Prisma.TransactionClient

/** Tell every active back-office user (staff, admin, super admin) that something needs their attention. */
export async function notifyBackOffice(
  db: Db,
  n: { type: NotificationType; title: string; body?: string; data?: Prisma.InputJsonValue }
): Promise<void> {
  const staff = await db.user.findMany({
    where: { role: { in: ["STAFF", "ADMIN", "SUPER_ADMIN"] }, status: "ACTIVE" },
    select: { id: true },
  })
  if (staff.length === 0) return
  await db.notification.createMany({
    data: staff.map((s) => ({
      userId: s.id,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      ...(n.data !== undefined ? { data: n.data } : {}),
    })),
  })
}
