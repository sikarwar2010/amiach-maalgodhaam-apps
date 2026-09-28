# MaalGodaam.com — surplus building & interior materials marketplace

A B2B + B2C marketplace for surplus, overstock and clearance building and interior materials (India).
Turborepo monorepo, Bun, Next.js 16, Hono, PostgreSQL + Prisma, Clerk, shadcn/ui, Tailwind 4, Zod.

## Repository layout

```
apps/
  web/            Next.js 16 storefront + buyer / vendor / admin portals
  api/            Hono API (auth, RBAC, catalogue, cart, orders, B2B, admin, uploads, Clerk webhook)
packages/
  db/             Prisma schema, migrations, seed, typed client   (@workspace/db)
  auth/           Roles + permission helpers shared by web and api (@workspace/auth)
  validators/     Zod schemas — the single source of input validation (@workspace/validators)
  types/          Enums, API envelope + DTO types, pricing helper  (@workspace/types)
  ui/             shadcn/ui components + the MaalGodaam brand theme (@workspace/ui)
  eslint-config/  typescript-config/
```

Deploying to production? See **[DEPLOY.md](DEPLOY.md)** (Dokploy on Hetzner or any Docker host).

## Getting started

Requirements: Bun ≥ 1.4, Node ≥ 22 (Prisma), Docker (for the local database).

```bash
bun install
docker compose up -d                      # Postgres on localhost:5433 (dev only)
cp .env.example .env                      # API + Prisma read the repo-root .env
cp apps/web/.env.example apps/web/.env.local
bun run db:deploy                         # apply migrations
bun run db:seed                           # demo categories / vendors / listings (idempotent)
bun run dev                               # web on :3000 (or next free port), API on :4100
```

Check the API: `GET http://localhost:4100/api/health`.

Without Clerk keys the public storefront works (browse, search, filter, product pages) and the sign-in pages
explain that authentication is not configured. To enable sign-in:

