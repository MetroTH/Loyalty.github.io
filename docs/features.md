# Loyalink — Feature Summary (Whitelabel)

> All brand/logo slots default to the placeholder **"Logo"**. A tenant config
> (`config/tenant.json`) replaces it with a real brand, logo, colors, and theme.

## 1. Frontend — Member Web App (LINE OA / Browser)

| Feature | Detail |
|---|---|
| Registration / Login | OTP (phone/email) + JWT session via Supabase Auth |
| Point & Member Tier | Balance, earn/burn history, tier progress |
| Reward Redemption | Redeem catalog item → QR / voucher code |
| Missions / News | Point-earning missions + promotions/news feed |
| Logo / Theme | Logo + color theme + brand name from tenant config |

## 2. Backend API (Edge Functions / REST + Webhook)

| Feature | Detail |
|---|---|
| Auth & User Mgmt | OTP/JWT + Row Level Security |
| Point Engine | Rule-based earn/burn (`earn_rules`) |
| Campaign Mgmt | Campaigns + QR/voucher issuance |
| Notification | Push / SMS / Email via pluggable adapters (mock in MVP) |
| Analytics / Report | Member / points / redemption summaries |

## 3. Integration Layer (API Gateway + Webhook Hub)

| Feature | Detail |
|---|---|
| Webhook inbound/outbound | Receive external events (POS purchase → earn) + dispatch events |
| REST Partner API | Endpoints for partners (`partner-api`) |
| Event queue / async | `events` table processed asynchronously |
| Auth token / API key mgmt | Issue/revoke API keys per partner (`api_keys`) |
| Rate limiter | Per-key request limits |

## 4. Admin Back-office Portal

Manage members, campaigns, reward catalog, missions/news, whitelabel
(Logo/theme) settings, API keys, and view reports.

## 5. Data Layer

Supabase Postgres (users/points) + Storage (logo/assets).
Redis cache & analytics warehouse are deferred to a later phase.

## Multi-tenant note

Schema carries `tenant_id` everywhere so multi-tenant is possible, but the MVP
defaults to a single active tenant resolved by `slug`.
