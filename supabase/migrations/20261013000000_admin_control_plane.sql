-- Additive DARA internal control plane. No customer document records are changed.
create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'support', 'finance', 'operations')),
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now()
);

create table public.admin_audit_events (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references auth.users(id),
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index admin_audit_events_recent_idx on public.admin_audit_events(created_at desc);

create table public.saas_plans (
  id text primary key,
  name text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  monthly_price numeric(12,2),
  annual_price numeric(12,2),
  currency text not null default 'USD',
  entitlements jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create table public.saas_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  plan_id text references public.saas_plans(id),
  provider text,
  provider_customer_id text,
  provider_subscription_id text unique,
  status text not null default 'incomplete' check (status in ('trialing','active','past_due','canceled','incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saas_subscriptions_org_idx on public.saas_subscriptions(organisation_id, created_at desc);

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  amount integer not null check (amount <> 0),
  entry_type text not null check (entry_type in ('allocation','consumption','admin_grant','purchase','expiry','adjustment')),
  operation text,
  reference_id text unique,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index credit_ledger_org_idx on public.credit_ledger(organisation_id, created_at desc);

create table public.ai_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  organisation_id uuid references public.organisations(id) on delete set null,
  task_type text not null,
  provider text,
  model text,
  status text not null check (status in ('succeeded','failed','rejected')),
  credits_charged integer not null default 0,
  input_tokens integer,
  output_tokens integer,
  estimated_provider_cost numeric(14,8),
  pricing_version text,
  latency_ms integer,
  error_summary text,
  created_at timestamptz not null default now()
);
create index ai_usage_events_recent_idx on public.ai_usage_events(created_at desc);
create index ai_usage_events_org_idx on public.ai_usage_events(organisation_id, created_at desc);

create table public.ai_route_config (
  task_key text primary key,
  primary_model text not null,
  fallback_model text,
  enabled boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create table public.ai_operation_costs (
  id bigint generated always as identity primary key,
  task_key text not null,
  provider text not null,
  model text not null,
  cost_per_operation numeric(14,8) not null default 0 check (cost_per_operation >= 0),
  currency text not null default 'USD',
  pricing_version text not null,
  effective_from timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.global_skills (
  id text primary key,
  skill_key text not null unique,
  name text not null,
  current_published_version integer,
  updated_at timestamptz not null default now()
);
create table public.global_skill_versions (
  id bigint generated always as identity primary key,
  skill_id text not null references public.global_skills(id) on delete cascade,
  version integer not null,
  content text not null default '',
  status text not null check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(skill_id, version)
);
create index global_skill_versions_idx on public.global_skill_versions(skill_id, version desc);

create table public.feature_flags (
  flag_key text primary key,
  name text not null,
  description text not null default '',
  enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create table public.operational_events (
  id bigint generated always as identity primary key,
  category text not null,
  user_id uuid references auth.users(id) on delete set null,
  organisation_id uuid references public.organisations(id) on delete set null,
  task_type text,
  status text not null,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index operational_events_recent_idx on public.operational_events(created_at desc);

insert into public.saas_plans(id, name, entitlements) values
  ('free', 'Free', '{"ai.copy.monthly":0,"ai.image.monthly":0,"ai.review.monthly":0,"brands.max":1,"templates.max":10,"members.max":1}'::jsonb),
  ('creator', 'Creator', '{"ai.copy.monthly":null,"ai.image.monthly":null,"ai.review.monthly":null,"brands.max":3,"templates.max":null,"members.max":1,"feature.batchExport":false}'::jsonb),
  ('pro', 'Pro', '{"ai.copy.monthly":null,"ai.image.monthly":null,"ai.review.monthly":null,"brands.max":20,"templates.max":null,"members.max":5,"feature.batchExport":true}'::jsonb)
on conflict (id) do nothing;

insert into public.ai_route_config(task_key, primary_model) values
  ('copy','gemini-3.6-flash'),('review','gemini-3.6-flash'),
  ('visual_direction','openai:gpt-6-luna'),('image','openai:gpt-image-1.5')
on conflict (task_key) do nothing;
insert into public.feature_flags(flag_key,name,description,enabled) values
 ('brandVariants','Brand variants','Generate exports for multiple brand profiles.',false),
 ('instagramImport','Instagram import','Import media from a connected professional account.',true),
 ('customSkills','Custom skills','Use organization-level creative skills.',false),
 ('newImageModel','New image model','Enable newly supported image models.',false),
 ('aiCreativeDirector','AI creative director','Enable AI visual direction.',true)
on conflict (flag_key) do nothing;
insert into public.global_skills(id,skill_key,name) values
 ('global-rules','global_rules','Global Rules'),('cover-slide','cover_slide','Cover Slide'),
 ('content-slide','content_slide','Content Slide'),('cta-slide','cta_slide','CTA Slide')
on conflict (id) do nothing;

-- All control-plane tables are intentionally inaccessible to normal client roles.
do $$ declare t text; begin
  foreach t in array array['admin_roles','admin_audit_events','saas_plans','saas_subscriptions','credit_ledger','ai_usage_events','ai_route_config','ai_operation_costs','global_skills','global_skill_versions','feature_flags','operational_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

create or replace function public.admin_grant_credits(
  p_admin_user_id uuid, p_organisation_id uuid, p_user_id uuid, p_amount integer, p_reason text
) returns bigint language plpgsql security definer set search_path = public, pg_temp as $$
declare entry_id bigint;
begin
  if not exists (select 1 from public.admin_roles where user_id = p_admin_user_id and role = 'super_admin') then
    raise exception 'admin authorization required' using errcode = '42501';
  end if;
  if p_amount < 1 or p_amount > 100000 or length(trim(coalesce(p_reason,''))) < 1 then
    raise exception 'invalid credit grant';
  end if;
  insert into public.credit_ledger(organisation_id,user_id,amount,entry_type,reason,created_by)
    values (p_organisation_id,p_user_id,p_amount,'admin_grant',left(trim(p_reason),500),p_admin_user_id)
    returning id into entry_id;
  insert into public.admin_audit_events(admin_user_id,action,target_type,target_id,metadata,reason)
    values (p_admin_user_id,'credits_granted','organisation',p_organisation_id::text,
      jsonb_build_object('amount',p_amount,'userId',p_user_id,'ledgerId',entry_id),left(trim(p_reason),500));
  return entry_id;
end;
$$;
revoke all on function public.admin_grant_credits(uuid,uuid,uuid,integer,text) from public, anon, authenticated;
grant execute on function public.admin_grant_credits(uuid,uuid,uuid,integer,text) to service_role;
