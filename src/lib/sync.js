import { supabase } from './supabase'
import * as local from './localdb'

// Mesin sinkronisasi (spec §9). Dua arah:
//   flush() — kirim antrean outbox (perubahan lokal) ke Supabase.
//   pull()  — tarik data server ke cache lokal, "penulisan terakhir menang"
//             (last-write-wins) berdasarkan updated_at.
//
// id berupa uuid dibuat di klien, jadi baris bisa dibuat saat offline dan
// disisipkan apa adanya saat online.

// Tabel yang punya kolom updated_at → dipakai untuk LWW. menu_items tidak
// punya updated_at, jadi saat pull server dianggap sumber (kecuali ada op
// lokal yang belum terkirim untuk baris itu).
const LWW_TABLES = new Set(['menus', 'shopping_lists', 'shopping_list_items'])

export async function flush() {
  const ops = await local.outboxAll() // urut berdasarkan seq
  for (const op of ops) {
    const { table, type, payload } = op
    let error
    if (type === 'insert') {
      ;({ error } = await supabase.from(table).upsert(payload))
    } else if (type === 'update') {
      ;({ error } = await supabase.from(table).update(payload.patch).eq('id', payload.id))
    } else if (type === 'delete') {
      ;({ error } = await supabase.from(table).delete().eq('id', payload.id))
    }
    if (error) {
      // Berhenti; sisa op tetap di antrean untuk dicoba lagi nanti.
      return { ok: false, error: error.message, flushed: ops.indexOf(op) }
    }
    await local.outboxRemove(op.seq)
  }
  return { ok: true, flushed: ops.length }
}

export async function pull() {
  const ops = await local.outboxAll()
  // Baris dengan op lokal yang belum terkirim: versi lokal menang.
  const pending = new Set(ops.map((o) => o.payload?.id).filter(Boolean))

  for (const table of local.DATA_STORES) {
    const { data: serverRows, error } = await supabase.from(table).select('*')
    if (error) return { ok: false, error: error.message }

    const localRows = await local.getAll(table)
    const localMap = new Map(localRows.map((r) => [r.id, r]))
    const serverIds = new Set()

    for (const row of serverRows) {
      serverIds.add(row.id)
      if (pending.has(row.id)) continue
      const loc = localMap.get(row.id)
      if (!loc || !LWW_TABLES.has(table)) {
        await local.put(table, row)
        continue
      }
      // Last-write-wins berdasarkan updated_at.
      if (!loc.updated_at || (row.updated_at && row.updated_at >= loc.updated_at)) {
        await local.put(table, row)
      }
    }

    // Baris lokal yang sudah tidak ada di server (dan tidak pending) = telah
    // dihapus di perangkat lain → hapus juga di lokal.
    for (const loc of localRows) {
      if (!serverIds.has(loc.id) && !pending.has(loc.id)) {
        await local.del(table, loc.id)
      }
    }
  }

  await local.metaSet('lastPull', new Date().toISOString())
  return { ok: true }
}

// Sinkron penuh: kirim dulu lalu tarik. Tidak melakukan apa-apa saat offline.
export async function sync() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, offline: true }
  }
  const f = await flush()
  if (!f.ok) return f
  return pull()
}
