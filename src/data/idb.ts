const DB_NAME = 'zindori-map';
const DB_VERSION = 1;

export const STORES = {
  meta: 'meta',
  cells: 'cells',
  explorations: 'explorations',
  achievements: 'achievements',
  missions: 'missions',
  outbox: 'outbox',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.meta)) db.createObjectStore(STORES.meta);
      if (!db.objectStoreNames.contains(STORES.cells))
        db.createObjectStore(STORES.cells, { keyPath: 'cell' });
      if (!db.objectStoreNames.contains(STORES.explorations))
        db.createObjectStore(STORES.explorations, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.achievements))
        db.createObjectStore(STORES.achievements, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.missions))
        db.createObjectStore(STORES.missions, { keyPath: 'date' });
      if (!db.objectStoreNames.contains(STORES.outbox))
        db.createObjectStore(STORES.outbox, { keyPath: 'seq', autoIncrement: true });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = fn(tx.objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export const idb = {
  get: <T>(store: StoreName, key: IDBValidKey) => run<T | undefined>(store, 'readonly', (s) => s.get(key)),
  getAll: <T>(store: StoreName) => run<T[]>(store, 'readonly', (s) => s.getAll()),
  /** keyPath を持つストアでは key を省略する。 */
  put: <T>(store: StoreName, value: T, key?: IDBValidKey) =>
    run(store, 'readwrite', (s) => (key === undefined ? s.put(value) : s.put(value, key))),
  delete: (store: StoreName, key: IDBValidKey) =>
    run(store, 'readwrite', (s) => s.delete(key)),
  clear: (store: StoreName) => run(store, 'readwrite', (s) => s.clear()),

  /** 複数レコードを 1 トランザクションでまとめて書き込む。 */
  putMany: async <T>(store: StoreName, values: readonly T[]): Promise<void> => {
    if (values.length === 0) return;
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      for (const value of values) objectStore.put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },
};
