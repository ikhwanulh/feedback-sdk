// =============================================================================
// Offline Telemetry Buffer (IndexedDB)
// Queues feedback and error payloads when client is disconnected and flushes on reconnect
// =============================================================================

const DB_NAME = 'feedback_sdk_offline_db';
const STORE_NAME = 'pending_payloads';
const DB_VERSION = 1;

export class OfflineStorage {
  private dbPromise: Promise<IDBDatabase | null>;

  constructor() {
    this.dbPromise = this.initDb();
  }

  private initDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async enqueue(payload: any): Promise<void> {
    const db = await this.dbPromise;
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.add({ payload, createdAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async dequeueAll(): Promise<any[]> {
    const db = await this.dbPromise;
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          store.clear();
          const items = (req.result || []).map((r: any) => r.payload);
          resolve(items);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  setupAutoFlush(flushFn: (payload: any) => Promise<boolean>): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', async () => {
      const pending = await this.dequeueAll();
      for (const payload of pending) {
        try {
          await flushFn(payload);
        } catch {
          // Re-enqueue if still failing
          await this.enqueue(payload);
        }
      }
    });
  }
}
