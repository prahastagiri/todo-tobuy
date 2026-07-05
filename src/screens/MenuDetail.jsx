import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getMenu,
  renameMenu,
  deleteMenu,
  listMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../lib/menus'
import { groupByCategory } from '../lib/constants'
import ItemForm from '../components/ItemForm'
import ItemRow from '../components/ItemRow'
import ShareMenu from '../components/ShareMenu'

// Detail / Edit Menu (alur-layar.md Bagian 9). Mengelola menu_items sebuah
// template. Perubahan di sini TIDAK menyentuh daftar belanja mana pun.
export default function MenuDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(null)
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | item
  const [sharing, setSharing] = useState(false)

  async function load() {
    try {
      const [m, its] = await Promise.all([getMenu(id), listMenuItems(id)])
      setMenu(m)
      setName(m.name)
      setItems(its)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function saveName() {
    if (!menu || name.trim() === menu.name || !name.trim()) {
      setName(menu?.name ?? '')
      return
    }
    try {
      await renameMenu(id, name.trim())
      setMenu({ ...menu, name: name.trim() })
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleSaveItem(payload) {
    try {
      if (editing === 'new') {
        await addMenuItem(id, payload, items.length)
      } else {
        await updateMenuItem(editing.id, payload)
      }
      setEditing(null)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDeleteItem(item) {
    if (!confirm(`Hapus "${item.name}" dari menu ini?`)) return
    try {
      await deleteMenuItem(item.id)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDeleteMenu() {
    if (!confirm(`Hapus menu "${menu.name}" beserta semua bahannya?`)) return
    try {
      await deleteMenu(id)
      navigate('/menu')
    } catch (e) {
      setError(e.message)
    }
  }

  if (!menu) {
    return <p className="muted">{error || 'Memuat…'}</p>
  }

  // Kelompokkan per kategori, urut sesuai CATEGORIES lalu sort_order.
  const groups = groupByCategory(items)

  return (
    <div>
      <label className="field">
        <span className="field__label">Nama menu</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
        />
      </label>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {items.length === 0 ? (
        <div className="empty">Belum ada bahan. Tambahkan di bawah.</div>
      ) : (
        groups.map(([cat, its]) => (
          <div key={cat || 'lainnya'} style={{ marginTop: 8 }}>
            <div className="group-header">{cat || 'Tanpa kategori'}</div>
            {its.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                actions={
                  <>
                    <button
                      className="btn btn--icon"
                      onClick={() => setEditing(item)}
                      title="Ubah"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn--icon"
                      onClick={() => handleDeleteItem(item)}
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  </>
                }
              />
            ))}
          </div>
        ))
      )}

      <button
        className="btn btn--primary btn--block"
        style={{ marginTop: 16 }}
        onClick={() => setEditing('new')}
      >
        + Tambah bahan
      </button>

      <button
        className="btn btn--block"
        style={{ marginTop: 12 }}
        onClick={() => setSharing(true)}
      >
        🔗 {menu.share_code ? 'Kelola berbagi' : 'Bagikan menu'}
      </button>

      <button
        className="btn btn--block"
        style={{ marginTop: 24, color: 'var(--danger)', borderColor: '#fecaca' }}
        onClick={handleDeleteMenu}
      >
        Hapus menu ini
      </button>

      {editing && (
        <ItemForm
          title={editing === 'new' ? 'Tambah bahan' : 'Ubah bahan'}
          initial={editing === 'new' ? {} : editing}
          onSave={handleSaveItem}
          onCancel={() => setEditing(null)}
        />
      )}
      {sharing && (
        <ShareMenu
          menu={menu}
          onChange={(code) => setMenu({ ...menu, share_code: code })}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  )
}
