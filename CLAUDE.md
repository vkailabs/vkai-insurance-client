# CLAUDE.md — project context for `vkai-insurance-client`

Context for Claude Code sessions working in this repo. Read this before making changes.

## What this repo is

The **customer-facing React frontend** of VK AI Labs Insurance. It talks to its own backend
(`vkai-insurance-client-api`) over HTTP and uses Firebase Authentication. For the full product
story see [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md); for setup and routes see
[README.md](README.md).

Tech: React 18 + Vite, React Router 6, Firebase Auth (Web SDK), a plain `fetch` API client
(`src/api/client.js`), and plain CSS (`src/styles.css`).

## Keeping documentation current

**If a change is significant, update the docs in the same commit** — not as a separate
afterthought. A change counts as significant if it introduces a new field, a new business
rule, a new architectural decision, a new piece of infrastructure/pipeline, or a newly
discovered gotcha. In those cases, update this repo's own
[BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md) and/or [README.md](README.md) (and this
file, when the change affects conventions or gotchas) as part of the same commit that makes
the change.

Minor or purely cosmetic changes don't need a doc update.

## Naming conventions

- **CSS class names:** `kebab-case` (e.g. `policy-card`, `navbar-inner`, `claim-badge`).
- **JavaScript:** `camelCase` for variables, functions, and props.
- **Frontend env vars:** prefixed `VITE_VKAI_INSURANCE_CLIENT_API_*` (Vite requires the
  `VITE_` prefix to expose a var to client code). The API base URL is
  `VITE_VKAI_INSURANCE_CLIENT_API_BASE_URL`; Firebase vars are `VITE_FIREBASE_*`.
  See [.env.example](.env.example). Real values live in `.env` (gitignored) — never commit them.

## ⚠️ Critical gotcha: API responses are camelCase

The `vkai-insurance-client-api` backend uses **Prisma**, and its JSON responses come back in
**camelCase** — even though the underlying Postgres columns are snake_case. When reading API
data, **never assume snake_case**. Use:

- `premiumAmount`, `coverageAmount`, `isActive`, `lastSyncedAt` (catalog)
- `enrolledAt`, `expiryDate`, `policyCatalog` (nested), `premiums`, `claims` (policies)
- `amountClaimed`, `submittedAt`, `paidAt` (claims / premiums)

Also note: **Prisma `Decimal` values are serialized as strings** (e.g. `"100.00"`), so run
money values through `Number(...)` / the helpers in `src/lib/format.js` before formatting.

Catalog rows and policy objects also carry a provider-defined `key` (e.g. `"PG2"`, or a
collision-suffixed `"PG2-2"`, and may be `null`). It is **display-only** and **read-through
from the provider** — the client must **never generate or fabricate** it. It's a direct field
on each catalog row (`GET /v1/catalog`) and a **top-level** field on each policy object
(`GET /v1/policies`, already resolved from the catalog — prefer the top-level `key`). The UI
renders it as a name prefix (e.g. `PG2 - Premium Gold 2024`) on the catalog page, on the
policy card heading on the dashboard, and on the main heading of the single policy detail page
(`/policies/:id`, preferring top-level `policy.key`, falling back to `policyCatalog.key`); use
`formatPlanName(key, name)` in `src/lib/format.js`,
which drops the prefix and separator entirely when `key` is null/absent/blank. Nested premium
and claim line items are never individually prefixed.

The one place snake_case *is* correct is **request bodies you send** to the API
(`policy_catalog_id`, `policy_id`, `amount_claimed`, `extend_months`). Responses = camelCase;
request payloads = snake_case. See `src/api/client.js` for the canonical mapping.

Responses are also wrapped in a `{ data: ... }` envelope; the API client unwraps it and
returns `data`.

## Git workflow

- **Always work on the `dev` branch. Never commit directly to `main`.**
- Commit and **push to `dev` only**. **Never open or merge a pull request** — the human
  handles all PR review and merges. (Confirm the branch with `git branch` before committing;
  pull latest if needed.)

## Deployment (Vercel) — don't break SPA routing

This repo deploys to **Vercel**. [`vercel.json`](vercel.json) contains a rewrite that serves
`index.html` for any non-asset path:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**Do not remove or weaken this rewrite.** Without it, direct navigation to (or a refresh of)
any client-side route — `/dashboard`, `/catalog`, `/policies/:id` — returns a 404 from Vercel,
because only `index.html` exists as a real static file; the routes live inside the JS bundle.

## Auth — Firebase, and a previously-fixed race condition

Auth is **Firebase Authentication (Email/Password)**, wrapped by `src/context/AuthContext.jsx`.
The ID token is attached as `Authorization: Bearer <token>` on every API call, and a `401`
from the API redirects to `/login`.

**If you touch `AuthContext` or `ProtectedRoute`, preserve the loading-flag pattern.** There
was a race condition where the app redirected to `/login` on refresh before Firebase's
`onAuthStateChanged` had resolved the session. The fix: `AuthContext` exposes a `loading`
flag (default `true`, set `false` only after the first `onAuthStateChanged` fires). Routing
decisions must check `loading` **before** acting on whether a user exists:

- while `loading` is `true` → render a spinner, **make no redirect decision**;
- only once `loading` is `false` **and** there is no user → redirect to `/login`.

Never redirect based solely on "is there a user right now" — that's what reintroduces the bug.

## Responsive nav bar — preserve the mobile layout

`src/components/NavBar.jsx` + its styles in `src/styles.css` already handle mobile. Below the
`768px` breakpoint the nav switches to a **stacked layout** (brand + links on one row, user +
Logout on the next) so content never overflows or overlaps the page below; at `>=768px` it
stays a single horizontal row. **When editing NavBar-related code, keep this responsive
behavior intact** and don't regress the desktop layout.

## Related repos in this ecosystem

- **`vkai-insurance-client-api`** — this repo's **own backend** (GCP). This frontend only
  ever calls this API.
- **`vkai-insurance-provider`** and **`vkai-insurance-provider-api`** — the **fully
  independent provider side (Azure)**. This repo has **no knowledge of them** and never calls
  them directly (the client API talks to the provider). **Do not assume knowledge of, or make
  changes to, the provider repos from here.** The two clouds share no database — only HTTPS
  sync. See [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md) for the architecture.
