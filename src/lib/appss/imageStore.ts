"use client";
// AppSS — ユーザー画像の IndexedDB 保存。
// スクショ画像はサーバーへ送信せず、この端末のブラウザ内にのみ保持する。
// プロジェクト JSON からは "idb:<id>" 形式で参照する。

const DB_NAME = "code-tweet-appss";
const DB_VERSION = 1;
const STORE = "images";

export const IDB_PREFIX = "idb:";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB を開けませんでした"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB の操作に失敗しました"));
    });
  } finally {
    db.close();
  }
}

async function hashBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

// 画像を保存し "idb:<id>" 参照を返す。同一内容はハッシュで重複排除される。
export async function putImage(blob: Blob): Promise<string> {
  const id = await hashBlob(blob);
  await withStore("readwrite", (store) => store.put(blob, id));
  return `${IDB_PREFIX}${id}`;
}

export async function getImage(ref: string): Promise<Blob | null> {
  if (!ref.startsWith(IDB_PREFIX)) return null;
  const id = ref.slice(IDB_PREFIX.length);
  const result = await withStore<Blob | undefined>("readonly", (store) => store.get(id));
  return result ?? null;
}

export async function deleteImage(ref: string): Promise<void> {
  if (!ref.startsWith(IDB_PREFIX)) return;
  const id = ref.slice(IDB_PREFIX.length);
  await withStore("readwrite", (store) => store.delete(id));
}

export async function listIds(): Promise<string[]> {
  const keys = await withStore<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
  return keys.map((k) => String(k));
}
