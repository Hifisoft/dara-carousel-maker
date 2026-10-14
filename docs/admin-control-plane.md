# DARA Admin control plane setup

The admin control plane is additive. It does not alter carousel or template records. The new migration must be applied to the Supabase project before `/admin` can load.

## Enable the first super admin

1. Apply `supabase/migrations/20261013000000_admin_control_plane.sql` in the Supabase SQL editor (or through the normal migration workflow).
2. In Supabase **Authentication → Users**, identify the owner account and copy its user UUID. Do not use an email address as the authorization rule.
3. In the SQL editor, grant that UUID the initial role:

```sql
insert into public.admin_roles (user_id, role)
values ('PASTE_AUTH_USER_UUID_HERE', 'super_admin');
```

4. Sign into DARA with that account and open `/admin`.

Admin roles and control-plane tables are not readable or writable by browser roles. The first grant is deliberately a database operation; the admin UI cannot grant itself privileges.

## Current boundaries

- Subscriptions are an internal data model only. No billing provider, payment state, MRR, or revenue is connected.
- AI usage telemetry records operation, model, status, latency, and configured per-operation cost when available. Provider token counts are not currently returned consistently by all configured providers.
- Credit grants create a ledger entry and audit event atomically. Credits are not yet charged by AI requests, and plan quotas are editable but not yet applied to all customer operations.
- Global skill drafts and versions are managed in Admin. Prompt composition still uses existing customer instructions; platform skill publishing is not yet wired into production prompts.
- AI route enablement and primary model settings are enforced by the server AI routes. Only models already supported by that task can be selected. The fallback field is stored for future provider failover but automatic fallback is not yet implemented.
- `instagramImport` is checked server-side. Other general flags are stored centrally but require explicit integration at each capability boundary before they control product behavior.
- Admin user and organisation views expose operational metadata only; they do not provide carousel-content editing or deletion.
