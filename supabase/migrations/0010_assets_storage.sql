-- Public bucket for uploaded assets (reward images, logos).
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do update set public = true;

drop policy if exists "assets public read" on storage.objects;
create policy "assets public read"
  on storage.objects for select
  using (bucket_id = 'assets');

drop policy if exists "assets auth upload" on storage.objects;
create policy "assets auth upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'assets');

drop policy if exists "assets auth update" on storage.objects;
create policy "assets auth update"
  on storage.objects for update to authenticated
  using (bucket_id = 'assets')
  with check (bucket_id = 'assets');
