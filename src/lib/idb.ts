import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CarouselDocument, CarouselTemplate, LayerNode } from '../types/schema';
import { migrateV1ToV2 } from './migration';

// ─── Asset Embedding Helpers ──────────────────────────────────────────────────
// Converts blob: URLs → base64 data URLs so assets like logos persist across sessions.

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
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
  backups: {
    key: string;
    value: { id: string; rawV1Data: unknown; timestamp: string };
  };
}

const DB_NAME = 'dara-v2-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<DaraDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DaraDB>(DB_NAME, DB_VERSION, {
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
  }
  return dbPromise;
}

export async function saveDocumentToIDB(doc: CarouselDocument): Promise<void> {
  // Must clone synchronously BEFORE the first await — Immer revokes proxies after produce() yields
  const plain: CarouselDocument = JSON.parse(JSON.stringify(doc));
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
  const db = await getDB();
  const docs = await db.getAllFromIndex('carousels', 'by-updated');
  return docs.reverse(); // Most recent first
}

export async function deleteDocumentFromIDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('carousels', id);
}

export async function saveTemplateToIDB(template: CarouselTemplate): Promise<void> {
  // Must clone synchronously BEFORE the first await — Immer revokes proxies after produce() yields
  const plain: CarouselTemplate = JSON.parse(JSON.stringify(template));
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
  const db = await getDB();
  const tpls = await db.getAllFromIndex('templates', 'by-updated');
  return tpls.reverse();
}

export async function deleteTemplateFromIDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('templates', id);
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
