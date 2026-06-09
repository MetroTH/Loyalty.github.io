-- Quiz / Spin / Team gamification missions.
-- (See mission_checkin + stamp in 0011.) Functions are SECURITY DEFINER and
-- scoped by auth.uid() so members can only affect their own membership.

-- QUIZ
create or replace function public.mission_answer_quiz(p_mission uuid, p_choice int)
returns public.mission_progress language plpgsql security definer set search_path = public as $$
declare ms public.missions; mem public.members; mp public.mission_progress; correct int;
begin
  select * into ms from public.missions where id = p_mission and active;
  if ms.id is null then raise exception 'mission not available'; end if;
  if ms.type <> 'quiz' then raise exception 'not a quiz mission'; end if;
  select * into mem from public.members where user_id = auth.uid() and tenant_id = ms.tenant_id;
  if mem.id is null then raise exception 'member not found'; end if;
  select * into mp from public.mission_progress where mission_id = p_mission and member_id = mem.id;
  if mp.id is null then
    insert into public.mission_progress(tenant_id, mission_id, member_id, count)
      values (ms.tenant_id, p_mission, mem.id, 1) returning * into mp;
  else
    if mp.status = 'completed' then raise exception 'already completed'; end if;
    update public.mission_progress set count = mp.count + 1 where id = mp.id returning * into mp;
  end if;
  correct := coalesce((ms.goal->>'answer')::int, -1);
  if p_choice = correct then
    update public.mission_progress set status = 'completed', completed_at = now() where id = mp.id returning * into mp;
    if ms.reward_points > 0 then
      insert into public.points_ledger(tenant_id, member_id, delta, kind, reason, reference)
        values (ms.tenant_id, mem.id, ms.reward_points, 'earn', 'Mission: ' || ms.title, 'mission:' || ms.id);
    end if;
  end if;
  return mp;
end;$$;
revoke execute on function public.mission_answer_quiz(uuid, int) from public, anon;
grant execute on function public.mission_answer_quiz(uuid, int) to authenticated;

-- SPIN (weighted, once/day)
create or replace function public.mission_spin(p_mission uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ms public.missions; mem public.members; mp public.mission_progress;
  prizes jsonb; total numeric; r numeric; acc numeric := 0; prize jsonb; pts int; today date := current_date;
begin
  select * into ms from public.missions where id = p_mission and active;
  if ms.id is null then raise exception 'mission not available'; end if;
  if ms.type <> 'spin' then raise exception 'not a spin mission'; end if;
  select * into mem from public.members where user_id = auth.uid() and tenant_id = ms.tenant_id;
  if mem.id is null then raise exception 'member not found'; end if;
  select * into mp from public.mission_progress where mission_id = p_mission and member_id = mem.id;
  if mp.id is not null and mp.last_event_date = today then raise exception 'already spun today'; end if;
  prizes := ms.goal->'prizes';
  if prizes is null or jsonb_array_length(prizes) = 0 then raise exception 'no prizes configured'; end if;
  select coalesce(sum(coalesce((p->>'weight')::numeric, 1)), 0) into total from jsonb_array_elements(prizes) p;
  r := random() * total;
  for prize in select value from jsonb_array_elements(prizes) loop
    acc := acc + coalesce((prize->>'weight')::numeric, 1);
    exit when r <= acc;
  end loop;
  pts := coalesce((prize->>'points')::int, 0);
  if mp.id is null then
    insert into public.mission_progress(tenant_id, mission_id, member_id, count, last_event_date)
      values (ms.tenant_id, p_mission, mem.id, 1, today) returning * into mp;
  else
    update public.mission_progress set count = mp.count + 1, last_event_date = today where id = mp.id returning * into mp;
  end if;
  if pts > 0 then
    insert into public.points_ledger(tenant_id, member_id, delta, kind, reason, reference)
      values (ms.tenant_id, mem.id, pts, 'earn', 'Spin: ' || coalesce(prize->>'label','prize'), 'mission:' || ms.id);
  end if;
  return jsonb_build_object('label', prize->>'label', 'points', pts);
end;$$;
revoke execute on function public.mission_spin(uuid) from public, anon;
grant execute on function public.mission_spin(uuid) to authenticated;

-- TEAM tables + RPCs
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  name text not null,
  code text not null,
  count integer not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (mission_id, code)
);
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  last_event_date date,
  rewarded boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (team_id, member_id)
);
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select using (
  id in (select team_id from public.team_members where member_id in (select public.my_member_ids()))
  or public.is_admin(tenant_id)
);
drop policy if exists teams_admin on public.teams;
create policy teams_admin on public.teams for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));
drop policy if exists tm_read on public.team_members;
create policy tm_read on public.team_members for select
  using (member_id in (select public.my_member_ids()) or public.is_admin(tenant_id));
drop policy if exists tm_admin on public.team_members;
create policy tm_admin on public.team_members for all
  using (public.is_admin(tenant_id)) with check (public.is_admin(tenant_id));

create or replace function public._team_check_complete(p_team uuid)
returns void language plpgsql security definer set search_path = public as $$
declare tm public.teams; ms public.missions; goal_count int; rec record;
begin
  select * into tm from public.teams where id = p_team;
  if tm.id is null then return; end if;
  select * into ms from public.missions where id = tm.mission_id;
  goal_count := coalesce((ms.goal->>'count')::int, 1);
  if tm.count >= goal_count and tm.status = 'in_progress' then
    update public.teams set status = 'completed', completed_at = now() where id = tm.id;
    if ms.reward_points > 0 then
      for rec in select * from public.team_members where team_id = tm.id and not rewarded loop
        insert into public.points_ledger(tenant_id, member_id, delta, kind, reason, reference)
          values (tm.tenant_id, rec.member_id, ms.reward_points, 'earn', 'Team mission: ' || ms.title, 'team:' || tm.id);
        update public.team_members set rewarded = true where team_id = tm.id and member_id = rec.member_id;
      end loop;
    end if;
  end if;
