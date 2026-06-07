# Loyalink — Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Web App — LINE OA / Browser)                       │
│  Registration/Login · Point & Tier · Reward · Missions/News  │
│  · Logo theme (whitelabel)                                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / JWT
┌───────────────────────────▼─────────────────────────────────┐
│ Backend API (Supabase Edge Functions — REST + Webhook)       │
│  Auth/User · Point Engine (earn/burn) · Campaign (QR/voucher)│
│  · Notification · Analytics                                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ Integration Layer (API Gateway + Webhook Hub)                │
│  Webhook in/out · Partner REST API · Event queue (async)     │
│  · API key mgmt · Rate limiter                                │
└───────────────────────────┬─────────────────────────────────┘
                            │ adapters (mock in MVP)
┌───────────────────────────▼─────────────────────────────────┐
│ External platforms (pluggable)                               │
│  CRM/ERP · LINE OA · Payment · E-commerce · POS              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ Data Layer — Supabase Postgres (users/points) · Storage      │
│  (assets).  [next phase: Redis cache · Analytics warehouse]  │
└──────────────────────────────────────────────────────────────┘
   Back-office portal (admin) ──► Backend API + Data Layer
```

## Key flows

### Earn points (inbound webhook)
1. External POS posts a purchase event to `webhook-inbound` (HMAC-signed).
2. Function verifies signature, writes a row to `events`.
3. `points-engine` evaluates `earn_rules` → inserts `points_ledger` (earn) →
   `members.points_balance` is updated by trigger → tier re-evaluated.
4. `webhook-dispatch` notifies subscribed outbound endpoints.

### Burn points (redemption)
1. Member calls `redeem` with a reward id (JWT auth).
2. Function checks balance + stock, inserts `points_ledger` (burn) and a
   `redemptions` row with a generated voucher/QR code.

### Partner API
1. Partner calls `partner-api` with an API key.
2. Function hashes + looks up `api_keys`, enforces scope + rate limit, then serves
   the requested resource.

## Tech choices

- **Supabase**: Postgres 17, Auth (OTP/JWT), Edge Functions (Deno), Storage.
- **Frontend**: Vite + React + TypeScript + Tailwind, deployable to GitHub Pages.
- **Whitelabel**: tenant config → CSS variables injected at runtime.
