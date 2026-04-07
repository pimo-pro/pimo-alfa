/**
 * projectsIndexedDbStore — camada de persistência via IndexedDB.
 *
 * API genérica (sem imports de tipos de domínio → zero dependências circulares).
 * A tipagem concreta é aplicada pela camada acima (projectsOfflineStore.ts).
 *
 * Object stores:
 *   "projects"  — keyPath: "id"  (OfflineProjectRecord)
 *   "syncQueue" — keyPath: "id"  (SyncQueueEntry)
 */

const DB_NAME = "pimo-projects-db";
const DB_VERSION = 1;

export const IDB_STORE_PROJECTS = "projects";
export const IDB_STORE_QUEUE = "syncQueue";

let _db: IDBDatabase | null = null;
let _openPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  if (_openPromise) return _openPromise;

  _openPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      _openPromise = null;
      reject(new Error("IndexedDB não suportado neste ambiente"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_PROJECTS)) {
        db.createObjectStore(IDB_STORE_PROJECTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(IDB_STORE_QUEUE)) {
        db.createObjectStore(IDB_STORE_QUEUE, { keyPath: "id" });
      }
    };

    req.onsuccess = () => {
      _db = req.result;
      _db.onclose = () => {
        _db = null;
        _openPromise = null;
      };
      resolve(_db);
    };

    req.onerror = () => {
      _openPromise = null;
      reject(req.error ?? new Error("Falha ao abrir IndexedDB"));
    };
  });

  return _openPromise;
}

/** Aguarda o fim de uma transacção IDB (oncomplete / onerror / onabort). */
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction error"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB transaction aborted"));
  });
}

/**
 * Devolve todos os registos de um object store como array de unknown.
 * A tipagem concreta é responsabilidade da camada acima.
 */
export async function idbGetAll(storeName: string): Promise<unknown[]> {
  const db = await openDb();
  return new Promise<unknown[]>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve((req.result as unknown[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Substitui TODOS os registos de um object store (clear + put all) numa
 * única transacção atómica. Garante consistência total.
 */
export async function idbSaveAll(storeName: string, items: unknown[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  store.clear();
  items.forEach((item) => store.put(item));
  return txDone(tx);
}

/** Guarda (upsert) um único registo num object store. */
export async function idbPut(storeName: string, item: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(item);
  return txDone(tx);
}

/** Remove um registo por chave primária. */
export async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(key);
  return txDone(tx);
}

/** Limpa todos os registos de ambos os object stores. */
export async function idbClearAll(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([IDB_STORE_PROJECTS, IDB_STORE_QUEUE], "readwrite");
  tx.objectStore(IDB_STORE_PROJECTS).clear();
  tx.objectStore(IDB_STORE_QUEUE).clear();
  return txDone(tx);
}
