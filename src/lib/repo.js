import * as local from './localdb'
import { flush } from './sync'

// Lapisan repository "local-first": baca dari cache IndexedDB, tulis ke cache
// + antrean outbox, lalu dorong ke server bila online. Ini yang membuat
// aplikasi bisa dipakai (baca & tulis) saat offline (spec §9).

// Tabel yang punya kolom updated_at (untuk stempel LWW). menu_items tidak
// punya, jadi jangan menambahkan updated_at ke operasinya.
const HAS_UPDATED_AT = new Set(['menus', 'shopping_lists', 'shopping_list_items'])

export function newId() {
  return crypto.randomUUID()
}
export function nowIso() {
  return new Date().toISOString()
}

// Dorong antrean ke server tanpa menunggu (fire-and-forget). Diam saat
// offline/gagal — akan dicoba lagi saat sinkron berikutnya.
let pushing = false
export async function kickPush() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  if (pushing) return
  pushing = true
  try {
    await flush()
  } catch {
    // abaikan; dicoba lagi nanti
  } finally {
    pushing = false
  }
}

export async function insertLocal(table, row) {
  await local.put(table, row)
  await local.enqueue({ table, type: 'insert', payload: row })
  kickPush()
  return row
}

export async function updateLocal(table, id, patch) {
  const finalPatch = HAS_UPDATED_AT.has(table)
    ? { ...patch, updated_at: nowIso() }
    : { ...patch }
  const existing = await local.get(table, id)
  const merged = { ...(existing || { id }), ...finalPatch }
  await local.put(table, merged)
  await local.enqueue({ table, type: 'update', payload: { id, patch: finalPatch } })
  kickPush()
  return merged
}

// Hapus baris + baris anak di lokal (server meng-cascade sendiri, jadi hanya
// op hapus induk yang diantre). cascades: [{ table, fk }]
export async function deleteLocal(table, id, cascades = []) {
  await local.del(table, id)
  for (const c of cascades) {
    const rows = await local.getAll(c.table)
    for (const r of rows) if (r[c.fk] === id) await local.del(c.table, r.id)
  }
  await local.enqueue({ table, type: 'delete', payload: { id } })
  kickPush()
}

export async function all(table) {
  return local.getAll(table)
}
export async function one(table, id) {
  return local.get(table, id)
}