1. Create a Clerk application, enable **Email** and **Google**.
2. Put `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` in both env files.
3. Make yourself an admin: put your e-mail in `SUPER_ADMIN_EMAILS` (any environment, including production). You become
   `SUPER_ADMIN` the first time you use the app while signed in with a **verified** address. Other admins: a super
   admin changes their role in `/admin/users`. (Clerk **Public metadata** `{ "role": "ADMIN" }` is honoured only
   when the user's database row is first created.) The API creates the local user row on the first authenticated request; Clerk
   webhooks are not required.

## Commands

| Command                                                  | What it does                                                         |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| `bun run dev`                                            | web + api in watch mode                                              |
| `bun run typecheck` · `lint` · `test` · `build`          | across every workspace (Turborepo)                                   |
| `bun run db:generate` · `db:migrate` · `db:deploy`       | Prisma client / create a migration (dev) / apply migrations          |
| `bun run db:seed`                                        | additive demo data; refuses to run with `NODE_ENV=production`        |
| `bunx prisma validate` (in `packages/db`)                | schema check                                                         |

API tests are integration tests against a real Postgres: `apps/api/test/setup-db.ts` creates a `*_test` database
(the suite refuses any database whose name does not end in `_test`) and applies migrations with `migrate deploy`.

## Security model

- **Identity comes only from the verified Clerk session token** (`Authorization: Bearer …`), resolved to a database
  user by `clerkId`. `userId`, `vendorId`, `role`, `status` and prices in request bodies are ignored by the schemas.
- **Roles live in the database** (`BUYER`, `VENDOR`, `ADMIN`, `SUPER_ADMIN`, `STAFF`; anonymous = `PUBLIC`) and are
  enforced in the Hono middleware (`requireAuth`, `requireRole`). Roles can only be self-selected as buyer/vendor;
  admin-tier roles are granted by an admin (`canAssignRole`) or via Clerk public metadata (backend/dashboard-only).
- **Ownership (IDOR)** is part of every query (`WHERE id AND ownerId`), so another user's id is indistinguishable from a
  missing one (404). Covered by tests for products, cart, wishlist, orders, addresses, documents, inquiries and quotes.
- Vendors see only their own order lines; buyer contact details are never sent to vendors until a quote is accepted.
  Public vendor/product responses never contain GSTIN, PAN, phone or e-mail.
- Every input is validated with Zod (422 with per-field details). Errors use one envelope:
  `{ success: true, data }` / `{ success: false, error: { code, message, details? } }`.
- Uploads are identified by magic bytes (not client MIME), size-limited (5 MB), stored under server-generated keys;
  identity documents are private (owner + back-office only).
- Audit log for sensitive actions (`AuditLog`).
- CORS allow-list, secure headers, body limits and per-IP rate limits (in-memory — use a shared store if you run
  several API instances, and set `TRUST_PROXY=true` only behind a proxy that sets `X-Forwarded-For`).
- The Next.js `proxy.ts` and the portal layouts redirect people to the right place, but they are conveniences —
  the API re-authorizes every call.

## Routes

Public: `/`, `/products`, `/products/[slug]`, `/categories`, `/categories/[slug]`, `/vendors`, `/vendors/[slug]`,
`/search`, `/deals`, `/deals/[city]`, `/about`, `/contact`, `/terms`, `/privacy`, `/faq`, `/how-it-works`,
`/shipping`, `/refund`, `/careers`, `/sell-surplus`, `/post-requirement`, `/login`, `/register[/role/type]`,
`/onboarding/[role]/[type]`, `/cart`, `/checkout`, `/wishlist`, `/account` (routes you to your portal).

Portals (server-side role guard + API enforcement): `/buyer/*` (orders, requirements & quotes, addresses, profile,
notifications), `/vendor/*` (products, orders, inquiries, quotes, business profile & documents), `/admin/*`
(vendors, products, users, categories, orders, contact inbox, audit log). Each has loading and error states.

Routes from the original site keep working through permanent redirects (`next.config.ts`):
`/catalogue[/x]` → `/products` / `/categories/x`, `/product/x` → `/products/x`, `/suppliers[/x]` → `/vendors[/x]`,
and the old `/dashboard/*` paths → the new portals.

## Domain model (Prisma, `packages/db/prisma/schema.prisma`)

`User`, `BuyerProfile`, `Address`, `Vendor`, `VendorDocument`, `Category`, `SubCategory`, `Product`, `ProductImage`,
`ProductVariant`, `Inventory`, `ProductDocument`, `B2BPrice` (bulk tiers), `Wishlist(+Item)`, `Cart(+Item)`,
`Order(+Item)`, `Payment`, `B2BInquiry`, `B2BQuote`, `Notification`, `AuditLog`, `WebhookEvent`, `ContactMessage`.
Role is a database enum. Prices are per unit; an order snapshots title, price and address at purchase time.
Migrations are additive (`bun run db:deploy` never drops data).

## Notes & known limits

- **Payments:** Cash on delivery and bank transfer are recorded; online payment is deliberately disabled until a
  gateway is integrated. No card data is ever collected.
- **File storage:** local disk driver (`UPLOAD_DIR`) behind a `StorageDriver` interface — plug in S3/R2 for production.
- **Signed-in flows** (cart, checkout, portals) are covered by API integration tests with an injected identity
  provider; they need real Clerk keys to exercise end to end in a browser.
- The original site's fake ratings/response-rate figures and its localStorage "demo auth" were not carried over —
  they cannot be backed by real data or by the API's authorization.
- The template's TypeScript 7 / ESLint 10 were pinned to TypeScript 6.0 / ESLint 9.39 because `typescript-eslint` and
  `eslint-plugin-react` do not support the newer majors yet.

## Troubleshooting

- **Signed in, but dashboards bounce you back to `/login`, or the API logs `JWT cannot be used prior to not before date`:**
  your machine's clock is behind Clerk's. The API and the web proxy tolerate 60 s of drift; if yours is larger, sync the
  system clock. The web app now shows an explicit error (instead of looping) when Clerk accepts a session but the API
  does not.
- `bun apps/api/scripts/clerk-diagnose.ts` (read-only) checks that `CLERK_SECRET_KEY` works and lists (redacted) users.
