import type { ClinicalCase, EvaluationResult } from '../../types';

export interface OutboxEvaluationItem {
  id: string;
  case_id: string;
  case_title: string;
  respuesta_estudiante: string;
  fase_numero?: number;
  user_email: string;
  created_at: string;
  status: 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED';
  error?: string;
  retry_count: number;
  tipo: 'single_turn' | 'phase';
}

const DB_NAME = 'ateneo_offline_v1';
const DB_VERSION = 1;

/**
 * Base de datos IndexedDB nativa y tipada para funcionamiento offline hospitalario.
 * Proporciona caché local de casos clínicos, buffer de evaluaciones pendientes (Outbox Pattern)
 * y persistencia segura con degradación transparente a memoria en entornos de prueba.
 */
class AteneoOfflineDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryStores = {
    cases: new Map<string, any>(),
    outbox: new Map<string, OutboxEvaluationItem>(),
    evaluations: new Map<string, any>(),
  };

  private isIndexedDBAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.isIndexedDBAvailable()) {
      throw new Error('IndexedDB no está disponible en este entorno.');
    }

    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('cases')) {
          db.createObjectStore('cases', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' });
          outboxStore.createIndex('status', 'status', { unique: false });
          outboxStore.createIndex('case_id', 'case_id', { unique: false });
        }

        if (!db.objectStoreNames.contains('evaluations')) {
          const evalStore = db.createObjectStore('evaluations', { keyPath: 'id' });
          evalStore.createIndex('case_id', 'case_id', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // --- 1. Gestión de Casos Clínicos ---
  public async saveCases(cases: ClinicalCase[]): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      cases.forEach((c) => this.memoryStores.cases.set(c.id, c));
      return;
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction('cases', 'readwrite');
      const store = tx.objectStore('cases');

      for (const caso of cases) {
        store.put(caso);
      }

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      cases.forEach((c) => this.memoryStores.cases.set(c.id, c));
    }
  }

  public async getAllCases(): Promise<ClinicalCase[]> {
    if (!this.isIndexedDBAvailable()) {
      return Array.from(this.memoryStores.cases.values());
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction('cases', 'readonly');
      const store = tx.objectStore('cases');
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return Array.from(this.memoryStores.cases.values());
    }
  }

  public async getCase(id: string): Promise<ClinicalCase | null> {
    if (!this.isIndexedDBAvailable()) {
      return this.memoryStores.cases.get(id) || null;
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction('cases', 'readonly');
      const store = tx.objectStore('cases');
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return this.memoryStores.cases.get(id) || null;
    }
  }

  // --- 2. Buffer Outbox de Evaluaciones Pendientes ---
  public async queueEvaluation(item: Omit<OutboxEvaluationItem, 'id' | 'created_at' | 'status' | 'retry_count'>): Promise<string> {
    const id = `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullItem: OutboxEvaluationItem = {
      ...item,
      id,
      created_at: new Date().toISOString(),
      status: 'PENDING_SYNC',
      retry_count: 0,
    };

    if (!this.isIndexedDBAvailable()) {
      this.memoryStores.outbox.set(id, fullItem);
      return id;
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction('outbox', 'readwrite');
      const store = tx.objectStore('outbox');
      store.put(fullItem);

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(id);
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.memoryStores.outbox.set(id, fullItem);
      return id;
    }
  }

  public async getPendingEvaluations(): Promise<OutboxEvaluationItem[]> {
    if (!this.isIndexedDBAvailable()) {
      return Array.from(this.memoryStores.outbox.values()).filter((i) => i.status === 'PENDING_SYNC');
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction('outbox', 'readonly');
      const store = tx.objectStore('outbox');
      const index = store.index('status');
      const request = index.getAll('PENDING_SYNC');

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return Array.from(this.memoryStores.outbox.values()).filter((i) => i.status === 'PENDING_SYNC');
    }
  }

  public async getPendingCount(): Promise<number> {
    const pending = await this.getPendingEvaluations();
    return pending.length;
  }

  public async updateOutboxStatus(id: string, status: OutboxEvaluationItem['status'], error?: string): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      const item = this.memoryStores.outbox.get(id);
      if (item) {
        item.status = status;
        if (error) item.error = error;
        if (status === 'FAILED') item.retry_count++;
      }
      return;
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction('outbox', 'readwrite');
      const store = tx.objectStore('outbox');
      const request = store.get(id);

      request.onsuccess = () => {
        const item: OutboxEvaluationItem = request.result;
        if (item) {
          item.status = status;
          if (error) item.error = error;
          if (status === 'FAILED') item.retry_count++;
          store.put(item);
        }
      };

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      const item = this.memoryStores.outbox.get(id);
      if (item) {
        item.status = status;
        if (error) item.error = error;
      }
    }
  }

  public async clearSynced(): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      for (const [id, item] of this.memoryStores.outbox.entries()) {
        if (item.status === 'SYNCED') {
          this.memoryStores.outbox.delete(id);
        }
      }
      return;
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction('outbox', 'readwrite');
      const store = tx.objectStore('outbox');
      const index = store.index('status');
      const request = index.getAllKeys('SYNCED');

      request.onsuccess = () => {
        const keys = request.result;
        keys.forEach((key) => store.delete(key));
      };

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Degradación silenciosa
    }
  }

  // --- 3. Caché de Resultados Evaluativos ---
  public async cacheEvaluationResult(caseId: string, result: EvaluationResult): Promise<void> {
    const record = { id: caseId, case_id: caseId, result, cached_at: new Date().toISOString() };
    if (!this.isIndexedDBAvailable()) {
      this.memoryStores.evaluations.set(caseId, record);
      return;
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction('evaluations', 'readwrite');
      const store = tx.objectStore('evaluations');
      store.put(record);

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.memoryStores.evaluations.set(caseId, record);
    }
  }

  public async getCachedResult(caseId: string): Promise<EvaluationResult | null> {
    if (!this.isIndexedDBAvailable()) {
      return this.memoryStores.evaluations.get(caseId)?.result || null;
    }

    try {
      const db = await this.getDB();
      const tx = db.transaction('evaluations', 'readonly');
      const store = tx.objectStore('evaluations');
      const request = store.get(caseId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result?.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return this.memoryStores.evaluations.get(caseId)?.result || null;
    }
  }
}

export const offlineDb = new AteneoOfflineDatabase();
export default offlineDb;
