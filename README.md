# vkai-insurance-client

VK AI Labs — **client portal** (React + Vite): sign up, browse the policy catalog,
enroll, pay premiums, file and track claims.

This is the customer-facing frontend for the Insurance module. It talks to the
separate **client API** (`vkai-insurance-client-api`) over HTTP and uses **Firebase
Authentication** for login/signup. It has no knowledge of the provider (Azure) side —
all provider interaction happens through the client API.

It's one half of a dual-cloud demo platform: this repo and its API run on **GCP**, while
a fully independent **provider side runs on Azure**. The two clouds never share a database;
they only exchange data over HTTPS. For the full story — what this project is and why it
exists — see [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md). For conventions and
gotchas when working in this repo, see [CLAUDE.md](CLAUDE.md).

## Tech stack

- **React 18 + Vite** — SPA, fast dev server / HMR
- **React Router 6** — client-side routing with protected routes
- **Firebase Authentication (Web SDK)** — email/password auth; the Firebase ID token
  is attached as `Authorization: Bearer <token>` on every API call
- **Plain fetch API client** — a single `src/api/client.js` module (no React Query/SWR;
  the data needs are simple enough that a thin fetch wrapper keeps things clearest)
- **Plain CSS** — one `src/styles.css`, kebab-case class names, light SaaS look

## Prerequisites

- Node.js 18+ and npm
- The client API (`vkai-insurance-client-api`) running locally — by default on
  `http://localhost:4000` (see that repo's README; `docker compose up --build`)
- A Firebase project with **Email/Password** sign-in enabled, and its Web app config

## Setup

```bash
npm install
```

Copy the env template and fill in your Firebase Web app config:

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `VITE_VKAI_INSURANCE_CLIENT_API_BASE_URL` | Base URL of the client API (default `http://localhost:4000`) |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain (`<project>.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project id |
| `VITE_FIREBASE_APP_ID` | Firebase Web app id |

> The Firebase **client** config is public by design, but real values still stay out of
> git — only `.env.example` is committed; `.env` is gitignored.
>
> The client API verifies the same Firebase project's JWTs using the Firebase **Admin**
> SDK, so the frontend's `VITE_FIREBASE_PROJECT_ID` must match the API's
> `VKAI_INSURANCE_CLIENT_API_FIREBASE_PROJECT_ID`.

## Run

```bash
npm run dev
```

Vite serves the app on `http://localhost:5173`. Other scripts:

```bash
npm run build      # production build to dist/
npm run preview    # preview the production build
```

## Routes / pages

| Route | Access | What it does |
| --- | --- | --- |
| `/signup` | public | Firebase email/password signup, then redirect to `/dashboard` |
| `/login` | public | Firebase email/password login, then redirect to `/dashboard` |
| `/dashboard` | protected | Lists the user's policies (`GET /v1/policies?include=premiums,claims`) as cards, each with status, expiry, nested premium + claim history, and a **Renew** button when the policy expires within 30 days. Empty state links to the catalog. |
| `/catalog` | protected | Lists available policies (`GET /v1/catalog`); each card has an **Enroll** button (`POST /v1/policies`) that redirects to the dashboard with a success message. |
| `/policies/:id` | protected | Full policy detail with premium and claim history. **Pay premium** (`POST /v1/premiums`) and **File a claim** (`POST /v1/claims`) show only when the policy is `active`; **Renew** (`POST /v1/policies/:id/renew`) shows when the policy expires within 30 days. |

Protected routes redirect to `/login` when there is no authenticated user. A `401`
from the API (expired/invalid token) also redirects to `/login`.

## How it fits together

- **Auth** (`src/context/AuthContext.jsx`) wraps the Firebase Auth SDK and exposes
  `signup`, `login`, `logout`, and the current `user`. On signup no explicit
  user-creation call is made — the client API's `firebaseAuth` middleware upserts the
  local `users` row on the first authenticated request.
- **API client** (`src/api/client.js`) reads the base URL from the env var, attaches
  the current Firebase ID token on every request, unwraps the API's `{ data }` envelope,
  and redirects to `/login` on `401`. It exposes: `getCatalog()`, `getPolicies()`,
  `getPolicy(id)`, `enrollInPolicy(catalogId)`, `payPremium(policyId, amount)`,
  `fileClaim(policyId, amount, description)`, `renewPolicy(policyId)`.

  > Note: the API has no single-policy `GET` route, so `getPolicy(id)` fetches the
  > policy list (with nested premiums/claims) and selects the matching policy.

- **Components** (`src/components/`): `NavBar`, `PolicyCard` (reused on dashboard and
  catalog via a `variant` prop), `ClaimStatusBadge` (color-codes
  Submitted / Under Review / Approved / Rejected / Paid), `Spinner`, `ErrorMessage`,
  and `ProtectedRoute`.

## Project layout

```
src/
  main.jsx              App entry: Router + AuthProvider
  App.jsx               Route definitions + authenticated layout
  firebase.js           Firebase app + auth initialization
  api/client.js         Fetch-based API client (token, 401 handling, endpoints)
  context/AuthContext.jsx
  lib/format.js         Currency/date helpers, "expiring soon" check
  components/           NavBar, PolicyCard, ClaimStatusBadge, Spinner, ErrorMessage, ProtectedRoute
  pages/                Login, Signup, Dashboard, Catalog, PolicyDetail
  styles.css            App styles (kebab-case classes)
```

## Deployment

Deployed to **Vercel**. Because this is a client-side-routed SPA, the repo root includes a
[`vercel.json`](vercel.json) rewrite that serves `index.html` for any non-asset path — without
it, directly navigating to or refreshing a route like `/dashboard` or `/policies/:id` would
404. **Don't remove that rewrite.** Build command is `npm run build` (output in `dist/`).

## Notes / scope

- Premium payment is **virtual/simulated** — it matches what the API does; there is no
  real payment gateway.
- The provider portal is a separate app (Azure) and is not part of this repo.
