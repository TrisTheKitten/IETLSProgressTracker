import { appDataSchema, type AppData } from "./types";
import { coerceAppData } from "./normalize";

const DB_NAME = "ielts-tracker";
const DB_VERSION = 1;
const STORE_NAME = "state";
const STATE_KEY = "app-data";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

  return dbPromise;
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    request.onsuccess = () => resolve(request.result);
  });
}

function waitForTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function loadAppData(): Promise<AppData | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const raw = await idbRequest(tx.objectStore(STORE_NAME).get(STATE_KEY));
  await waitForTransaction(tx);
  if (raw == null) return null;

  try {
    return coerceAppData(raw);
  } catch (error) {
    console.error("Stored app data failed validation:", error);
    return null;
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  const parsed = appDataSchema.parse(data);
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await idbRequest(store.put(parsed, STATE_KEY));
  await waitForTransaction(tx);
}
