import { backupPayloadSchema } from "@/lib/domain";
import type { AppData } from "./types";

const DB_NAME = "ielts-tracker";
const DB_VERSION = 1;
const STORE_NAME = "state";
const STATE_KEY = "app-data";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function loadAppData(): Promise<AppData | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const raw = await idbRequest(store.get(STATE_KEY));
    if (raw == null) return null;

    const parsed = backupPayloadSchema.safeParse({
      version: 1,
      data: raw,
    });
    if (!parsed.success) {
      console.error("Stored app data failed validation:", parsed.error);
      return null;
    }
    return parsed.data.data;
  } finally {
    db.close();
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    await idbRequest(store.put(data, STATE_KEY));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Failed to save app data"));
      tx.onabort = () => reject(tx.error ?? new Error("Save aborted"));
    });
  } finally {
    db.close();
  }
}

export async function clearAppData(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    await idbRequest(store.delete(STATE_KEY));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Failed to clear app data"));
      tx.onabort = () => reject(tx.error ?? new Error("Clear aborted"));
    });
  } finally {
    db.close();
  }
}
