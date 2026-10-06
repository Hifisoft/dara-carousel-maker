create table public.brand_profiles (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  id text not null,
  data jsonb not null,
  last_editor uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (organisation_id, id)
);

alter table public.brand_profiles enable row level security;
revoke all on public.brand_profiles from anon, authenticated;
grant select, insert, update, delete on public.brand_profiles to authenticated;

create policy brand_profiles_read on public.brand_profiles for select to authenticated
  using (public.is_organisation_member(organisation_id));
create policy brand_profiles_insert on public.brand_profiles for insert to authenticated
  with check (public.is_organisation_member(organisation_id) and last_editor = (select auth.uid()));
create policy brand_profiles_update on public.brand_profiles for update to authenticated
  using (public.is_organisation_member(organisation_id))
  with check (public.is_organisation_member(organisation_id) and last_editor = (select auth.uid()));
create policy brand_profiles_delete on public.brand_profiles for delete to authenticated
  using (public.is_organisation_member(organisation_id));

alter publication supabase_realtime add table public.brand_profiles;
