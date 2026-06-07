-- Loyalink — transactional RPCs used by Edge Functions (service role).

-- Find an existing member by phone for a tenant, or create one.
create or replace function public.find_or_create_member(p_tenant uuid, p_phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  select id into mid from public.members where tenant_id = p_tenant and phone = p_phone;
  if mid is null then
    insert into public.members(tenant_id, phone) values (p_tenant, p_phone) returning id into mid;
  end if;
  return mid;
end;
$$;

-- Award points for a purchase amount using the tenant's active earn rule.
create or replace function public.earn_points(p_member uuid, p_amount numeric, p_reference text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  m public.members;
  rule public.earn_rules;
  pts integer;
begin
  select * into m from public.members where id = p_member;
  if m.id is null then raise exception 'member not found'; end if;
  select * into rule from public.earn_rules
    where tenant_id = m.tenant_id and active and event_type = 'purchase'
    order by created_at limit 1;
  pts := floor(coalesce(p_amount, 0) * coalesce(rule.points_per_unit, 1));
  if pts <= 0 then return 0; end if;
  insert into public.points_ledger(tenant_id, member_id, delta, kind, reason, reference)
    values (m.tenant_id, m.id, pts, 'earn', 'Purchase', p_reference);
  return pts;
end;
$$;

-- Redeem a reward: validates balance + stock, burns points, issues a voucher code.
create or replace function public.redeem_reward(p_member uuid, p_reward uuid)
returns public.redemptions language plpgsql security definer set search_path = public as $$
declare
  r public.rewards;
  m public.members;
  v_code text;
  red public.redemptions;
begin
  select * into m from public.members where id = p_member;
  if m.id is null then raise exception 'member not found'; end if;
  select * into r from public.rewards where id = p_reward and tenant_id = m.tenant_id and active;
  if r.id is null then raise exception 'reward not available'; end if;
  if r.stock is not null and r.stock <= 0 then raise exception 'out of stock'; end if;
  if m.points_balance < r.cost_points then raise exception 'insufficient points'; end if;

  v_code := 'LK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  insert into public.points_ledger(tenant_id, member_id, delta, kind, reason, reference)
    values (m.tenant_id, m.id, -r.cost_points, 'burn', 'Redeem: ' || r.title, v_code);

  if r.stock is not null then
    update public.rewards set stock = stock - 1 where id = r.id;
  end if;

  insert into public.redemptions(tenant_id, member_id, reward_id, cost_points, code)
    values (m.tenant_id, m.id, r.id, r.cost_points, v_code)
    returning * into red;

  return red;
end;
$$;
