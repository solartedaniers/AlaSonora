-- Review and run manually in the Supabase SQL Editor. Not executed by Claude.
--
-- 1. Auto-create a `profiles` row for every new `auth.users` row (self-signup
--    OR admin-created), decoupled from the Java app so a profile can never be
--    missing. Defaults mirror ProfileService.getOrCreate's existing fallback
--    (display_name = full_name metadata or email, role = HOBBYIST) so both
--    paths (lazy Java create, this trigger) agree if they ever race.
--    system_role is left to its column default ('USER', lowest privilege) by
--    omitting it from the insert.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'HOBBYIST'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- 2. Public read access for `species` — RLS is enabled on the table (from
--    point 1's Hibernate-managed schema) but had zero policies, so every
--    read was being silently denied to anon/authenticated roles going
--    through Supabase's API (e.g. Realtime, direct supabase-js calls). The
--    Spring Boot backend itself is unaffected (connects as a superuser role
--    via the pooler, which bypasses RLS), but this closes the gap for any
--    client that queries Supabase directly.
create policy "Species are publicly readable"
  on public.species
  for select
  to anon, authenticated
  using (true);
