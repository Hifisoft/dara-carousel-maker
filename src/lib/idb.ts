import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { BrandProfile, CarouselDocument, CarouselTemplate, LayerNode } from '../types/schema';
import { migrateV1ToV2 } from './migration';
import {
  getCloudWorkspace, cloudDocuments, cloudSaveDocument, cloudDeleteDocument,
  cloudTemplates, cloudSaveTemplate, cloudDeleteTemplate,
  cloudBrandProfiles, cloudSaveBrandProfile, cloudDeleteBrandProfile,
} from './cloud';

// ─── Asset Embedding Helpers ──────────────────────────────────────────────────
// Converts blob: URLs → base64 data URLs so assets like logos persist across sessions.

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read a local image asset for saving.'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return blobUrl; // Blob URL may be expired — return as-is
  }
}

async function embedLayerAssets(layer: LayerNode): Promise<LayerNode> {
  if (layer.type === 'image') {
    const l = { ...layer };
    if (l.url?.startsWith('blob:')) l.url = await blobUrlToDataUrl(l.url);
    if (l.localPreviewUrl?.startsWith('blob:')) l.localPreviewUrl = await blobUrlToDataUrl(l.localPreviewUrl);
    return l;
  }
  if (layer.type === 'logo') {
    const l = { ...layer };
    if (l.url?.startsWith('blob:')) l.url = await blobUrlToDataUrl(l.url);
    return l;
  }
  if (layer.type === 'image-slot') {
    const l = { ...layer };
    if (l.url?.startsWith('blob:')) l.url = await blobUrlToDataUrl(l.url);
    if (l.assignedMediaUrl?.startsWith('blob:')) l.assignedMediaUrl = await blobUrlToDataUrl(l.assignedMediaUrl);
    if (l.fallbackUrl?.startsWith('blob:')) l.fallbackUrl = await blobUrlToDataUrl(l.fallbackUrl);
    return l;
  }
  return layer;
}

async function embedTemplateAssets(template: CarouselTemplate): Promise<CarouselTemplate> {
  // Deep-clone to escape Immer's revoked proxy before async operations
  const plain: CarouselTemplate = JSON.parse(JSON.stringify(template));
  const layouts = await Promise.all(
    plain.layouts.map(async (layout) => ({
      ...layout,
      layers: await Promise.all(layout.layers.map(embedLayerAssets)),
    }))
  );
  return { ...plain, layouts };
}

async function embedDocumentAssets(doc: CarouselDocument): Promise<CarouselDocument> {
  // Deep-clone to escape Immer's revoked proxy before async operations
  const plain: CarouselDocument = JSON.parse(JSON.stringify(doc));
  const slides = await Promise.all(
    plain.slides.map(async (slide) => ({
      ...slide,
      layers: await Promise.all(slide.layers.map(embedLayerAssets)),
    }))
  );
  return { ...plain, slides };
}

interface DaraDB extends DBSchema {
  carousels: {
    key: string;
    value: CarouselDocument;
    indexes: { 'by-updated': string };
  };
  templates: {
    key: string;
    value: CarouselTemplate;
    indexes: { 'by-updated': string };
  };
  brandProfiles: {
    key: string;
    value: BrandProfile;
    indexes: { 'by-updated': string };
  };
  backups: {
    key: string;
    value: { id: string; rawV1Data: unknown; timestamp: string };
  };
}

const DB_NAME = 'dara-v2-db';
const BRAND_DB_NAME = 'dara-brand-profiles-db';

let dbPromise: Promise<IDBPDatabase<DaraDB>> | null = null;
let brandDbPromise: Promise<IDBPDatabase<BrandDB>> | null = null;
let activeDb: IDBPDatabase<DaraDB> | null = null;

interface BrandDB extends DBSchema {
  brandProfiles: {
    key: string;
    value: BrandProfile;
    indexes: { 'by-updated': string };
  };
}

function getDB() {
  if (!dbPromise) {
    let openingTimedOut = false;
    const opening = openDB<DaraDB>(DB_NAME, undefined, {
      blocked() {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dara-storage-error', {
            detail: 'Local storage is waiting for another DARA Studio tab to close. Refresh or close your other DARA tabs, then retry.',
          }));
        }
      },
      blocking() {
        activeDb?.close();
        activeDb = null;
        dbPromise = null;
      },
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('carousels')) {
          const carouselStore = db.createObjectStore('carousels', { keyPath: 'id' });
          carouselStore.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
          templateStore.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      },
    });
    dbPromise = new Promise<IDBPDatabase<DaraDB>>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        openingTimedOut = true;
        dbPromise = null;
        reject(new Error('Local storage did not open. Refresh or close other DARA Studio tabs, then retry.'));
      }, 15000);
      opening.then(db => {
        window.clearTimeout(timeout);
        if (openingTimedOut) {
          db.close();
          return;
        }
        activeDb = db;
        resolve(db);
      }, error => {
        window.clearTimeout(timeout);
        dbPromise = null;
        reject(error);
      });
    });
  }
  return dbPromise;
}

function getBrandDB() {
  if (!brandDbPromise) {
    brandDbPromise = openDB<BrandDB>(BRAND_DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore('brandProfiles', { keyPath: 'id' });
        store.createIndex('by-updated', 'updatedAt');
      },
    }).catch(error => {
      brandDbPromise = null;
      throw error;
    });
  }
  return brandDbPromise;
}

