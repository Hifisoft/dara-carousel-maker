create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.organisation_members (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (organisation_id, user_id),
  unique (organisation_id, email)
);

create table public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index organisation_invites_org_idx on public.organisation_invites(organisation_id);

create table public.carousel_documents (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  id text not null,
  data jsonb not null,
  version integer not null default 1 check (version > 0),
  last_editor uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (organisation_id, id)
);
create index carousel_documents_recent_idx on public.carousel_documents(organisation_id, updated_at desc);

create table public.carousel_templates (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  id text not null,
  data jsonb not null,
  last_editor uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (organisation_id, id)
);

create table public.workspace_service_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  action text not null check (action in ('image', 'copy', 'instagram')),
  created_at timestamptz not null default now()
);
create index workspace_service_usage_recent_idx on public.workspace_service_usage(user_id, action, created_at desc);

create function public.is_organisation_member(org_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.organisation_members
    where organisation_id = org_id and user_id = (select auth.uid())
  );
$$;
create function public.is_organisation_owner(org_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.organisation_members
    where organisation_id = org_id and user_id = (select auth.uid()) and role = 'owner'
  );
$$;
revoke all on function public.is_organisation_member(uuid) from public;
revoke all on function public.is_organisation_owner(uuid) from public;
grant execute on function public.is_organisation_member(uuid), public.is_organisation_owner(uuid) to authenticated;

alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.organisation_invites enable row level security;
alter table public.carousel_documents enable row level security;
alter table public.carousel_templates enable row level security;
alter table public.workspace_service_usage enable row level security;

revoke all on public.organisations, public.organisation_members, public.organisation_invites,
  public.carousel_documents, public.carousel_templates, public.workspace_service_usage from anon, authenticated;
grant select on public.organisations, public.organisation_members to authenticated;
grant select, insert, update, delete on public.carousel_documents, public.carousel_templates to authenticated;

create policy organisations_read on public.organisations for select to authenticated
  using (public.is_organisation_member(id));
create policy members_read on public.organisation_members for select to authenticated
  using (public.is_organisation_member(organisation_id));

create policy documents_read on public.carousel_documents for select to authenticated
  using (public.is_organisation_member(organisation_id));
create policy documents_insert on public.carousel_documents for insert to authenticated
  with check (public.is_organisation_member(organisation_id) and last_editor = (select auth.uid()));
create policy documents_update on public.carousel_documents for update to authenticated
  using (public.is_organisation_member(organisation_id))
  with check (public.is_organisation_member(organisation_id) and last_editor = (select auth.uid()));
create policy documents_delete on public.carousel_documents for delete to authenticated
  using (public.is_organisation_member(organisation_id));

create policy templates_read on public.carousel_templates for select to authenticated
  using (public.is_organisation_member(organisation_id));
create policy templates_insert on public.carousel_templates for insert to authenticated
  with check (public.is_organisation_member(organisation_id) and last_editor = (select auth.uid()));
create policy templates_update on public.carousel_templates for update to authenticated
  using (public.is_organisation_member(organisation_id))
  with check (public.is_organisation_member(organisation_id) and last_editor = (select auth.uid()));
create policy templates_delete on public.carousel_templates for delete to authenticated
  using (public.is_organisation_member(organisation_id));

create function public.reserve_workspace_service(actor uuid, org_id uuid, service_action text, hourly_limit integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare used_count integer;
begin
  if service_action not in ('image', 'copy', 'instagram') or hourly_limit < 1 then return false; end if;
  if not exists (select 1 from public.organisation_members where user_id = actor and organisation_id = org_id) then return false; end if;
  perform pg_advisory_xact_lock(hashtext(actor::text || ':' || service_action));
  select count(*) into used_count from public.workspace_service_usage
    where user_id = actor and action = service_action and created_at > now() - interval '1 hour';
  if used_count >= hourly_limit then return false; end if;
  insert into public.workspace_service_usage(user_id, organisation_id, action)
    values (actor, org_id, service_action);
  return true;
end;
$$;
revoke all on function public.reserve_workspace_service(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_workspace_service(uuid, uuid, text, integer) to service_role;

-- Realtime is used to announce remote updates; clients still fetch rows through RLS.
alter publication supabase_realtime add table public.carousel_documents;
alter publication supabase_realtime add table public.carousel_templates;
