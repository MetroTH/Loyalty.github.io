-- Member profile fields for registration + PDPA consent.
alter table public.members
  add column if not exists address text,
  add column if not exists company text,
  add column if not exists pdpa_consent boolean not null default false,
  add column if not exists pdpa_consent_at timestamptz;
