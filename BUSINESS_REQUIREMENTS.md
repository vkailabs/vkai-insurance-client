# Business Requirements — VK AI Labs Insurance (Client Portal)

## What this repo is

`vkai-insurance-client` is the **customer-facing web frontend** of *VK AI Labs Insurance* —
a personal portfolio project that demonstrates a realistic, **dual-cloud insurance platform**.
It is the app a customer actually uses: they sign up, browse a catalog of insurance policies,
enroll in the ones they want, pay their premiums, and file and track claims.

This is a demonstration project, not a commercial product. Its purpose is to show how a
complete insurance workflow can be built across two independent cloud providers that
cooperate without ever trusting each other's databases.

## Why it exists — the dual-cloud story

The platform is deliberately split into two fully independent halves that run on **different
clouds**:

- **Client side (GCP)** — this repo (`vkai-insurance-client`) and its backend
  (`vkai-insurance-client-api`). This is the customer's world: accounts, enrollments,
  premium payments, and claims.
- **Provider side (Azure)** — a separate app and API (`vkai-insurance-provider` /
  `vkai-insurance-provider-api`). This is the insurer's world: it defines the products on
  offer and adjudicates claims.

The two sides **never share a database**. There is no common datastore, no cross-cloud SQL,
no shared schema. They communicate **only over HTTPS API calls**, syncing state back and
forth. The client side owns its own copy of the data that matters to customers; the provider
side owns its own copy of the data that matters to the insurer. When something changes on one
side that the other needs to know about, it is pushed over the wire and reconciled — not read
directly out of a shared table.

This separation is the whole point of the demo: it mirrors how two organizations (or two
business units) with separate infrastructure and separate trust boundaries can still deliver
one coherent product to the end user.

### A key architectural decision: the catalog is provider-defined

The **policy catalog is owned by the provider (Azure) side**, not created by the client.
Customers can only enroll in policies the provider has published. The client side keeps a
**cached, read-only-from-its-POV copy** of that catalog (refreshed from the provider through
the client API), and enrollment always references a provider-defined catalog entry rather
than inventing a policy on the fly.

Practically, this means:

- Customers **choose from** a catalog; they never **define** a policy.
- Premium and coverage amounts, policy names, and descriptions originate on the provider side.
- The client experience is "shop the shelf and enroll," not "design your own insurance."

#### Plan `key` prefix (display-only, provider-owned)

Each catalog entry carries a provider-defined `key` (e.g. `PG2`, or a collision-suffixed
`PG2-2`). It originates on the provider side, syncs to the client side, and the client API
exposes it. The **client never generates or fabricates a key** — it only displays what the
API returns (a read-through of provider data).

Where it shows:

- **Catalog page** — each plan renders its `key` as a prefix on the plan name, e.g.
  `PG2 - Premium Gold 2024`. Read from the `key` field on each catalog row.
- **Dashboard / "Your policies"** — each enrolled policy renders its plan's `key` as a prefix
  on the **policy card heading only**. Read from the **top-level `key`** on each policy object
  (already resolved from the catalog by the API). Nested premium and claim line items under a
  policy card are **not** individually prefixed.
- **Policy detail page** (`/policies/:id`) — the single policy's plan name renders its `key`
  as a prefix on the **main page heading only**. Read from the **top-level `key`** on the
  policy object, falling back to the nested `policyCatalog.key`. Nested premium and claim line
  items on this page are **not** individually prefixed.

When `key` is `null`/absent/blank (e.g. a catalog entry not yet refreshed), the name is shown
with **no prefix and no stray separator**.

## Where this repo sits (and what it deliberately doesn't know)

This repo talks to exactly **one thing**: its own backend, `vkai-insurance-client-api`. It has
**no knowledge of the provider side at all** — no provider URLs, no provider credentials, no
assumptions about Azure. Anything that ultimately needs the provider (publishing the catalog,
moving a claim through review, confirming a status) is the client API's job: *this frontend
calls the client API, and the client API talks to the provider API.*

Keeping the frontend ignorant of the provider is intentional. It keeps the trust boundary
clean and means the customer-facing app only ever depends on a single, stable contract.

## Core user journeys

1. **Sign up / log in** — A customer creates an account or signs in with email and password
   (Firebase Authentication). Their identity token is attached to every request to the client
   API, which creates the local customer record on first authenticated use.

2. **Browse the catalog** — The customer views the available policies (name, description,
   premium amount, coverage amount) — the provider-defined products described above.

3. **Enroll in a policy** — The customer enrolls in a catalog policy. A new policy is created
   on the client side (starting as `pending`) and synced outbound to the provider.

4. **Pay a premium** — For an active policy, the customer records a premium payment. This is
   **virtual/simulated** — there is no real payment gateway and no real money moves; it
   mirrors exactly what the API models, which is enough to demonstrate the workflow.

