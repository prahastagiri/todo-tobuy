import * as repo from './repo'
import { listMenuItems, createMenu, addMenuItem } from './menus'

// Operasi data untuk daftar belanja (shopping_lists + shopping_list_items)
// — local-first (lihat repo.js & sync.js). Item daftar adalah SALINAN BEBAS
// (prinsip inti #1); riwayat = daftar berstatus 'done' (prinsip #4).

export async function listActiveLists() {
  const [lists, items] = await Promise.all([
    repo.all('shopping_lists'),
    repo.all('shopping_list_items'),
  ])
  return lists
    .filter((l) => l.status === 'draft' || l.status === 'shopping')
    .map((l) => ({ ...l, itemCount: items.filter((i) => i.list_id === l.id).length }))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
}

export async function listDoneLists() {
  const [lists, items] = await Promise.all([
    repo.all('shopping_lists'),
    repo.all('shopping_list_items'),
  ])
  return lists
    .filter((l) => l.status === 'done')
    .map((l) => ({ ...l, itemCount: items.filter((i) => i.list_id === l.id).length }))
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
}

export async function createList(userId, name) {
  const now = repo.nowIso()
  const row = {
    id: repo.newId(),
    user_id: userId,
    name,
    status: 'draft',
    created_at: now,
    updated_at: now,
    completed_at: null,
  }
  return repo.insertLocal('shopping_lists', row)
}

export async function getList(id) {
  const l = await repo.one('shopping_lists', id)
  if (!l) throw new Error('Daftar tidak ditemukan')
  return l
}

export async function renameList(id, name) {
  await repo.updateLocal('shopping_lists', id, { name })
}

export async function deleteList(id) {
  await repo.deleteLocal('shopping_lists', id, [
    { table: 'shopping_list_items', fk: 'list_id' },
  ])
}

// Ubah status daftar. Saat 'done', isi completed_at (spec §4.5).
export async function setListStatus(id, status) {
  const patch = { status }
  if (status === 'done') patch.completed_at = repo.nowIso()
  await repo.updateLocal('shopping_lists', id, patch)
}

export async function listItems(listId) {
  const items = await repo.all('shopping_list_items')
  return items
    .filter((i) => i.list_id === listId)
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        String(a.created_at).localeCompare(String(b.created_at))
    )
}

function newItemRow(listId, item, sortOrder, extra = {}) {
  const now = repo.nowIso()
  return {
    id: repo.newId(),
    list_id: listId,
    source_menu_id: extra.source_menu_id ?? null,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    budget: item.budget,
    note: item.note,
    category: item.category,
    status: extra.status ?? 'need',
    sort_order: sortOrder,
    created_at: now,
    updated_at: now,
  }
}

export async function addItem(listId, item, sortOrder = 0) {
  return repo.insertLocal('shopping_list_items', newItemRow(listId, item, sortOrder))
}

export async function updateItem(id, item) {
  await repo.updateLocal('shopping_list_items', id, item)
}

export async function setItemStatus(id, status) {
  await repo.updateLocal('shopping_list_items', id, { status })
}

export async function deleteItem(id) {
  await repo.deleteLocal('shopping_list_items', id)
}

// Kunci pembanding item kembar: nama + satuan (tidak sensitif huruf/spasi).
function itemKey(it) {
  return (it.name || '').trim().toLowerCase() + '|' + (it.unit || '').trim().toLowerCase()
}

// Deteksi item menu yang sudah ada di daftar (nama+satuan sama) sebelum
// menyalin — agar UI bisa menawarkan menggabungkan (spec §4.1).
export async function findMenuDuplicates(listId, menuId) {
  const [menuItems, existing] = await Promise.all([
    listMenuItems(menuId),
    listItems(listId),
  ])
  const existKeys = new Set(existing.map(itemKey))
  const duplicates = menuItems.filter((mi) => existKeys.has(itemKey(mi)))
  return { menuItems, existing, duplicates }
}

// Menambahkan template ke daftar = MENYALIN item (spec §4.1). Bila merge =
// true, item kembar (nama+satuan sama) menambah jumlah ke item yang ada,
// bukan membuat baris kedua.
export async function addMenuToList(listId, menuId, startSort = 0, merge = false) {
  const { menuItems, existing } = await findMenuDuplicates(listId, menuId)
  const existMap = new Map(existing.map((e) => [itemKey(e), e]))
  let sort = startSort
  let inserted = 0
  let merged = 0

  for (const mi of menuItems) {
    const match = merge ? existMap.get(itemKey(mi)) : null
    if (match) {
      const patch = {}
      if (mi.quantity != null || match.quantity != null) {
        patch.quantity = (Number(match.quantity) || 0) + (Number(mi.quantity) || 0)
      }
      if (mi.budget != null || match.budget != null) {
        patch.budget = (Number(match.budget) || 0) + (Number(mi.budget) || 0)
      }
      if (match.status === 'have') patch.status = 'need'
      await updateItem(match.id, patch)
      merged++
    } else {
      await repo.insertLocal(
        'shopping_list_items',
        newItemRow(listId, mi, sort++, { source_menu_id: menuId })
      )
      inserted++
    }
  }
  return { inserted, merged }
}

// "Belanja lagi": salin daftar selesai ke daftar draft baru, semua di-reset
// ke 'need' (alur-layar.md Bagian 7).
export async function duplicateListToDraft(userId, srcListId, name) {
  const items = await listItems(srcListId)
  const newList = await createList(userId, name)
  let sort = 0
  for (const it of items) {
    await repo.insertLocal(
      'shopping_list_items',
      newItemRow(newList.id, it, sort++, { source_menu_id: it.source_menu_id })
    )
  }
  return newList
}

// "Simpan sebagai template": buat menu baru dari item daftar, kecualikan
// item 'have' (spec §4.7). Selalu tindakan eksplisit pengguna.
export async function saveListAsMenu(userId, listId, name) {
  const items = (await listItems(listId)).filter((it) => it.status !== 'have')
  const menu = await createMenu(userId, name)
  let sort = 0
  for (const it of items) {
    await addMenuItem(menu.id, it, sort++)
  }
  return menu
}
