import { roleFromMetadata } from "@workspace/auth"
import { Prisma } from "@workspace/db"
import { Hono } from "hono"
import { Webhook } from "svix"
import { z } from "zod"

import type { AppEnv } from "../context"
import { audit } from "../lib/audit"
import { isBootstrapAdmin } from "../lib/bootstrap"
import { AppError, badRequest, unauthorized } from "../lib/errors"
import { ok } from "../lib/http"

const clerkUser = z.object({
  id: z.string(),
  primary_email_address_id: z.string().nullable().optional(),
  email_addresses: z
    .array(
      z.object({
        id: z.string(),
        email_address: z.string(),
        verification: z.object({ status: z.string().nullish() }).nullish(),
      })
    )
    .default([]),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  phone_numbers: z.array(z.object({ phone_number: z.string() })).default([]),
  public_metadata: z.record(z.string(), z.unknown()).default({}),
})

const event = z.object({
  type: z.string(),
  data: z.unknown(),
})

export const webhookRoutes = new Hono<AppEnv>()

/**
 * Clerk → DB sync. Signature-verified with Svix and idempotent on the `svix-id` header,
 * so retries and duplicate deliveries are harmless.
 */
webhookRoutes.post("/clerk", async (c) => {
  const secret = c.get("env").CLERK_WEBHOOK_SECRET
  if (!secret) throw new AppError("INTERNAL_ERROR", "Webhook receiver is not configured")

  const svixId = c.req.header("svix-id")
  const svixTimestamp = c.req.header("svix-timestamp")
  const svixSignature = c.req.header("svix-signature")
  if (!svixId || !svixTimestamp || !svixSignature) throw badRequest("Missing Svix headers")

  const raw = await c.req.text()
  try {
    // Throws unless the signature and timestamp are valid; the return value is not the payload.
    new Webhook(secret).verify(raw, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    })
  } catch {
    throw unauthorized("Invalid webhook signature")
  }
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    throw badRequest("Malformed webhook payload")
  }
  const parsedEvent = event.safeParse(payload)
  if (!parsedEvent.success) throw badRequest("Malformed webhook payload")
  const { type, data } = parsedEvent.data
  const db = c.get("db")

  const result = await db.$transaction(async (tx) => {
    try {
      await tx.webhookEvent.create({ data: { id: svixId, type } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return "duplicate" as const
      }
      throw error
    }

    if (type === "user.deleted") {
      const id = z.object({ id: z.string() }).safeParse(data)
      if (id.success) {
        const existing = await tx.user.findUnique({
          where: { clerkId: id.data.id },
        })
        if (existing && existing.status !== "DELETED") {
          await tx.user.update({
            where: { id: existing.id },
            // Free the unique email so the person can sign up again; keep the row for order history.
            data: {
              status: "DELETED",
              deletedAt: new Date(),
              email: `deleted+${existing.id}@deleted.invalid`,
              name: null,
              phone: null,
              imageUrl: null,
            },
          })
          await audit(tx, {
            actor: null,
            action: "user.deleted_via_clerk",
            entityType: "User",
            entityId: existing.id,
          })
        }
      }
      return "processed" as const
    }

    if (type !== "user.created" && type !== "user.updated") return "ignored" as const

    const parsedUser = clerkUser.safeParse(data)
    if (!parsedUser.success) return "ignored" as const
    const u = parsedUser.data
    const primary = u.email_addresses.find((e) => e.id === u.primary_email_address_id) ?? u.email_addresses[0]
    if (!primary) return "ignored" as const

    const profile = {
      email: primary.email_address.toLowerCase(),
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || null,
      imageUrl: u.image_url ?? null,
      phone: u.phone_numbers[0]?.phone_number ?? null,
    }
    const bootstrapAdmin = isBootstrapAdmin(c.get("env"), profile.email, primary.verification?.status === "verified")
    const hasExplicitRole = "role" in u.public_metadata
    const metadataRole = roleFromMetadata(u.public_metadata)

    const existing = await tx.user.findUnique({ where: { clerkId: u.id } })
    if (!existing) {
      const created = await tx.user.upsert({
        where: { clerkId: u.id },
        create: { clerkId: u.id, ...profile, role: bootstrapAdmin ? "SUPER_ADMIN" : metadataRole },
        update: profile,
      })
      await audit(tx, {
        actor: null,
        action: "user.created_via_clerk",
        entityType: "User",
        entityId: created.id,
      })
    } else if (existing.status !== "DELETED") {
      const targetRole = bootstrapAdmin ? "SUPER_ADMIN" : metadataRole
      const roleChanged = (bootstrapAdmin || hasExplicitRole) && targetRole !== existing.role
      await tx.user.update({
        where: { id: existing.id },
        data: { ...profile, ...(roleChanged ? { role: targetRole } : {}) },
      })
      if (roleChanged) {
        await audit(tx, {
          actor: null,
          action: "user.role_synced_from_clerk",
          entityType: "User",
          entityId: existing.id,
          metadata: { from: existing.role, to: targetRole },
        })
      }
    }
    return "processed" as const
  })

  return ok(c, { result })
})
