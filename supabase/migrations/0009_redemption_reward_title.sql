-- Snapshot the reward title onto each redemption so voucher history stays
-- stable even if the reward is later hidden or deleted.
alter table public.redemptions add column if not exists reward_title text;

update public.redemptions r
   set reward_title = rw.title
  from public.rewards rw
 where rw.id = r.reward_id and r.reward_title is null;

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

  insert into public.redemptions(tenant_id, member_id, reward_id, cost_points, code, reward_title)
    values (m.tenant_id, m.id, r.id, r.cost_points, v_code, r.title)
    returning * into red;

  return red;
end;
$$;
