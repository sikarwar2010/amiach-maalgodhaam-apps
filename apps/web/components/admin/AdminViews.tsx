"use client"

import Link from "next/link"
import { useState } from "react"
import { ClipboardList, Loader2, MailQuestion, ShieldCheck, Users, Boxes, Wallet } from "lucide-react"
import {
  ROLES,
  VENDOR_STATUSES,
  PRODUCT_STATUSES,
  type ProductStatus,
  type Role,
  type VendorStatus,
} from "@workspace/types"

import { Pager } from "@/components/portal/Pager"
import {
  EmptyState,
  ErrorNote,
  LoadingRows,
  Panel,
  StatCard,
  StatusBadge,
  TableWrap,
  td,
  th,
} from "@/components/portal/ui"
import { useApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/fetcher"
import { useOpenFile } from "@/lib/api/use-open-file"
import { useResource } from "@/lib/api/use-resource"
import { formatCurrency } from "@/lib/utils"

const select = "h-11 rounded-xl border border-ink-200 bg-white px-3.5 text-sm focus:border-brand-400 focus:outline-none"
const label = (s: string) => s.replaceAll("_", " ").toLowerCase()

/* ------------------------------- overview ------------------------------- */

interface AdminDashboard {
  users: Record<string, number>
  vendors: Record<string, number>
  products: Record<string, number>
  orders: number
  grossOrderValue: number
  openInquiries: number
}

export function AdminOverview() {
  const dash = useResource<AdminDashboard>("/api/admin/dashboard")
  if (dash.error) return <ErrorNote message={dash.error.message} onRetry={() => void dash.reload()} />
  if (dash.loading || !dash.data) return <LoadingRows />
  const d = dash.data
  const total = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Users" value={total(d.users)} icon={Users} />
        <StatCard
          label="Vendors pending review"
          value={d.vendors.PENDING ?? 0}
          icon={ShieldCheck}
          hint={`${d.vendors.APPROVED ?? 0} approved`}
        />
        <StatCard
          label="Products pending review"
          value={d.products.PENDING_REVIEW ?? 0}
          icon={Boxes}
          hint={`${d.products.PUBLISHED ?? 0} live`}
        />
        <StatCard
          label="Gross order value"
          value={formatCurrency(d.grossOrderValue)}
          icon={Wallet}
          hint={`${d.orders} orders`}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Needs attention">
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link className="font-semibold text-brand-700 hover:underline" href="/admin/vendors?status=PENDING">
                {d.vendors.PENDING ?? 0} vendors
              </Link>{" "}
              waiting for approval
            </li>
            <li>
              <Link
                className="font-semibold text-brand-700 hover:underline"
                href="/admin/products?status=PENDING_REVIEW"
              >
                {d.products.PENDING_REVIEW ?? 0} products
              </Link>{" "}
              waiting for review
            </li>
            <li>
              <Link className="font-semibold text-brand-700 hover:underline" href="/admin/messages">
                Contact inbox
              </Link>
            </li>
          </ul>
        </Panel>
        <Panel title="Open B2B inquiries">
          <div className="flex items-center gap-3 text-sm text-ink-600">
            <ClipboardList size={18} className="text-brand-700" />
            <span>
              <span className="font-bold text-ink-900">{d.openInquiries}</span> requirements awaiting quotes or a
              decision
            </span>
          </div>
        </Panel>
      </div>
    </div>
  )
}

/* -------------------------------- vendors -------------------------------- */

interface AdminVendor {
  id: string
  businessName: string
  vendorType: string
  status: VendorStatus
  city: string
  state: string
  gstin: string | null
  pan: string | null
  phone: string
  email: string | null
  createdAt: string
  productCount: number
  rejectionReason: string | null
}
interface VendorDetail extends AdminVendor {
  documents: {
    id: string
    name: string
    type: string
    url: string
    status: string
  }[]
  user: { email: string; name: string | null }
}