end;$$;
revoke execute on function public._team_check_complete(uuid) from public, anon, authenticated;

create or replace function public.team_create(p_mission uuid, p_name text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare ms public.missions; mem public.members; t public.teams; v_code text;
begin
  select * into ms from public.missions where id = p_mission and active;
  if ms.id is null or ms.type <> 'team' then raise exception 'team mission not available'; end if;
  select * into mem from public.members where user_id = auth.uid() and tenant_id = ms.tenant_id;
  if mem.id is null then raise exception 'member not found'; end if;
  v_code := upper(substr(md5(random()::text), 1, 6));
  insert into public.teams(tenant_id, mission_id, name, code) values (ms.tenant_id, p_mission, p_name, v_code) returning * into t;
  insert into public.team_members(team_id, member_id, tenant_id) values (t.id, mem.id, ms.tenant_id);
  return t;
end;$$;
revoke execute on function public.team_create(uuid, text) from public, anon;
grant execute on function public.team_create(uuid, text) to authenticated;

create or replace function public.team_join(p_mission uuid, p_code text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare ms public.missions; mem public.members; t public.teams;
begin
  select * into ms from public.missions where id = p_mission and active;
  if ms.id is null or ms.type <> 'team' then raise exception 'team mission not available'; end if;
  select * into mem from public.members where user_id = auth.uid() and tenant_id = ms.tenant_id;
  if mem.id is null then raise exception 'member not found'; end if;
  select * into t from public.teams where mission_id = p_mission and code = upper(p_code);
  if t.id is null then raise exception 'team code not found'; end if;
  insert into public.team_members(team_id, member_id, tenant_id) values (t.id, mem.id, ms.tenant_id) on conflict do nothing;
  return t;
end;$$;
revoke execute on function public.team_join(uuid, text) from public, anon;
grant execute on function public.team_join(uuid, text) to authenticated;

create or replace function public.team_contribute(p_mission uuid)
returns public.teams language plpgsql security definer set search_path = public as $$
declare ms public.missions; mem public.members; t public.teams; today date := current_date; led date;
begin
  select * into ms from public.missions where id = p_mission and active;
  if ms.id is null or ms.type <> 'team' then raise exception 'team mission not available'; end if;
  select * into mem from public.members where user_id = auth.uid() and tenant_id = ms.tenant_id;
  if mem.id is null then raise exception 'member not found'; end if;
  select t.* into t from public.teams t join public.team_members tm on tm.team_id = t.id
   where t.mission_id = p_mission and tm.member_id = mem.id;
  if t.id is null then raise exception 'join a team first'; end if;
  select last_event_date into led from public.team_members where team_id = t.id and member_id = mem.id;
  if led = today then raise exception 'already contributed today'; end if;
  update public.team_members set last_event_date = today where team_id = t.id and member_id = mem.id;
  if t.status = 'in_progress' then
    update public.teams set count = count + 1 where id = t.id returning * into t;
    perform public._team_check_complete(t.id);
    select * into t from public.teams where id = t.id;
  end if;
  return t;
end;$$;
revoke execute on function public.team_contribute(uuid) from public, anon;
grant execute on function public.team_contribute(uuid) to authenticated;

-- earn_points advances stamp + team missions on purchase (see 0011 for base).
create or replace function public.earn_points(p_member uuid, p_amount numeric, p_reference text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  m public.members; rule public.earn_rules; pts integer;
  ms public.missions; mp public.mission_progress; goal_count int; v_team uuid;
begin
  select * into m from public.members where id = p_member;
  if m.id is null then raise exception 'member not found'; end if;
  select * into rule from public.earn_rules where tenant_id = m.tenant_id and active and event_type = 'purchase' order by created_at limit 1;
  pts := floor(coalesce(p_amount, 0) * coalesce(rule.points_per_unit, 1));
  if pts > 0 then
    insert into public.points_ledger(tenant_id, member_id, delta, kind, reason, reference)
      values (m.tenant_id, m.id, pts, 'earn', 'Purchase', p_reference);
  end if;
  for ms in select * from public.missions where tenant_id = m.tenant_id and active and type = 'stamp' loop
    insert into public.mission_progress(tenant_id, mission_id, member_id, count) values (ms.tenant_id, ms.id, m.id, 1)
    on conflict (mission_id, member_id) do update set count = public.mission_progress.count + 1 returning * into mp;
    goal_count := coalesce((ms.goal->>'count')::int, 1);
    if mp.count >= goal_count and mp.status = 'in_progress' then
      update public.mission_progress set status = 'completed', completed_at = now() where id = mp.id;
      if ms.reward_points > 0 then
        insert into public.points_ledger(tenant_id, member_id, delta, kind, reason, reference)
          values (ms.tenant_id, m.id, ms.reward_points, 'earn', 'Mission: ' || ms.title, 'mission:' || ms.id);
      end if;
    end if;
  end loop;
  for ms in select * from public.missions where tenant_id = m.tenant_id and active and type = 'team' loop
    update public.teams t set count = t.count + 1 from public.team_members tmx
     where t.mission_id = ms.id and t.id = tmx.team_id and tmx.member_id = m.id and t.status = 'in_progress'
    returning t.id into v_team;
    if v_team is not null then perform public._team_check_complete(v_team); v_team := null; end if;
  end loop;
  return pts;
end;$$;
revoke execute on function public.earn_points(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.earn_points(uuid, numeric, text) to service_role;
