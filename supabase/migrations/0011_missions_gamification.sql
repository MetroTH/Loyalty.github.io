-- Mission gamification: typed missions + per-member progress tracking.
alter table public.missions
  add column if not exists type text not null default 'basic',
  add column if not exists image_url text;

create table if not exists public.mission_progress (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  mission_id      uuid not null references public.missions(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  count           integer not null default 0,
  streak          integer not null default 0,
  last_event_date date,
  status          text not null default 'in_progress' check (status in ('in_progress','completed','claimed')),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (mission_id, member_id)
);
create index if not exists mp_member_idx on public.mission_progress(member_id);

alter table public.mission_progress enable row level security;

drop policy if exists mp_self_read on public.mission_progress;
create policy mp_self_read on public.mission_progress for select
  using (member_id in (select public.my_member_ids()) or public.is_admin(tenant_id));

drop policy if exists mp_admin on public.mission_progress;
create policy mp_admin on public.mission_progress for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));

-- Daily check-in (member-initiated). Uses auth.uid() so callers only affect
-- their own membership -> safe to expose to authenticated.
create or replace function public.mission_checkin(p_mission uuid)
returns public.mission_progress
language plpgsql security definer set search_path = public as $$
declare
  ms public.missions;
  mem public.members;
  mp public.mission_progress;
  goal_days int;
  today date := current_date;
begin
  select * into ms from public.missions where id = p_mission and active;
  if ms.id is null then raise exception 'mission not available'; end if;
  if ms.type <> 'checkin' then raise exception 'not a check-in mission'; end if;
  select * into mem from public.members where user_id = auth.uid() and tenant_id = ms.tenant_id;
  if mem.id is null then raise exception 'member not found'; end if;

  select * into mp from public.mission_progress where mission_id = p_mission and member_id = mem.id;
  if mp.id is null then
    insert into public.mission_progress(tenant_id, mission_id, member_id, count, streak, last_event_date)
      values (ms.tenant_id, p_mission, mem.id, 1, 1, today)
      returning * into mp;
  else
    if mp.last_event_date = today then
      raise exception 'already checked in today';
    end if;
    update public.mission_progress
       set streak = case when mp.last_event_date = today - 1 then mp.streak + 1 else 1 end,
           count = mp.count + 1,
           last_event_date = today
     where id = mp.id
     returning * into mp;
  end if;

  goal_days := coalesce((ms.goal->>'days')::int, 7);
  if mp.streak >= goal_days and mp.status = 'in_progress' then
    update public.mission_progress set status = 'completed', completed_at = now()
      where id = mp.id returning * into mp;
    if ms.reward_points > 0 then
      insert into public.points_ledger(tenant_id, member_id, delta, kind, reason, reference)
        values (ms.tenant_id, mem.id, ms.reward_points, 'earn', 'Mission: ' || ms.title, 'mission:' || ms.id);
    end if;
  end if;
  return mp;
end;
$$;
revoke execute on function public.mission_checkin(uuid) from public, anon;
grant execute on function public.mission_checkin(uuid) to authenticated;

-- Extend earn_points so each purchase also advances 'stamp' missions.
create or replace function public.earn_points(p_member uuid, p_amount numeric, p_reference text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  m public.members;
  rule public.earn_rules;
  pts integer;
  ms public.missions;
  mp public.mission_progress;
  goal_count int;
begin
  select * into m from public.members where id = p_member;
  if m.id is null then raise exception 'member not found'; end if;
  select * into rule from public.earn_rules
    where tenant_id = m.tenant_id and active and event_type = 'purchase'
    order by created_at limit 1;
  pts := floor(coalesce(p_amount, 0) * coalesce(rule.points_per_unit, 1));
  if pts > 0 then
    insert into public.points_ledger(tenant_id, member_id, delta, kind, reason, reference)
      values (m.tenant_id, m.id, pts, 'earn', 'Purchase', p_reference);
  end if;

  for ms in
    select * from public.missions
     where tenant_id = m.tenant_id and active and type = 'stamp'
  loop
    insert into public.mission_progress(tenant_id, mission_id, member_id, count)
      values (ms.tenant_id, ms.id, m.id, 1)
    on conflict (mission_id, member_id)
      do update set count = public.mission_progress.count + 1
    returning * into mp;

    goal_count := coalesce((ms.goal->>'count')::int, 1);
    if mp.count >= goal_count and mp.status = 'in_progress' then
      update public.mission_progress set status = 'completed', completed_at = now()
        where id = mp.id;
      if ms.reward_points > 0 then
        insert into public.points_ledger(tenant_id, member_id, delta, kind, reason, reference)
          values (ms.tenant_id, m.id, ms.reward_points, 'earn', 'Mission: ' || ms.title, 'mission:' || ms.id);
      end if;
    end if;
  end loop;

  return pts;
end;
$$;
revoke execute on function public.earn_points(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.earn_points(uuid, numeric, text) to service_role;
