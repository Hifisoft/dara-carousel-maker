import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CarouselDocument, CarouselTemplate } from '../types/schema';
import { migrateV1ToV2 } from './migration';

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
  const db = await getDB();
  doc.updatedAt = new Date().toISOString();
  await db.put('carousels', doc);
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
  const db = await getDB();
  template.updatedAt = new Date().toISOString();
  await db.put('templates', template);
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
