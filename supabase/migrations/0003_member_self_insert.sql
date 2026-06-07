-- Allow an authenticated user to create their own member row (self sign-up).
create policy members_self_insert on public.members for insert
  with check (user_id = auth.uid());
