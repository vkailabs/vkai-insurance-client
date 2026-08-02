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

## Scope boundaries

- **No real payments.** Premium payment is simulated end-to-end.
- **No policy authoring on the client.** Customers enroll in provider-defined catalog
  policies only.
- **No provider knowledge here.** This repo never contacts or reasons about the Azure side
  directly — only its own client API does.
- **Demonstration project.** The goal is to showcase the dual-cloud, no-shared-database
  architecture and the full customer journey, not to be a production insurance system.
