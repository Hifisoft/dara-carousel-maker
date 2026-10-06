import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { BrandProfile, CarouselDocument, CarouselTemplate } from '../types/schema';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const cloudEnabled = Boolean(url && key);

let client: SupabaseClient | null = null;
let workspaceId: string | null = null;
let userId: string | null = null;
const documentVersions = new Map<string, number>();
const writeQueues = new Map<string, Promise<void>>();

export function getCloudClient(): SupabaseClient {
  if (!url || !key) throw new Error('Cloud workspace is not configured.');
  if (!client) client = createClient(url, key);
  return client;
}

export function setCloudWorkspace(organisationId: string | null, memberId: string | null = null) {
  workspaceId = organisationId;
  userId = memberId;
  documentVersions.clear();
  writeQueues.clear();
}

export function getCloudWorkspace() {
  return workspaceId;
}

function requireWorkspace() {
  if (!workspaceId) throw new Error('Select an organisation first.');
  return workspaceId;
}

export async function cloudDocuments(): Promise<CarouselDocument[]> {
  const orgId = requireWorkspace();
  const { data, error } = await getCloudClient().from('carousel_documents')
    .select('id, data, version, updated_at').eq('organisation_id', orgId).order('updated_at', { ascending: false });
  if (error) throw error;
  documentVersions.clear();
  for (const row of data || []) documentVersions.set(`${orgId}:${row.id}`, row.version);
  return (data || []).map(row => ({ ...(row.data as CarouselDocument), updatedAt: row.updated_at }));
}

export async function cloudSaveDocument(doc: CarouselDocument, orgId: string): Promise<void> {
  if (workspaceId !== orgId) throw new Error('Workspace changed before save completed.');
  const queueKey = `${orgId}:${doc.id}`;
  const previous = writeQueues.get(queueKey) || Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    if (workspaceId !== orgId) throw new Error('Workspace changed before save completed.');
    const supabase = getCloudClient();
    const version = documentVersions.get(queueKey);
    const record = { data: { ...doc, workspaceId: orgId }, updated_at: new Date().toISOString(), last_editor: userId };
    if (version === undefined) {
      const { data, error } = await supabase.from('carousel_documents')
        .insert({ organisation_id: orgId, id: doc.id, version: 1, ...record })
        .select('version').single();
      if (error) throw error;
      documentVersions.set(queueKey, data.version);
    } else {
      const { data, error } = await supabase.from('carousel_documents')
        .update({ ...record, version: version + 1 })
        .eq('organisation_id', orgId).eq('id', doc.id).eq('version', version)
        .select('version').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('A teammate changed this carousel. Your edit was not saved. Refresh to see their version.');
      documentVersions.set(queueKey, data.version);
    }
  });
  writeQueues.set(queueKey, next);
  try { await next; } finally { if (writeQueues.get(queueKey) === next) writeQueues.delete(queueKey); }
}

export async function cloudDeleteDocument(id: string): Promise<void> {
  const orgId = requireWorkspace();
  await writeQueues.get(`${orgId}:${id}`);
  const { error } = await getCloudClient().from('carousel_documents').delete()
    .eq('organisation_id', orgId).eq('id', id);
  if (error) throw error;
  documentVersions.delete(`${orgId}:${id}`);
}

export async function cloudTemplates(): Promise<CarouselTemplate[]> {
  const { data, error } = await getCloudClient().from('carousel_templates')
    .select('data, updated_at').eq('organisation_id', requireWorkspace()).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({ ...(row.data as CarouselTemplate), updatedAt: row.updated_at }));
}

export async function cloudSaveTemplate(template: CarouselTemplate, orgId: string): Promise<void> {
  if (template.isSystemTemplate) return;
  if (workspaceId !== orgId) throw new Error('Workspace changed before save completed.');
  const { error } = await getCloudClient().from('carousel_templates').upsert({
    organisation_id: orgId, id: template.id, data: { ...template, workspaceId: orgId },
    updated_at: new Date().toISOString(), last_editor: userId
  }, { onConflict: 'organisation_id,id' });
  if (error) throw error;
}

export async function cloudDeleteTemplate(id: string): Promise<void> {
  const { error } = await getCloudClient().from('carousel_templates').delete()
    .eq('organisation_id', requireWorkspace()).eq('id', id);
  if (error) throw error;
}

export async function cloudBrandProfiles(): Promise<BrandProfile[]> {
  const { data, error } = await getCloudClient().from('brand_profiles').select('data, updated_at')
    .eq('organisation_id', requireWorkspace()).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({ ...(row.data as BrandProfile), updatedAt: row.updated_at }));
}

export async function cloudSaveBrandProfile(profile: BrandProfile, orgId: string): Promise<void> {
  if (workspaceId !== orgId) throw new Error('Workspace changed before save completed.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const { error } = await getCloudClient().from('brand_profiles').upsert({
      organisation_id: orgId, id: profile.id, data: { ...profile, workspaceId: orgId },
      updated_at: new Date().toISOString(), last_editor: userId,
    }, { onConflict: 'organisation_id,id' }).abortSignal(controller.signal);
    if (error) throw error;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Saving the brand profile timed out. Check your connection and confirm the brand_profiles Supabase migration is applied.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function cloudDeleteBrandProfile(id: string): Promise<void> {
  const { error } = await getCloudClient().from('brand_profiles').delete()
    .eq('organisation_id', requireWorkspace()).eq('id', id);
  if (error) throw error;
}

export async function authorisedFetch(path: string, options: RequestInit = {}) {
  if (!cloudEnabled) return fetch(path, options);
  const { data: { session } } = await getCloudClient().auth.getSession();
  if (!session) throw new Error('Sign in again to continue.');
  return fetch(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session.access_token}`, ...(workspaceId ? { 'X-Organisation-Id': workspaceId } : {}) }
  });
}