async function migrateLegacyBrandProfiles() {
  const legacyDb = await getDB();
  if (!legacyDb.objectStoreNames.contains('brandProfiles')) return;
  const legacyProfiles = await legacyDb.getAll('brandProfiles');
  if (!legacyProfiles.length) return;
  const brandDb = await getBrandDB();
  const tx = brandDb.transaction('brandProfiles', 'readwrite');
  for (const profile of legacyProfiles) {
    if (!await tx.store.get(profile.id)) await tx.store.put(profile);
  }
  await tx.done;
}

export async function saveDocumentToIDB(doc: CarouselDocument): Promise<void> {
  // Must clone synchronously BEFORE the first await — Immer revokes proxies after produce() yields
  const plain: CarouselDocument = JSON.parse(JSON.stringify(doc));
  const orgId = getCloudWorkspace();
  if (orgId) {
    try {
      await cloudSaveDocument(await embedDocumentAssets(plain), orgId);
    } catch (error) {
      window.dispatchEvent(new CustomEvent('dara-cloud-error', { detail: error instanceof Error ? error.message : 'Cloud save failed.' }));
      throw error;
    }
    return;
  }
  const db = await getDB();
  const embedded = await embedDocumentAssets(plain);
  const record = { ...embedded, updatedAt: new Date().toISOString() };
  await db.put('carousels', record);
}

export async function getDocumentFromIDB(id: string): Promise<CarouselDocument | undefined> {
  const db = await getDB();
  return db.get('carousels', id);
}

export async function getAllDocumentsFromIDB(): Promise<CarouselDocument[]> {
  if (getCloudWorkspace()) return cloudDocuments();
  return getLocalDocuments();
}

export async function getLocalDocuments(): Promise<CarouselDocument[]> {
  const db = await getDB();
  const docs = await db.getAllFromIndex('carousels', 'by-updated');
  return docs.reverse(); // Most recent first
}

export async function deleteDocumentFromIDB(id: string): Promise<void> {
  if (getCloudWorkspace()) return cloudDeleteDocument(id);
  const db = await getDB();
  await db.delete('carousels', id);
}

export async function saveTemplateToIDB(template: CarouselTemplate): Promise<void> {
  // Must clone synchronously BEFORE the first await — Immer revokes proxies after produce() yields
  const plain: CarouselTemplate = JSON.parse(JSON.stringify(template));
  const orgId = getCloudWorkspace();
  if (orgId) {
    try {
      await cloudSaveTemplate(await embedTemplateAssets(plain), orgId);
    } catch (error) {
      window.dispatchEvent(new CustomEvent('dara-cloud-error', { detail: error instanceof Error ? error.message : 'Template save failed.' }));
      throw error;
    }
    return;
  }
  const db = await getDB();
  const embedded = await embedTemplateAssets(plain);
  const record = { ...embedded, updatedAt: new Date().toISOString() };
  await db.put('templates', record);
}

export async function getTemplateFromIDB(id: string): Promise<CarouselTemplate | undefined> {
  const db = await getDB();
  return db.get('templates', id);
}

export async function getAllTemplatesFromIDB(): Promise<CarouselTemplate[]> {
  if (getCloudWorkspace()) return cloudTemplates();
  const db = await getDB();
  const tpls = await db.getAllFromIndex('templates', 'by-updated');
  return tpls.reverse();
}

export async function deleteTemplateFromIDB(id: string): Promise<void> {
  if (getCloudWorkspace()) return cloudDeleteTemplate(id);
  const db = await getDB();
  await db.delete('templates', id);
}

export async function saveBrandProfileToIDB(profile: BrandProfile): Promise<void> {
  const plain = JSON.parse(JSON.stringify(profile)) as BrandProfile;
  const orgId = getCloudWorkspace();
  if (orgId) {
    await cloudSaveBrandProfile(plain, orgId);
    return;
  }
  await migrateLegacyBrandProfiles();
  const db = await getBrandDB();
  await db.put('brandProfiles', { ...plain, updatedAt: new Date().toISOString() });
}

export async function getAllBrandProfilesFromIDB(): Promise<BrandProfile[]> {
  if (getCloudWorkspace()) return cloudBrandProfiles();
  await migrateLegacyBrandProfiles();
  const db = await getBrandDB();
  return (await db.getAllFromIndex('brandProfiles', 'by-updated')).reverse();
}

export async function deleteBrandProfileFromIDB(id: string): Promise<void> {
  if (getCloudWorkspace()) return cloudDeleteBrandProfile(id);
  await migrateLegacyBrandProfiles();
  const db = await getBrandDB();
  await db.delete('brandProfiles', id);
}

export async function importLegacyLocalStorageToIDB(): Promise<CarouselDocument[]> {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem('dara_state_v1') || localStorage.getItem('dara_posts');
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const postsArray = Array.isArray(parsed) ? parsed : (parsed.posts || []);
    
    const migratedDocs: CarouselDocument[] = [];
    const db = await getDB();

    for (const item of postsArray) {
      const doc = migrateV1ToV2(item);
      await db.put('carousels', doc);
      await db.put('backups', {
        id: doc.id,
        rawV1Data: item,
        timestamp: new Date().toISOString()
      });
      migratedDocs.push(doc);
    }

    return migratedDocs;
  } catch (err) {
    console.error('Legacy LocalStorage migration failed:', err);
    return [];
  }
}
