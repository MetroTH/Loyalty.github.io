# CLAUDE.md — Loyalink

Guidance for Claude when working in this repo. Loyalink is a **whitelabel loyalty
platform**: a member web app + admin back-office, backed by Supabase, deployed to
GitHub Pages. Brand-neutral by default — every logo/brand slot shows the
placeholder **"Logo"** until a tenant is themed.

## Stack & layout

- **Monorepo** (pnpm workspace). Node ≥ 20, pnpm 9 (`packageManager` field).
- `apps/web` — Member app (Vite + React + TS). Tabs: Home, Rewards, Missions, News, Profile.
- `apps/admin` — Back-office (Vite + React + TS). Pages: Overview, Members, Rewards, Missions, Campaigns, News, API Keys, Branding.
- `packages/sdk` — Supabase client + types + data helpers + `uploadImage` + mission/team RPC wrappers. Source-only; consumed via Vite alias `@loyalink/sdk`.
- `packages/theme` — `TenantProvider`, `useTenant`, `applyTheme`, `BrandMark`. Alias `@loyalink/theme`.
- `supabase/migrations` — SQL migrations (source of truth). `supabase/functions` — Edge Functions.
- Plain CSS with CSS variables (no Tailwind). Theme vars injected at runtime by `applyTheme`.

## Backend (Supabase)

- Project ref: **`kmakycjxgxjljwjfsair`** (region ap-northeast-1). Manage via the Supabase MCP tools.
- URL: `https://kmakycjxgxjljwjfsair.supabase.co` · publishable key `sb_publishable_P4LWpWTTA3B6-63xvIjWog_XSYBYVw0` (public).
- Auth: **email OTP** (6-digit). Email template uses `{{ .Token }}`. Custom SMTP = Resend.
  Supabase Auth URL config Site URL/Redirect must include the Pages URL.
- **RLS everywhere.** Members see only their own rows; admins (rows in `admins`) see their tenant.
- Privileged SQL is in `SECURITY DEFINER` RPCs. Two access patterns:
  - **service_role only** (called by Edge Functions): `earn_points`, `find_or_create_member`, `redeem_reward`, `incr_rate`. EXECUTE revoked from anon/authenticated.
  - **authenticated, auth.uid()-scoped** (called directly from the app): `mission_checkin`, `mission_answer_quiz`, `mission_spin`, `team_create/join/contribute`.
- After DDL, run `get_advisors` (security) and fix findings.

### Key tables
`tenants` (brand_name default 'Logo', theme jsonb), `admins`, `members`
(+ company/address/pdpa_consent), `tiers`, `points_ledger` (append-only; trigger
updates balance + tier), `earn_rules`, `rewards` (image_url), `redemptions`
(reward_title snapshot), `campaigns`, `missions` (type + goal jsonb),
`mission_progress`, `teams` + `team_members`, `api_keys`, `webhook_endpoints`,
`events`, `api_rate_counters`, `audit_log`. Storage: public bucket `assets`.

### Edge Functions
`webhook-inbound` (HMAC, POS purchase → earn), `redeem` (JWT, burn → voucher/QR),
`partner-api` (API key + rate limit), `points-engine`, `webhook-dispatch`
(service-role). Deploy via Supabase MCP `deploy_edge_function`.

## Missions / gamification (config-driven via `missions.type` + `goal` jsonb)

- `checkin` — daily streak, goal `{days}`. `basic` — info only.
- `stamp` — goal `{count}`, advanced automatically inside `earn_points` on purchase.
- `quiz` — goal `{question, options[], answer}`.
- `spin` — goal `{prizes:[{label,points,weight}]}`, weighted, once/day.
- `team` — goal `{count}`; `teams`/`team_members`; progress from purchases (earn_points)
  or `team_contribute`; on completion all members rewarded once (`rewarded` flag).
- Adding a new type: add RPC (if needed) + `goal` shape, render in `apps/web/src/pages/Missions.tsx`, configure in `apps/admin/src/pages/Missions.tsx`.

## Deploy

- Branch: develop on **`claude/laughing-curie-api9k`**; keep **`main`** in sync (push to both).
- GitHub Actions `.github/workflows/deploy.yml` builds both apps → GitHub Pages.
  Member at site root, admin at `/admin/`. Base path = `/<repo>/` via `VITE_BASE`.
- **Default branch is `claude/laughing-curie-api9k`** (repo's first pushed branch); the
  `github-pages` environment only allows deploys from the default branch, so trigger
  `run_workflow` on that ref (or set main as default branch to deploy from main).
- Repo **Actions Variables** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` feed the build.
- Live URLs: `https://metroth.github.io/Loyalty.github.io/` and `/admin/`.

## Local dev

```bash
pnpm install
cp .env.example .env
pnpm dev          # web :5173, admin :5174
pnpm -r build     # typecheck + build both (run before pushing)
```

## Conventions

- Match existing plain-CSS + CSS-variable styling; reuse `friendlyError()` (sdk) for
  user-facing DB errors (unique/FK). Bound any user-supplied image with object-fit
  (logos via `BrandMark`, reward images at fixed display size).
- Verify DB logic with a temp member inside a `DO $$ ... RAISE EXCEPTION ... $$` block
  (auto-rollback) so tests leave no data behind.

## Status (current)

MVP + Polish #1 + Gamification all live. Theme = yellow/white/black.
Out of scope / next phase: SMS-OTP (Twilio), real LINE OA / Payment / Shopee
connectors, analytics warehouse, Redis cache, full multi-tenant management UI.
See `docs/` and `/root/.claude/plans/feature-silly-pancake.md` for detail.
