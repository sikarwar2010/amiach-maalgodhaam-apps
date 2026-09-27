"use client"

import { useState } from "react"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { notifyCartChanged } from "@/components/session/MeProvider"
import { useApi } from "@/lib/api/client"
import { useResource } from "@/lib/api/use-resource"
import { cn } from "@/lib/utils"

import { Pager } from "./Pager"
import { EmptyState, ErrorNote, LoadingRows, Panel } from "./ui"

interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  readAt: string | null
  createdAt: string
}

export function NotificationsView() {
  const { request } = useApi()
  const [page, setPage] = useState(1)
  const list = useResource<NotificationRow[]>("/api/me/notifications", {
    page,
    pageSize: 15,
  })

  if (list.error) return <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
  if (list.loading) return <LoadingRows />
  const rows = list.data ?? []
  if (rows.length === 0) {
    return (
      <EmptyState icon={Bell} title="You're all caught up" text="Order, quote and account updates will appear here." />
    )
  }

  const markRead = async (n: NotificationRow) => {
    if (n.readAt) return
    await request(`/api/me/notifications/${n.id}/read`, {
      method: "POST",
      body: {},
    }).catch(() => undefined)
    list.set(rows.map((r) => (r.id === n.id ? { ...r, readAt: new Date().toISOString() } : r)))
    notifyCartChanged() // refreshes the unread badge in the header
  }
  const markAll = async () => {
    await request("/api/me/notifications/read-all", {
      method: "POST",
      body: {},
    }).catch(() => undefined)
    notifyCartChanged()
    await list.reload()
  }

  return (
    <Panel
      title="Notifications"
      action={
        rows.some((r) => !r.readAt) ? (
          <Button size="sm" variant="outline" onClick={() => void markAll()}>
            Mark all read
          </Button>
        ) : undefined
      }
    >
      <ul className="divide-y divide-ink-100">
        {rows.map((n) => (
          <li key={n.id}>
            <button onClick={() => void markRead(n)} className="flex w-full items-start gap-3 py-3 text-left">
              <span
                className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-ink-200" : "bg-accent-500")}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm", n.readAt ? "text-ink-600" : "font-bold text-ink-900")}>
                  {n.title}
                </span>
                {n.body && <span className="block text-xs text-ink-500">{n.body}</span>}
                <span className="block text-[11px] text-ink-400">{new Date(n.createdAt).toLocaleString("en-IN")}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Pager meta={list.meta} onPage={setPage} />
    </Panel>
  )
}
