import * as repo from './repo'

// Operasi data untuk template menu (menus + menu_items) — local-first.
// Baca dari cache IndexedDB, tulis via outbox (lihat repo.js & sync.js).
// Tanda tangan fungsi sengaja dijaga sama agar layar tidak perlu berubah.

export async function listMenus() {
  const [menus, items] = await Promise.all([repo.all('menus'), repo.all('menu_items')])
  return menus
    .map((m) => ({
      ...m,
      itemCount: items.filter((i) => i.menu_id === m.id).length,
    }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export async function createMenu(userId, name) {
  const now = repo.nowIso()
  const row = {
    id: repo.newId(),
    user_id: userId,
    name,
    share_code: null,
    created_at: now,
    updated_at: now,
  }
  return repo.insertLocal('menus', row)
}

export async function getMenu(id) {
  const m = await repo.one('menus', id)
  if (!m) throw new Error('Menu tidak ditemukan')
  return m
}

export async function renameMenu(id, name) {
  await repo.updateLocal('menus', id, { name })
}

export async function deleteMenu(id) {
  await repo.deleteLocal('menus', id, [{ table: 'menu_items', fk: 'menu_id' }])
}

// Berbagi template (spec Bagian 8): isi share_code = kode acak agar menu
// bisa diimpor orang lain lewat import_shared_menu(). Mencabut = set null.
export async function enableShare(id) {
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  await repo.updateLocal('menus', id, { share_code: code })
  return code
}

export async function disableShare(id) {
  await repo.updateLocal('menus', id, { share_code: null })
}

export async function listMenuItems(menuId) {
  const items = await repo.all('menu_items')
  return items
    .filter((i) => i.menu_id === menuId)
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        String(a.created_at).localeCompare(String(b.created_at))
    )
}

export async function addMenuItem(menuId, item, sortOrder = 0) {
  const row = {
    id: repo.newId(),
    menu_id: menuId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    budget: item.budget,
    note: item.note,
    category: item.category,
    sort_order: sortOrder,
    created_at: repo.nowIso(),
  }
  return repo.insertLocal('menu_items', row)
}

export async function updateMenuItem(id, item) {
  await repo.updateLocal('menu_items', id, item)
}

export async function deleteMenuItem(id) {
  await repo.deleteLocal('menu_items', id)
}
