import { createAdminClient, createContextClient } from '@supabase/server/core';
import type { NextRequest } from 'next/server';

export async function authenticatedUser(request: NextRequest) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) return null;
  const { data, error } = await createContextClient().auth.getUser(bearer);
  return error ? null : data.user;
}

export function adminClient() {
  return createAdminClient();
}

export async function requirePlatformAdmin(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return { user: null, client: null, role: null, status: 401 as const };
  const client = adminClient();
  const { data, error } = await client.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (error) return { user, client, role: null, status: 503 as const };
  if (!data || data.role !== 'super_admin') return { user, client, role: data?.role || null, status: 403 as const };
  return { user, client, role: data.role as string, status: 200 as const };
}

export async function aiPlatformControl(request: NextRequest, task: 'copy' | 'review' | 'visual_direction' | 'image') {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return { enabled: process.env.NODE_ENV !== 'production', model: null as string | null };
  const client = adminClient();
  const [route, flag] = await Promise.all([
    client.from('ai_route_config').select('primary_model,enabled').eq('task_key', task).maybeSingle(),
    task === 'image' || task === 'visual_direction'
      ? client.from('feature_flags').select('enabled').eq('flag_key', 'aiCreativeDirector').maybeSingle()
      : Promise.resolve({ data: { enabled: true }, error: null }),
  ]);
  if (route.error || flag.error) throw route.error || flag.error;
  return { enabled: route.data?.enabled !== false && flag.data?.enabled !== false, model: route.data?.primary_model || null };
}

export async function platformFeatureEnabled(flagKey: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return process.env.NODE_ENV !== 'production';
  const { data, error } = await adminClient().from('feature_flags').select('enabled').eq('flag_key', flagKey).maybeSingle();
  if (error) throw error;
  return data?.enabled === true;
}

export async function recordAIUsage(input: {
  request: NextRequest; task: string; status: 'succeeded' | 'failed' | 'rejected'; model?: string;
  startedAt: number; error?: string;
}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  try {
    const user = await authenticatedUser(input.request);
    const organisationId = input.request.headers.get('x-organisation-id');
    const model = input.model || null;
    const provider = model?.includes(':') ? model.split(':')[0] : model?.startsWith('gemini') ? 'google' : null;
    const db = adminClient();
    const pricing = model ? await db.from('ai_operation_costs').select('cost_per_operation,pricing_version')
      .eq('model', model).eq('task_key', input.task).order('effective_from', { ascending: false }).limit(1).maybeSingle() : { data: null };
    await db.from('ai_usage_events').insert({
      user_id: user?.id || null, organisation_id: organisationId || null, task_type: input.task, provider, model,
      status: input.status, estimated_provider_cost: pricing.data?.cost_per_operation ?? null,
      pricing_version: pricing.data?.pricing_version ?? null, latency_ms: Math.max(0, Date.now() - input.startedAt),
      error_summary: input.error?.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]').slice(0, 300) || null,
    });
  } catch (error) {
    console.error('[AI telemetry] Could not record usage:', error instanceof Error ? error.message : 'unknown');
  }
}

export async function workspaceServiceStatus(request: NextRequest, action: 'image' | 'copy' | 'instagram') {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return process.env.NODE_ENV === 'production' ? 503 : 200;
  const user = await authenticatedUser(request);
  const organisationId = request.headers.get('x-organisation-id');
  if (!user || !organisationId) return 401;
  const admin = adminClient();
  const { data } = await admin.from('organisation_members').select('user_id')
    .eq('organisation_id', organisationId).eq('user_id', user.id).maybeSingle();
  if (!data) return 403;
  const limits = { image: 12, copy: 30, instagram: 20 };
  const { data: allowed, error } = await admin.rpc('reserve_workspace_service', {
    actor: user.id, org_id: organisationId, service_action: action, hourly_limit: limits[action]
  });
  if (error) throw error;
  return allowed ? 200 : 429;
}
