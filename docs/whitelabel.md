# Whitelabel Guide — skinning "Logo"

Loyalink ships brand-neutral. Every brand/logo slot renders the placeholder
**"Logo"** until a tenant config overrides it.

## 1. Tenant config

Copy `config/tenant.example.json` to `config/tenant.json` (or create a row in the
`tenants` table) and set:

```json
{
  "slug": "acme",
  "brandName": "ACME Rewards",
  "logoUrl": "https://.../acme-logo.svg",
  "theme": { "colors": { "primary": "#e11d48" }, "radius": "10px" }
}
```

- `brandName` — replaces the word **"Logo"** everywhere in the UI.
- `logoUrl` — replaces the placeholder logo box. Empty = show "Logo" text mark.
- `theme.colors` — injected as CSS variables (`--color-primary`, etc.).

## 2. How it works

`packages/theme` exposes `applyTheme(tenant)` which:
1. Sets `--color-*`, `--radius`, `--font` on `:root`.
2. Stores `brandName` / `logoUrl` in a React context (`useTenant()`).

The `<BrandMark/>` component shows `logoUrl` if present, otherwise the
`brandName` text (default `"Logo"`).

## 3. Source of truth

- **Build-time / static**: `config/tenant.json` bundled with the app.
- **Runtime / DB-driven**: the active tenant row from `tenants` (selected by
  `VITE_TENANT_SLUG`), letting admins re-theme without a rebuild.

The admin back-office "Branding" screen edits the DB tenant row.

## 4. Per-tenant data isolation

Every domain table carries `tenant_id` and is protected by RLS, so multiple
brands can share one deployment without seeing each other's members or points.
