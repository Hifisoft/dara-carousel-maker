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
