// Penyimpanan lokal berbasis IndexedDB untuk mode offline (spec §9).
// Menyimpan cermin (mirror) tabel yang dipakai aplikasi + antrean "outbox"
// berisi perubahan yang belum terkirim ke Supabase.
//
// Tahap 1: wrapper mandiri. Repository & layar dimigrasikan di tahap
// berikutnya.

const DB_NAME = 'todo-belanja'
const DB_VERSION = 1

// Store data (mirror tabel), berkunci 'id' (uuid).
export const DATA_STORES = [
  'menus',
  'menu_items',
  'shopping_lists',
  'shopping_list_items',
]

let dbPromise = null

export function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const s of DATA_STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' })
      }
      // Antrean perubahan keluar; kunci auto-increment agar urut.
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true })
      }
      // Penyimpanan kunci-nilai kecil (mis. waktu sinkron terakhir).
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(db, store, mode) {
  return db.transaction(store, mode).objectStore(store)
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function get(store, key) {
  const db = await openDB()
  return wrap(tx(db, store, 'readonly').get(key))
}

export async function getAll(store) {
  const db = await openDB()
  return wrap(tx(db, store, 'readonly').getAll())
}

export async function put(store, value) {
  const db = await openDB()
  return wrap(tx(db, store, 'readwrite').put(value))
}

export async function bulkPut(store, values) {
  const db = await openDB()
  const t = db.transaction(store, 'readwrite')
  const os = t.objectStore(store)
  for (const v of values) os.put(v)
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function del(store, key) {
  const db = await openDB()
  return wrap(tx(db, store, 'readwrite').delete(key))
}

export async function clear(store) {
  const db = await openDB()
  return wrap(tx(db, store, 'readwrite').clear())
}

// --- Outbox ---------------------------------------------------------------
// Sebuah op: { table, type: 'insert'|'update'|'delete', payload, ts }
//   insert  -> payload = baris lengkap (dengan id, updated_at, dll)
//   update  -> payload = { id, patch }
//   delete  -> payload = { id }

export async function enqueue(op) {
  return put('outbox', { ...op, ts: op.ts ?? new Date().toISOString() })
}

export async function outboxAll() {
  return getAll('outbox')
}

export async function outboxRemove(seq) {
  return del('outbox', seq)
}

export async function outboxCount() {
  const all = await outboxAll()
  return all.length
}

// --- Meta -----------------------------------------------------------------
export async function metaGet(key) {
  const row = await get('meta', key)
  return row?.value
}

export async function metaSet(key, value) {
  return put('meta', { key, value })
}
