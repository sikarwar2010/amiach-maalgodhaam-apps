"use client"

import { useState } from "react"
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react"
import type { AddressDto } from "@workspace/types"

import { Button } from "@/components/ui/Button"
import { EmptyState, ErrorNote, LoadingRows, Panel } from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { useResource } from "@/lib/api/use-resource"

import { AddressForm } from "./AddressForm"

export function AddressesView() {
  const { request } = useApi()
  const list = useResource<AddressDto[]>("/api/me/addresses")
  const [editing, setEditing] = useState<AddressDto | "new" | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (list.error) return <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
  if (list.loading) return <LoadingRows rows={2} />
  const rows = list.data ?? []

  const remove = async (a: AddressDto) => {
    if (!window.confirm("Delete this address?")) return
    setError(null)
    try {
      await request(`/api/me/addresses/${a.id}`, { method: "DELETE" })
      await list.reload()
    } catch {
      setError("Could not delete this address.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <ErrorNote message={error} />}
      {editing ? (
        <Panel title={editing === "new" ? "Add an address" : "Edit address"}>
          <AddressForm
            {...(editing !== "new" ? { initial: editing } : {})}
            onSaved={() => {
              setEditing(null)
              void list.reload()
            }}
            onCancel={() => setEditing(null)}
          />
        </Panel>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No saved addresses"
          text="Save a delivery address to check out faster."
          action={<Button onClick={() => setEditing("new")}>Add an address</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map((a) => (
              <div key={a.id} className="rounded-3xl border border-ink-100 bg-white p-5 text-sm shadow-soft-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-ink-900">
                    {a.fullName} {a.label && <span className="font-medium text-ink-400">· {a.label}</span>}
                  </div>
                  {a.isDefault && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                      DEFAULT
                    </span>
                  )}
                </div>
                <p className="mt-2 text-ink-600">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {a.city}, {a.state} {a.pincode}
                </p>
                <p className="mt-1 text-ink-500">{a.phone}</p>
                <div className="mt-3 flex gap-3 text-xs font-semibold">
                  <button
                    onClick={() => setEditing(a)}
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => void remove(a)}
                    className="inline-flex items-center gap-1 text-danger-600 hover:underline"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <Button variant="outline" onClick={() => setEditing("new")}>
              <Plus size={16} /> Add an address
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
