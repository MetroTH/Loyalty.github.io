-- Loyalink — initial schema (whitelabel loyalty platform)
-- Postgres 17 / Supabase. All domain tables carry tenant_id and are RLS-protected.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Tenants (whitelabel). brand_name defaults to 'Logo'.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  brand_name  text not null default 'Logo',
  logo_url    text,
  theme       jsonb not null default '{}'::jsonb,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Admin users (back-office) mapped to an auth user + tenant.
create table if not exists public.admins (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  role       text not null default 'admin' check (role in ('admin','owner','staff')),
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- ─────────────────────────────────────────────────────────────
-- Tiers
-- ─────────────────────────────────────────────────────────────
create table if not exists public.tiers (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null,
  min_points  integer not null default 0,
  benefits    jsonb not null default '[]'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists tiers_tenant_idx on public.tiers(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- Members
-- ─────────────────────────────────────────────────────────────
create table if not exists public.members (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  phone           text,
  email           text,
  full_name       text,
  points_balance  integer not null default 0,
  lifetime_points integer not null default 0,
  tier_id         uuid references public.tiers(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (tenant_id, phone)
);
create index if not exists members_tenant_idx on public.members(tenant_id);
create index if not exists members_user_idx on public.members(user_id);

-- ─────────────────────────────────────────────────────────────
-- Earn rules (rule-based point engine)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.earn_rules (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  name          text not null,
  event_type    text not null default 'purchase',
  points_per_unit numeric not null default 1,   -- points per currency unit
  unit          text not null default 'currency',
  conditions    jsonb not null default '{}'::jsonb,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists earn_rules_tenant_idx on public.earn_rules(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- Points ledger (append-only). delta>0 earn, delta<0 burn.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.points_ledger (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  delta       integer not null,
  kind        text not null check (kind in ('earn','burn','adjust','expire')),
  reason      text,
  reference   text,
  created_at  timestamptz not null default now()
);
create index if not exists ledger_member_idx on public.points_ledger(member_id);
create index if not exists ledger_tenant_idx on public.points_ledger(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- Rewards + redemptions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.rewards (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  title       text not null,
  description text,
  image_url   text,
  cost_points integer not null check (cost_points >= 0),
  stock       integer,                 -- null = unlimited
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists rewards_tenant_idx on public.rewards(tenant_id);

create table if not exists public.redemptions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  reward_id   uuid not null references public.rewards(id) on delete restrict,
  cost_points integer not null,
  code        text not null,           -- voucher / QR payload
  status      text not null default 'issued' check (status in ('issued','used','expired','cancelled')),
  created_at  timestamptz not null default now(),
  used_at     timestamptz
);
create index if not exists redemptions_member_idx on public.redemptions(member_id);
create unique index if not exists redemptions_code_idx on public.redemptions(tenant_id, code);

-- ─────────────────────────────────────────────────────────────
-- Content: campaigns, missions, news
-- ─────────────────────────────────────────────────────────────
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  title       text not null,
  description text,
  starts_at   timestamptz,
  ends_at     timestamptz,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists campaigns_tenant_idx on public.campaigns(tenant_id);

create table if not exists public.missions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  title        text not null,
  description  text,
  reward_points integer not null default 0,
  goal         jsonb not null default '{}'::jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists missions_tenant_idx on public.missions(tenant_id);

create table if not exists public.news (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  title       text not null,
  body        text,
  image_url   text,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists news_tenant_idx on public.news(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- Integration: API keys, webhook endpoints, event queue, audit log
-- ─────────────────────────────────────────────────────────────
create table if not exists public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null,
  key_prefix  text not null,           -- e.g. lk_live_abcd (shown once)
  key_hash    text not null,           -- sha256 of full key
  scopes      text[] not null default '{}',
  rate_limit_per_min integer not null default 60,
  active      boolean not null default true,
  last_used_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists api_keys_tenant_idx on public.api_keys(tenant_id);
create index if not exists api_keys_hash_idx on public.api_keys(key_hash);

create table if not exists public.webhook_endpoints (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  url         text not null,
  secret      text not null,
  events      text[] not null default '{}',  -- subscribed event types
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists webhook_endpoints_tenant_idx on public.webhook_endpoints(tenant_id);

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  type         text not null,
  payload      jsonb not null default '{}'::jsonb,
  direction    text not null default 'inbound' check (direction in ('inbound','outbound')),
  status       text not null default 'pending' check (status in ('pending','processed','failed')),
  attempts     integer not null default 0,
  error        text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists events_tenant_status_idx on public.events(tenant_id, status);

create table if not exists public.api_rate_counters (
  api_key_id  uuid not null references public.api_keys(id) on delete cascade,
  window_start timestamptz not null,
  count       integer not null default 0,
  primary key (api_key_id, window_start)
);

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  actor       uuid,
  action      text not null,
  entity      text,
  entity_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_tenant_idx on public.audit_log(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- Triggers: keep balances + tier in sync from the ledger
-- ─────────────────────────────────────────────────────────────
create or replace function public.apply_ledger_entry()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_tier uuid;
begin
  update public.members
     set points_balance  = points_balance + new.delta,
         lifetime_points = lifetime_points + greatest(new.delta, 0)
   where id = new.member_id
   returning tier_id into new_tier;

  -- re-evaluate tier from lifetime_points
  update public.members m
     set tier_id = (
       select t.id from public.tiers t
        where t.tenant_id = m.tenant_id
          and t.min_points <= m.lifetime_points
        order by t.min_points desc
        limit 1
     )
   where m.id = new.member_id;

  return new;
end;
$$;

drop trigger if exists trg_apply_ledger on public.points_ledger;
create trigger trg_apply_ledger
  after insert on public.points_ledger
  for each row execute function public.apply_ledger_entry();

-- ─────────────────────────────────────────────────────────────
-- Helpers for RLS
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin(p_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
     where a.user_id = auth.uid() and a.tenant_id = p_tenant
  );
$$;

create or replace function public.my_member_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────
alter table public.tenants            enable row level security;
alter table public.admins             enable row level security;
alter table public.tiers              enable row level security;
alter table public.members            enable row level security;
alter table public.earn_rules         enable row level security;
alter table public.points_ledger      enable row level security;
alter table public.rewards            enable row level security;
alter table public.redemptions        enable row level security;
alter table public.campaigns          enable row level security;
alter table public.missions           enable row level security;
alter table public.news               enable row level security;
alter table public.api_keys           enable row level security;
alter table public.webhook_endpoints  enable row level security;
alter table public.events             enable row level security;
alter table public.audit_log          enable row level security;

-- Tenants: public read (needed for theming); admin write.
create policy tenants_read on public.tenants for select using (true);
create policy tenants_admin_write on public.tenants for all
  using (public.is_admin(id)) with check (public.is_admin(id));

-- Admins: a user can see their own admin rows.
create policy admins_self on public.admins for select using (user_id = auth.uid());

-- Public catalog content: anyone may read (per tenant); admins manage.
create policy tiers_read on public.tiers for select using (true);
create policy tiers_admin on public.tiers for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));

create policy rewards_read on public.rewards for select using (active or public.is_admin(tenant_id));
create policy rewards_admin on public.rewards for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));

create policy campaigns_read on public.campaigns for select using (active or public.is_admin(tenant_id));
create policy campaigns_admin on public.campaigns for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));

create policy missions_read on public.missions for select using (active or public.is_admin(tenant_id));
create policy missions_admin on public.missions for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));

create policy news_read on public.news for select using (published or public.is_admin(tenant_id));
create policy news_admin on public.news for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));

-- Members: see/update own row; admins manage tenant members.
create policy members_self_read on public.members for select
  using (user_id = auth.uid() or public.is_admin(tenant_id));
create policy members_self_update on public.members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_admin on public.members for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));

-- Ledger: member reads own; admins read all. Writes go through service role.
create policy ledger_self_read on public.points_ledger for select
  using (member_id in (select public.my_member_ids()) or public.is_admin(tenant_id));

-- Redemptions: member reads own; admins manage.
create policy redemptions_self_read on public.redemptions for select
  using (member_id in (select public.my_member_ids()) or public.is_admin(tenant_id));
create policy redemptions_admin on public.redemptions for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));

-- Earn rules / integration tables: admin only (service role bypasses RLS).
create policy earn_rules_admin on public.earn_rules for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));
create policy api_keys_admin on public.api_keys for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));
create policy webhooks_admin on public.webhook_endpoints for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));
create policy events_admin on public.events for select using (public.is_admin(tenant_id));
create policy audit_admin on public.audit_log for select using (public.is_admin(tenant_id));
