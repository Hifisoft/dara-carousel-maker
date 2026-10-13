import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '../../../lib/serverAuth';
import { isCopyModel, isDirectionModel, isImageModel } from '../../../lib/aiModels';

const jsonError = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function GET(request: NextRequest) {
  const auth = await requirePlatformAdmin(request);
  if (auth.status !== 200 || !auth.client || !auth.user) return jsonError(auth.status === 503 ? 'Admin control plane is not configured. Apply the Supabase admin migration.' : 'Admin access required.', auth.status);
  const db = auth.client;
  const section = request.nextUrl.searchParams.get('section') || 'overview';
  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
  try {
    if (section === 'overview') {
      const [users, orgs, usage, audits, failures, plans, subscriptions] = await Promise.all([
        db.auth.admin.listUsers({ page: 1, perPage: 1 }),
        db.from('organisations').select('id', { count: 'exact', head: true }),
        db.from('ai_usage_events').select('id, task_type, provider, model, status, estimated_provider_cost, latency_ms, created_at').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).order('created_at', { ascending: false }).limit(1000),
        db.from('admin_audit_events').select('*').order('created_at', { ascending: false }).limit(10),
        db.from('operational_events').select('*').order('created_at', { ascending: false }).limit(10),
        db.from('saas_plans').select('id', { count: 'exact', head: true }),
        db.from('saas_subscriptions').select('id', { count: 'exact', head: true }),
      ]);
      return NextResponse.json({
        users: (users.data as any)?.total ?? null, organisations: orgs.count ?? 0,
        aiUsage30d: usage.data || [], recentAudit: audits.data || [], recentFailures: failures.data || [],
        plans: plans.count ?? 0, subscriptions: subscriptions.count ?? 0,
        billingAvailable: false,
      });
    }
    if (section === 'users') {
      const [listed, orgs, members, usage] = await Promise.all([
        db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        db.from('organisations').select('id,name,owner_id,created_at'),
        db.from('organisation_members').select('organisation_id,user_id,role,email'),
        db.from('ai_usage_events').select('user_id,task_type,status,created_at').order('created_at', { ascending: false }).limit(10000),
      ]);
      if (listed.error) throw listed.error;
      const results = (listed.data?.users || []).map(user => {
        const userOrgs = (members.data || []).filter(m => m.user_id === user.id).map(m => ({ ...m, organisation: orgs.data?.find(o => o.id === m.organisation_id) || null }));
        const events = (usage.data || []).filter(event => event.user_id === user.id);
        return { id: user.id, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at, banned_until: user.banned_until, organisations: userOrgs, usage: events.length, ai_failures: events.filter(event => event.status === 'failed').length };
      }).filter(user => !q || `${user.id} ${user.email || ''} ${user.organisations.map(o => o.organisation?.name || '').join(' ')}`.toLowerCase().includes(q));
      return NextResponse.json({ users: results });
    }
    const queries: Record<string, () => PromiseLike<any>> = {
      organisations: () => db.from('organisations').select('id,name,owner_id,created_at,organisation_members(user_id,email,role)').order('created_at', { ascending: false }).limit(500),
      plans: () => db.from('saas_plans').select('*').order('id'),
      subscriptions: () => db.from('saas_subscriptions').select('*, organisations(name), saas_plans(name)').order('created_at', { ascending: false }).limit(500),
      credits: () => db.from('credit_ledger').select('*, organisations(name)').order('created_at', { ascending: false }).limit(500),
      usage: () => db.from('ai_usage_events').select('*').order('created_at', { ascending: false }).limit(500),
      routes: () => db.from('ai_route_config').select('*').order('task_key'),
      costs: () => db.from('ai_operation_costs').select('*').order('effective_from', { ascending: false }).limit(500),
      flags: () => db.from('feature_flags').select('*').order('flag_key'),
      skills: () => db.from('global_skills').select('*, global_skill_versions(*)').order('name'),
      logs: () => db.from('operational_events').select('*').order('created_at', { ascending: false }).limit(500),
      audit: () => db.from('admin_audit_events').select('*').order('created_at', { ascending: false }).limit(500),
      admins: () => db.from('admin_roles').select('*').order('granted_at', { ascending: false }),
    };
    const query = queries[section];
    if (!query) return jsonError('Unknown admin section.', 400);
    const { data, error } = await query();
    if (error) throw error;
    if (section === 'organisations' && q) return NextResponse.json({ [section]: (data || []).filter((org: any) => `${org.name} ${org.id} ${org.owner_id}`.toLowerCase().includes(q)) });
    return NextResponse.json({ [section]: data || [] });
  } catch (error) {
    console.error('[Admin API] Read failed:', error instanceof Error ? error.message : 'unknown');
    return jsonError('Could not load admin data. Apply the admin control-plane migration and confirm database access.', 503);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdmin(request);
  if (auth.status !== 200 || !auth.client || !auth.user) return jsonError(auth.status === 503 ? 'Admin control plane is not configured. Apply the Supabase admin migration.' : 'Admin access required.', auth.status);
  const db = auth.client;
  let body: any;
  try { body = await request.json(); } catch { return jsonError('Invalid request body.', 400); }
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  const audit = async (action: string, type: string, id: string, metadata: Record<string, unknown> = {}) => {
    const { error } = await db.from('admin_audit_events').insert({ admin_user_id: auth.user!.id, action, target_type: type, target_id: id, metadata, reason: reason || null });
    if (error) throw error;
  };
  try {
    switch (body.action) {
      case 'grant_credits': {
        const amount = Number(body.amount);
        if (!body.organisationId || !Number.isInteger(amount) || amount < 1 || amount > 100000 || !reason) return jsonError('Choose an organisation, enter 1–100000 credits, and provide a reason.', 400);
        const { data, error } = await db.rpc('admin_grant_credits', { p_admin_user_id: auth.user.id, p_organisation_id: body.organisationId, p_user_id: body.userId || null, p_amount: amount, p_reason: reason });
        if (error) throw error;
        return NextResponse.json({ success: true, ledgerId: data });
      }
      case 'set_flag': {
        const { error } = await db.from('feature_flags').update({ enabled: Boolean(body.enabled), updated_by: auth.user.id, updated_at: new Date().toISOString() }).eq('flag_key', body.key);
        if (error) throw error;
        await audit('feature_flag_changed', 'feature_flag', body.key, { enabled: Boolean(body.enabled) });
        break;
      }
      case 'save_plan': {
        if (!body.id || !body.name || typeof body.entitlements !== 'object') return jsonError('Plan id, name, and entitlements are required.', 400);
        const { error } = await db.from('saas_plans').upsert({ id: String(body.id).slice(0, 64), name: String(body.name).slice(0, 100), status: body.status === 'archived' ? 'archived' : 'active', monthly_price: body.monthlyPrice ?? null, annual_price: body.annualPrice ?? null, entitlements: body.entitlements, updated_by: auth.user.id, updated_at: new Date().toISOString() });
        if (error) throw error;
        await audit('plan_changed', 'plan', body.id, { name: body.name });
        break;
      }
      case 'set_route': {
        const validator = body.key === 'copy' || body.key === 'review' ? isCopyModel : body.key === 'visual_direction' ? isDirectionModel : body.key === 'image' ? isImageModel : null;
        if (!validator || !validator(body.primaryModel) || (body.fallbackModel && !validator(body.fallbackModel))) return jsonError('Choose a model supported for this task.', 400);
        const { error } = await db.from('ai_route_config').upsert({ task_key: body.key, primary_model: body.primaryModel, fallback_model: body.fallbackModel || null, enabled: Boolean(body.enabled), updated_by: auth.user.id, updated_at: new Date().toISOString() });
        if (error) throw error;
        await audit('ai_route_changed', 'ai_route', body.key, { primaryModel: body.primaryModel, fallbackModel: body.fallbackModel || null, enabled: Boolean(body.enabled) });
        break;
      }
      case 'save_cost': {
        const amount = Number(body.costPerOperation);
        if (!body.taskKey || !body.provider || !body.model || !body.pricingVersion || !Number.isFinite(amount) || amount < 0) return jsonError('Provide a valid task, provider, model, cost and pricing version.', 400);
        const { error } = await db.from('ai_operation_costs').insert({ task_key: body.taskKey, provider: body.provider, model: body.model, cost_per_operation: amount, pricing_version: body.pricingVersion, created_by: auth.user.id });
        if (error) throw error;
        await audit('ai_cost_configured', 'ai_model', body.model, { taskKey: body.taskKey, costPerOperation: amount, pricingVersion: body.pricingVersion });
        break;
      }
      case 'save_skill_draft': {
        const skillId = String(body.skillId || '');
        if (!skillId || typeof body.content !== 'string' || body.content.length > 20000) return jsonError('Skill content must be under 20 KB.', 400);
        const { data: versions, error: listError } = await db.from('global_skill_versions').select('version').eq('skill_id', skillId).order('version', { ascending: false }).limit(1);
        if (listError) throw listError;
        const version = (versions?.[0]?.version || 0) + 1;
        const { error } = await db.from('global_skill_versions').insert({ skill_id: skillId, version, content: body.content, status: 'draft', created_by: auth.user.id });
        if (error) throw error;
        await audit('skill_draft_saved', 'skill', skillId, { version });
        break;
      }
      case 'publish_skill': {
        const skillId = String(body.skillId || ''); const version = Number(body.version);
        const { data: target, error: findError } = await db.from('global_skill_versions').select('id').eq('skill_id', skillId).eq('version', version).single();
        if (findError) throw findError;
        const { error: archiveError } = await db.from('global_skill_versions').update({ status: 'archived' }).eq('skill_id', skillId).eq('status', 'published');
        if (archiveError) throw archiveError;
        const { error: publishError } = await db.from('global_skill_versions').update({ status: 'published' }).eq('id', target.id);
        if (publishError) throw publishError;
        const { error: skillError } = await db.from('global_skills').update({ current_published_version: version, updated_at: new Date().toISOString() }).eq('id', skillId);
        if (skillError) throw skillError;
        await audit('skill_published', 'skill', skillId, { version });
        break;
      }
      case 'set_account_status': {
        if (!body.userId || !['suspend','restore'].includes(body.mode)) return jsonError('Invalid account status request.', 400);
        const { error } = await db.auth.admin.updateUserById(body.userId, { ban_duration: body.mode === 'suspend' ? '876000h' : 'none' });
        if (error) throw error;
        await audit(body.mode === 'suspend' ? 'account_suspended' : 'account_restored', 'user', body.userId);
        break;
      }
      default: return jsonError('Unknown admin action.', 400);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin API] Mutation failed:', error instanceof Error ? error.message : 'unknown');
    return jsonError('Admin change failed. No success was recorded.', 503);
  }
}
