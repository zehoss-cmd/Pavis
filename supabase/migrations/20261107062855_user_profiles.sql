-- A profile is private to its authenticated owner; organization access remains separate.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60 and display_name = btrim(display_name)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (user_id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy "read own profile" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "create own profile" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create function private.set_profile_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;
revoke all on function private.set_profile_updated_at() from public, anon, authenticated;
create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_profile_updated_at();
