-- Security hardening (from Supabase advisors).

-- 1) Enable RLS on the rate-counter table (no policies => only service role).
alter table public.api_rate_counters enable row level security;

-- 2) Privileged SECURITY DEFINER functions must NOT be callable by clients.
--    Only the service role (Edge Functions) may invoke them. RLS-helper
--    functions (is_admin, my_member_ids) stay executable as policies need them.
revoke execute on function public.apply_ledger_entry() from public, anon, authenticated;
revoke execute on function public.earn_points(uuid, numeric, text) from public, anon, authenticated;
revoke execute on function public.find_or_create_member(uuid, text) from public, anon, authenticated;
revoke execute on function public.incr_rate(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.redeem_reward(uuid, uuid) from public, anon, authenticated;

grant execute on function public.earn_points(uuid, numeric, text) to service_role;
grant execute on function public.find_or_create_member(uuid, text) to service_role;
grant execute on function public.incr_rate(uuid, timestamptz) to service_role;
grant execute on function public.redeem_reward(uuid, uuid) to service_role;
