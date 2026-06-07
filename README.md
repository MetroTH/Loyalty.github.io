# Loyalink

**Whitelabel loyalty platform** — a web app (LINE OA / browser) that lets any brand run
points, tiers, rewards, missions and campaigns, and connect to external platforms
(POS, CRM/ERP, LINE OA, payment, e‑commerce) through **webhooks and a REST API**.

> Whitelabel first: there is **no hardcoded brand**. Every logo / brand name slot
> renders the placeholder **"Logo"** until a tenant supplies its own theme.

## Architecture (5 layers)

| Layer | What | Tech |
|---|---|---|
| Frontend | Member web app + Admin back‑office | Vite + React + TS + Tailwind |
| Backend API | Auth, point engine, campaigns, notifications, analytics | Supabase Edge Functions (REST + Webhook) |
| Integration | Webhook in/out, partner REST API, API keys, rate limit, event queue | Supabase Edge Functions |
| External (pluggable) | POS, CRM/ERP, LINE OA, payment, e‑commerce | adapters (mock in MVP) |
| Data | Users/points, assets | Supabase Postgres + Storage |

See [`docs/architecture.md`](docs/architecture.md) for the full diagram and flows.

## Monorepo layout

```
apps/web      Member web app (LINE OA / browser)
apps/admin    Back-office portal (admin)
packages/sdk  Supabase client + shared types
packages/theme Whitelabel theming (config -> CSS variables)
supabase/     Postgres migrations + Edge Functions
config/       tenant.example.json (Logo / theme)
docs/         architecture, features, whitelabel, integration
```

## Quick start

```bash
pnpm install
cp .env.example .env          # fill VITE_SUPABASE_URL + anon key
pnpm dev                      # runs web + admin
```

- Member app: http://localhost:5173
- Admin app:  http://localhost:5174

### Backend (Supabase)

Migrations live in `supabase/migrations`. Apply with the Supabase CLI
(`supabase db push`) or via the dashboard. Edge Functions live in
`supabase/functions` (deploy with `supabase functions deploy <name>`).

## Documentation

- [Features](docs/features.md)
- [Architecture](docs/architecture.md)
- [Whitelabel guide](docs/whitelabel.md) — how to skin "Logo" with a real brand
- [Integration guide](docs/integration.md) — webhooks + partner REST API

## Status

MVP in progress. Out of MVP scope (next phase): Redis cache, analytics warehouse,
SFTP sync, real LINE/payment/Shopee‑Lazada connectors (mocked for now), full
multi-tenant management UI.
