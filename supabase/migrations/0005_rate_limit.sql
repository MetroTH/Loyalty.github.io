-- Atomic per-key, per-minute rate counter. Returns the new count.
create or replace function public.incr_rate(p_key uuid, p_window timestamptz)
returns integer language plpgsql security definer set search_path = public as $$
declare c integer;
begin
  insert into public.api_rate_counters(api_key_id, window_start, count)
    values (p_key, p_window, 1)
  on conflict (api_key_id, window_start)
    do update set count = public.api_rate_counters.count + 1
  returning count into c;
  return c;
end;
$$;