export function AdminVendors({ initialStatus }: { initialStatus?: VendorStatus }) {
  const { request } = useApi()
  const openFile = useOpenFile()
  const [status, setStatus] = useState<VendorStatus | "">(initialStatus ?? "")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const list = useResource<AdminVendor[]>("/api/admin/vendors", {
    status: status || undefined,
    q: q || undefined,
    page,
    pageSize: 10,
  })
  const [open, setOpen] = useState<string | null>(null)
  const [detail, setDetail] = useState<VendorDetail | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggle = async (id: string) => {
    if (open === id) return setOpen(null)
    setOpen(id)
    setDetail(null)
    try {
      setDetail((await request<VendorDetail>(`/api/admin/vendors/${id}`)).data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load vendor.")
    }
  }

  const decide = async (v: AdminVendor, next: "APPROVED" | "REJECTED" | "SUSPENDED") => {
    let reason: string | undefined
    if (next !== "APPROVED") {
      const input = window.prompt(`Reason for ${next.toLowerCase()} (shown to the vendor):`)
      if (input === null) return
      reason = input.trim() || undefined
      if (next === "REJECTED" && !reason) return setError("A reason is required to reject a vendor.")
    }
    setBusy(v.id)
    setError(null)
    try {
      await request(`/api/admin/vendors/${v.id}/decision`, {
        method: "POST",
        body: { status: next, ...(reason ? { reason } : {}) },
      })
      await list.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update this vendor.")
    } finally {
      setBusy(null)
    }
  }

  const rows = list.data ?? []
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Search vendors"
          placeholder="Search vendors…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          className={`${select} flex-1`}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as VendorStatus | "")
            setPage(1)
          }}
          className={select}
        >
          <option value="">All statuses</option>
          {VENDOR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </div>
      {error && <ErrorNote message={error} />}
      {list.error ? (
        <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
      ) : list.loading ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No vendors match" text="Try a different filter." />
      ) : (
        <Panel title="Vendors">
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>Business</th>
                <th className={th}>Location</th>
                <th className={th}>Products</th>
                <th className={th}>Status</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((v) => (
                <>
                  <tr key={v.id}>
                    <td className={td}>
                      <button
                        onClick={() => void toggle(v.id)}
                        className="text-left font-semibold text-brand-700 hover:underline"
                      >
                        {v.businessName}
                      </button>
                      <div className="text-xs text-ink-500">
                        {v.vendorType.toLowerCase()} · {new Date(v.createdAt).toLocaleDateString("en-IN")}
                      </div>
                    </td>
                    <td className={td}>
                      {v.city}, {v.state}
                    </td>
                    <td className={td}>{v.productCount}</td>
                    <td className={td}>
                      <StatusBadge status={v.status} />
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                        {busy === v.id && <Loader2 size={14} className="animate-spin" />}
                        {v.status !== "APPROVED" && (
                          <button
                            onClick={() => void decide(v, "APPROVED")}
                            disabled={busy === v.id}
                            className="text-success-700 hover:underline"
                          >
                            Approve
                          </button>
                        )}
                        {v.status === "PENDING" && (
                          <button
                            onClick={() => void decide(v, "REJECTED")}
                            disabled={busy === v.id}
                            className="text-danger-600 hover:underline"
                          >
                            Reject
                          </button>
                        )}
                        {v.status === "APPROVED" && (
                          <button
                            onClick={() => void decide(v, "SUSPENDED")}
                            disabled={busy === v.id}
                            className="text-danger-600 hover:underline"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {open === v.id && (
                    <tr key={`${v.id}-d`}>
                      <td colSpan={5} className="bg-ink-25 p-4 text-sm">
                        {!detail ? (
                          <LoadingRows rows={1} />
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <dl className="grid grid-cols-2 gap-2">
                              <dt className="text-ink-400">Owner</dt>
                              <dd>
                                {detail.user.name ?? "—"} ({detail.user.email})
                              </dd>
                              <dt className="text-ink-400">Phone</dt>
                              <dd>{detail.phone}</dd>
                              <dt className="text-ink-400">GSTIN</dt>
                              <dd>{detail.gstin ?? "—"}</dd>
                              <dt className="text-ink-400">PAN</dt>
                              <dd>{detail.pan ?? "—"}</dd>
                              {detail.rejectionReason && (
                                <>
                                  <dt className="text-ink-400">Reason</dt>
                                  <dd>{detail.rejectionReason}</dd>
                                </>
                              )}
                            </dl>
                            <div>
                              <div className="text-xs font-bold tracking-wide text-ink-400 uppercase">Documents</div>
                              <ul className="mt-1 flex flex-col gap-1">
                                {detail.documents.length === 0 && <li className="text-ink-500">None uploaded.</li>}
                                {detail.documents.map((d) => (
                                  <li key={d.id}>
                                    <button
                                      className="font-semibold text-brand-700 hover:underline"
                                      onClick={() =>
                                        void openFile(d.url).catch((e: unknown) =>
                                          setError(e instanceof Error ? e.message : "Could not open file")
                                        )
                                      }
                                    >
                                      {d.name}
                                    </button>{" "}
                                    <span className="text-xs text-ink-500">({label(d.type)})</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </TableWrap>
          <Pager meta={list.meta} onPage={setPage} />
        </Panel>
      )}
    </div>
  )
}

/* -------------------------------- products ------------------------------- */

interface AdminProduct {
  id: string
  slug: string
  title: string
  status: ProductStatus
  price: number
  quantity: number
  vendor: { id: string; businessName: string; status: string }
  category: { name: string }
}

export function AdminProducts({ initialStatus }: { initialStatus?: ProductStatus }) {
  const { request } = useApi()
  const [status, setStatus] = useState<ProductStatus | "">(initialStatus ?? "")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const list = useResource<AdminProduct[]>("/api/admin/products", {
    status: status || undefined,
    q: q || undefined,
    page,
    pageSize: 10,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const decide = async (p: AdminProduct, next: "PUBLISHED" | "REJECTED" | "ARCHIVED") => {
    let reason: string | undefined
    if (next === "REJECTED") {
      const input = window.prompt("Reason for rejection (shown to the vendor):")
      if (!input?.trim()) return
      reason = input.trim()
    }
    setBusy(p.id)
    setError(null)
    try {
      await request(`/api/admin/products/${p.id}/decision`, {
        method: "POST",
        body: { status: next, ...(reason ? { reason } : {}) },
      })
      await list.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update this product.")
    } finally {
      setBusy(null)
    }
  }

  const rows = list.data ?? []
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Search products"
          placeholder="Search products…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          className={`${select} flex-1`}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProductStatus | "")
            setPage(1)
          }}
          className={select}
        >
          <option value="">All statuses</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </div>
      {error && <ErrorNote message={error} />}
      {list.error ? (
        <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
      ) : list.loading ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState icon={Boxes} title="No products match" text="Try a different filter." />
      ) : (
        <Panel title="Products">
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Vendor</th>
                <th className={th}>Price</th>
                <th className={th}>Stock</th>
                <th className={th}>Status</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className={td}>
                    {p.status === "PUBLISHED" ? (
                      <Link href={`/products/${p.slug}`} className="font-semibold text-brand-700 hover:underline">
                        {p.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink-900">{p.title}</span>
                    )}
                    <div className="text-xs text-ink-500">{p.category.name}</div>
                  </td>
                  <td className={td}>{p.vendor.businessName}</td>
                  <td className={td}>{formatCurrency(p.price)}</td>
                  <td className={td}>{p.quantity}</td>
                  <td className={td}>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                      {busy === p.id && <Loader2 size={14} className="animate-spin" />}
                      {p.status === "PENDING_REVIEW" && (
                        <>
                          <button
                            onClick={() => void decide(p, "PUBLISHED")}
                            disabled={busy === p.id}
                            className="text-success-700 hover:underline"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => void decide(p, "REJECTED")}
                            disabled={busy === p.id}
                            className="text-danger-600 hover:underline"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {p.status !== "ARCHIVED" && (
                        <button
                          onClick={() => void decide(p, "ARCHIVED")}
                          disabled={busy === p.id}
                          className="text-ink-600 hover:underline"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pager meta={list.meta} onPage={setPage} />
        </Panel>
      )}
    </div>
  )
}

/* --------------------------------- users --------------------------------- */

interface AdminUser {
  id: string
  email: string
  name: string | null
  role: Role
  status: string
  createdAt: string
}

export function AdminUsers({ meId }: { meId: string }) {
  const { request } = useApi()
  const [q, setQ] = useState("")
  const [role, setRole] = useState<Role | "">("")
  const [page, setPage] = useState(1)
  const list = useResource<AdminUser[]>("/api/admin/users", {
    q: q || undefined,
    role: role || undefined,
    page,
    pageSize: 15,
  })
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      await list.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "That didn't work.")
    }
  }

  const rows = list.data ?? []
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Search users"
          placeholder="Search by name or email…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          className={`${select} flex-1`}
        />
        <select
          aria-label="Filter by role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | "")
            setPage(1)
          }}
          className={select}
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {label(r)}
            </option>
          ))}
        </select>
      </div>
      {error && <ErrorNote message={error} />}
      {list.error ? (
        <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
      ) : list.loading ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No users match" text="Try a different search." />
      ) : (
        <Panel title="Users">
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>User</th>
                <th className={th}>Role</th>
                <th className={th}>Status</th>
                <th className={th}>Joined</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className={td}>
                    <div className="font-semibold text-ink-900">{u.name ?? "—"}</div>
                    <div className="text-xs text-ink-500">{u.email}</div>
                  </td>
                  <td className={td}>
                    <select
                      aria-label={`Role for ${u.email}`}
                      value={u.role}
                      disabled={u.id === meId}
                      onChange={(e) =>
                        window.confirm(`Change ${u.email} to ${label(e.target.value)}?`) &&
                        void run(() =>
                          request(`/api/admin/users/${u.id}/role`, {
                            method: "PATCH",
                            body: { role: e.target.value },
                          })
                        )
                      }
                      className="h-9 rounded-lg border border-ink-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {label(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <StatusBadge status={u.status} />
                  </td>
                  <td className={td}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className={td}>
                    {u.id !== meId && u.status !== "DELETED" && (
                      <button
                        onClick={() =>
                          void run(() =>
                            request(`/api/admin/users/${u.id}/status`, {
                              method: "PATCH",
                              body: {
                                status: u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                              },
                            })
                          )
                        }
                        className="text-xs font-semibold text-ink-700 hover:underline"
                      >
                        {u.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pager meta={list.meta} onPage={setPage} />
        </Panel>
      )}
    </div>
  )
}

/* ---------------------------- orders / inbox / audit --------------------- */

export function AdminOrders() {
  const [page, setPage] = useState(1)
  const list = useResource<
    {
      id: string
      orderNumber: string
      channel: string
      status: string
      total: number
      placedAt: string
      items: unknown[]
    }[]
  >("/api/admin/orders", { page, pageSize: 15 })
  if (list.error) return <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
  if (list.loading) return <LoadingRows />
  const rows = list.data ?? []
  if (rows.length === 0)
    return <EmptyState icon={ClipboardList} title="No orders yet" text="Orders from all buyers appear here." />
  return (
    <Panel title="All orders">
      <TableWrap>
        <thead>
          <tr>
            <th className={th}>Order</th>
            <th className={th}>Placed</th>
            <th className={th}>Channel</th>
            <th className={th}>Lines</th>
            <th className={th}>Total</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((o) => (
            <tr key={o.id}>
              <td className={`${td} font-semibold text-ink-900`}>{o.orderNumber}</td>
              <td className={td}>{new Date(o.placedAt).toLocaleString("en-IN")}</td>
              <td className={td}>{o.channel}</td>
              <td className={td}>{o.items.length}</td>
              <td className={td}>{formatCurrency(o.total)}</td>
              <td className={td}>
                <StatusBadge status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Pager meta={list.meta} onPage={setPage} />
    </Panel>
  )
}

interface Message {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  handledAt: string | null
  createdAt: string
}

export function AdminMessages() {
  const { request } = useApi()
  const [page, setPage] = useState(1)
  const list = useResource<Message[]>("/api/admin/contact-messages", {
    page,
    pageSize: 10,
  })
  if (list.error) return <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
  if (list.loading) return <LoadingRows />
  const rows = list.data ?? []
  if (rows.length === 0)
    return <EmptyState icon={MailQuestion} title="Inbox is empty" text="Messages from the contact form show up here." />
  return (
    <Panel title="Contact messages">
      <ul className="divide-y divide-ink-100">
        {rows.map((m) => (
          <li key={m.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold text-ink-900">
                {m.name}{" "}
                <span className="font-normal text-ink-500">
                  · {m.email}
                  {m.phone ? ` · ${m.phone}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-500">
                {new Date(m.createdAt).toLocaleString("en-IN")}
                {m.handledAt ? (
                  <StatusBadge status="VERIFIED" />
                ) : (
                  <button
                    className="font-semibold text-brand-700 hover:underline"
                    onClick={() =>
                      void request(`/api/admin/contact-messages/${m.id}/handled`, { method: "POST", body: {} }).then(
                        () => list.reload()
                      )
                    }
                  >
                    Mark handled
                  </button>
                )}
              </div>
            </div>
            {m.subject && <div className="mt-1 text-sm font-semibold text-ink-800">{m.subject}</div>}
            <p className="mt-1 text-sm whitespace-pre-line text-ink-600">{m.message}</p>
          </li>
        ))}
      </ul>
      <Pager meta={list.meta} onPage={setPage} />
    </Panel>
  )
}

interface AuditRow {
  id: string
  action: string
  entityType: string
  entityId: string | null
  actorRole: string
  createdAt: string
  actor: { email: string } | null
  metadata: unknown
}

export function AdminAudit() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState("")
  const list = useResource<AuditRow[]>("/api/admin/audit-logs", {
    page,
    pageSize: 20,
    action: action || undefined,
  })
  const rows = list.data ?? []
  return (
    <div className="flex flex-col gap-4">
      <input
        aria-label="Filter by action"
        placeholder="Filter by exact action, e.g. product.decision"
        value={action}
        onChange={(e) => {
          setAction(e.target.value.trim())
          setPage(1)
        }}
        className={select}
      />
      {list.error ? (
        <ErrorNote message={list.error.message} onRetry={() => void list.reload()} />
      ) : list.loading ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No audit entries" text="Sensitive actions are recorded here." />
      ) : (
        <Panel title="Audit log">
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>When</th>
                <th className={th}>Actor</th>
                <th className={th}>Action</th>
                <th className={th}>Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>{new Date(r.createdAt).toLocaleString("en-IN")}</td>
                  <td className={td}>
                    {r.actor?.email ?? "system"}{" "}
                    <span className="text-xs text-ink-400">({r.actorRole.toLowerCase()})</span>
                  </td>
                  <td className={`${td} font-mono text-xs`}>{r.action}</td>
                  <td className={`${td} text-xs`}>
                    {r.entityType}
                    {r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <Pager meta={list.meta} onPage={setPage} />
        </Panel>
      )}
    </div>
  )
}