5. **File a claim** — For an active policy, the customer files a claim with an amount and a
   description. The claim is created on the client side and synced to the provider for
   adjudication.

6. **Track a claim's status** — A claim moves through a lifecycle the customer can watch:

   ```
   Submitted → Under Review → Approved / Rejected → Paid
   ```

   The provider drives these transitions (that's its job — adjudication), and the resulting
   status is synced back to the client side and shown to the customer, color-coded for clarity.

7. **Renew near expiry** — When a policy is close to its expiry date (within 30 days), the
   customer is offered a **Renew** action that extends the term.

8. **Cancel a pending policy** — While a policy is still **pending** (enrolled but not yet
   approved by the provider), the customer can **cancel** it from the dashboard before it
   becomes active. Cancelling requires an explicit confirmation, then calls
   `POST /v1/policies/:id/cancel` on the client API. The API only permits this while the policy
   is `pending` (it returns `409` otherwise); on success the policy moves to the terminal
   status **`cancelled`**. Only pending policies offer a Cancel action — active or any other
   status never does. Once cancelled, the policy is **hidden from the dashboard entirely**
   (see "Dashboard policy sections" below).

## Dashboard heading count

The top-of-page heading reads **"Your Policies (N)"** (exact capitalization, a
single space before the parenthesis, e.g. `Your Policies (3)`). **N is the count
of *visible* policies** — every loaded policy whose `status` (lowercased) is **not**
`cancelled` (i.e. active + pending + expired), which is exactly what the two
dashboard sections render. It is **derived entirely client-side** from the
already-loaded policy data (`GET /v1/policies`) — no extra API call — reusing the
same case-insensitive `status` matching as the summary counts and section filters.

**Cancelled policies are excluded** from N, consistent with VKAI-010: cancelled
policies are hidden from both dashboard sections and both summary counts, so the
heading count stays consistent with what the customer actually sees. The heading
renders **unconditionally** (outside the `policies.length > 0` guard), so a customer
with **zero** policies sees exactly **"Your Policies (0)"**. Because N is derived
from `policies` state (which is refetched after renew/cancel), the count updates
correctly after those actions.

## Dashboard policy summary

Above the "Your policies" list, the dashboard shows two always-visible summary
boxes: a count of the customer's **Active** policies and a count of their
**Pending** policies. These counts are **derived entirely client-side** from the
policy data the dashboard already loads (`GET /v1/policies`) — there is no extra
API call and no new endpoint. Counting matches on the policy `status` value
compared case-insensitively (status arrives lowercase, e.g. `active`/`pending`,
even though the status pill displays it capitalized). Both boxes always render:
when a status has no policies, its box shows `0` rather than being hidden.

## Dashboard policy sections (Active vs Pending)

Below the summary boxes, the customer's enrolled policies are shown in **two
separate sections**, each under its own always-visible heading:

1. **"Your Active Policies"** (first section)
2. **"Your Pending Policies"** (second section)

The split is **derived entirely client-side** from the already-loaded policy data
(`GET /v1/policies`) — no extra API call, no new endpoint — using the same
case-insensitive `status` matching as the summary counts (status arrives
lowercase):

- **"Your Pending Policies"** = policies whose `status` (lowercased) is `pending`.
- **"Your Active Policies"** = **every non-pending, non-cancelled policy** —
  `active` plus any other non-terminal status (e.g. expired).

**Cancelled policies are hidden entirely.** A policy whose `status` (lowercased)
is `cancelled` is **excluded from BOTH sections and from BOTH summary counts**
(the counts already only match `active`/`pending`, so cancelled never inflates
them). This is the deliberate product decision for the customer-initiated
cancel flow: once a customer cancels a pending policy, it disappears from the
dashboard and the Pending count drops by one. (The provider-facing terminal
statuses are `pending | active | expired | cancelled`, arriving lowercase from
the API.)

Both section headings **always render**, even when a bucket is empty. An empty
bucket shows a short message ("No active policies." / "No pending policies.")
instead of a policy grid. This two-section layout only applies when the customer
has at least one policy; when they have **no policies at all**, the existing
whole-page empty state ("No policies yet / Browse the catalog") takes precedence
and is shown instead of the two sections. Note that a customer whose only
policies are all `cancelled` will see both sections render their empty messages
(rather than the whole-page empty state, which is reserved for a truly empty
policy list) — this is acceptable.

## Scope boundaries

- **No real payments.** Premium payment is simulated end-to-end.
- **No policy authoring on the client.** Customers enroll in provider-defined catalog
  policies only.
- **No provider knowledge here.** This repo never contacts or reasons about the Azure side
  directly — only its own client API does.
- **Demonstration project.** The goal is to showcase the dual-cloud, no-shared-database
  architecture and the full customer journey, not to be a production insurance system.
