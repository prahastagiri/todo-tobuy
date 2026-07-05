import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getList,
  renameList,
  deleteList,
  setListStatus,
  listItems,
  addItem,
  updateItem,
  setItemStatus,
  deleteItem,
  findMenuDuplicates,
  addMenuToList,
  duplicateListToDraft,
  saveListAsMenu,
} from '../lib/lists'
import { groupByCategory } from '../lib/constants'
import ItemForm from '../components/ItemForm'
import ItemRow from '../components/ItemRow'
import MenuPicker from '../components/MenuPicker'

// Detail Daftar (alur-layar.md Bagian 4/5/7). Satu layar, tiga mode yang
// diturunkan dari shopping_lists.status:
//   draft    -> edit penuh
//   shopping -> hanya centang item ke keranjang (daftar dibekukan)
//   done     -> baca-saja (riwayat) + aksi belanja-lagi / simpan-template
export default function ListDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | item
  const [picking, setPicking] = useState(false)

  async function load() {
    try {
      const [l, its] = await Promise.all([getList(id), listItems(id)])
      setList(l)
      setName(l.name)
      setItems(its)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!list) return <p className="muted">{error || 'Memuat…'}</p>

  const mode = list.status // draft | shopping | done

  async function saveName() {
    if (name.trim() === list.name || !name.trim()) {
      setName(list.name)
      return
    }
    try {
      await renameList(id, name.trim())
      setList({ ...list, name: name.trim() })
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleSaveItem(payload) {
    try {
      if (editing === 'new') await addItem(id, payload, items.length)
      else await updateItem(editing.id, payload)
      setEditing(null)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function toggleStatus(item, target) {
    // Optimistis: perbarui UI dulu, lalu simpan.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: target } : i)))
    try {
      await setItemStatus(item.id, target)
    } catch (e) {
      setError(e.message)
      await load()
    }
  }

  async function handleDeleteItem(item) {
    if (!confirm(`Hapus "${item.name}"?`)) return
    try {
      await deleteItem(item.id)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handlePickMenu(menu) {
    setPicking(false)
    try {
      const { duplicates } = await findMenuDuplicates(id, menu.id)
      let merge = false
      if (duplicates.length > 0) {
        const names = duplicates.map((d) => d.name).join(', ')
        merge = confirm(
          `${duplicates.length} item sudah ada di daftar (${names}).\n\n` +
            'OK = gabungkan jumlahnya · Batal = tambah sebagai baris terpisah'
        )
      }
      await addMenuToList(id, menu.id, items.length, merge)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function changeListStatus(status) {
    try {
      await setListStatus(id, status)
      setList({ ...list, status })
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleComplete() {
    if (!confirm('Selesaikan daftar ini? Akan masuk ke Riwayat.')) return
    try {
      await setListStatus(id, 'done')
      navigate('/riwayat')
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDeleteList() {
    if (!confirm(`Hapus daftar "${list.name}"?`)) return
    try {
      await deleteList(id)
      navigate('/')
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleShopAgain() {
    const nm = prompt('Nama daftar baru:', list.name)
    if (!nm) return
    try {
      const nl = await duplicateListToDraft(user.id, id, nm.trim())
      navigate(`/daftar/${nl.id}`)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleSaveAsMenu() {
    const nm = prompt('Nama template baru:', list.name)
    if (!nm) return
    try {
      await saveListAsMenu(user.id, id, nm.trim())
      alert('Tersimpan sebagai template. Cek tab Menu.')
    } catch (e) {
      setError(e.message)
    }
  }

  // Pisahkan item aktif (need/cart) dari yang sudah punya (have).
  const activeItems = items.filter((i) => i.status !== 'have')
  const haveItems = items.filter((i) => i.status === 'have')
  const cartCount = items.filter((i) => i.status === 'cart').length
  const progressTotal = activeItems.length
  const progressPct = progressTotal ? Math.round((cartCount / progressTotal) * 100) : 0

  return (
    <div>
      {mode === 'draft' ? (
        <label className="field">
          <span className="field__label">Nama daftar</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
          />
        </label>
      ) : (
        <div className="stack" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{list.name}</h2>
          {mode === 'done' && list.completed_at && (
            <div className="muted" style={{ fontSize: 13 }}>
              Selesai {new Date(list.completed_at).toLocaleString('id-ID')}
            </div>
          )}
        </div>
      )}

      {mode === 'shopping' && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Belanja</strong>
            <span className="muted">
              {cartCount}/{progressTotal} di keranjang
            </span>
          </div>
          <div className="progress">
            <div className="progress__bar" style={{ width: progressPct + '%' }} />
          </div>
        </div>
      )}

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      {mode === 'draft' && (
        <div className="row" style={{ marginBottom: 8 }}>
          <button className="btn btn--primary btn--block" onClick={() => setPicking(true)}>
            + Dari menu
          </button>
          <button className="btn btn--block" onClick={() => setEditing('new')}>
            + Item
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          Belum ada item.
          {mode === 'draft' && ' Tambahkan dari menu atau manual.'}
        </div>
      ) : (
        <>
          <ItemGroups
            items={activeItems}
            mode={mode}
            onToggle={toggleStatus}
            onEdit={(it) => setEditing(it)}
            onDelete={handleDeleteItem}
          />

          {haveItems.length > 0 && (
            <>
              <div className="group-header" style={{ marginTop: 16 }}>
                Sudah punya di rumah
              </div>
              <ItemGroups
                items={haveItems}
                mode={mode}
                onToggle={toggleStatus}
                onEdit={(it) => setEditing(it)}
                onDelete={handleDeleteItem}
              />
            </>
          )}
        </>
      )}

      {/* Aksi bawah, per mode */}
      {mode === 'draft' && (
        <>
          <button
            className="btn btn--primary btn--block"
            style={{ marginTop: 20 }}
            disabled={activeItems.length === 0}
            onClick={() => changeListStatus('shopping')}
          >
            🔒 Mulai belanja
          </button>
          <button
            className="btn btn--block"
            style={{ marginTop: 20, color: 'var(--danger)', borderColor: '#fecaca' }}
            onClick={handleDeleteList}
          >
            Hapus daftar
          </button>
        </>
      )}

      {mode === 'shopping' && (
        <>
          <button
            className="btn btn--primary btn--block"
            style={{ marginTop: 20 }}
            onClick={handleComplete}
          >
            ✓ Selesai belanja
          </button>
          <button
            className="btn btn--block"
            style={{ marginTop: 12 }}
            onClick={() => changeListStatus('draft')}
          >
            Buka kunci (kembali menyusun)
          </button>
        </>
      )}

      {mode === 'done' && (
        <div className="stack" style={{ marginTop: 20 }}>
          <button className="btn btn--primary btn--block" onClick={handleShopAgain}>
            Belanja lagi
          </button>
          <button className="btn btn--block" onClick={handleSaveAsMenu}>
            Simpan sebagai template
          </button>
        </div>
      )}

      {editing && (
        <ItemForm
          title={editing === 'new' ? 'Tambah item' : 'Ubah item'}
          initial={editing === 'new' ? {} : editing}
          onSave={handleSaveItem}
          onCancel={() => setEditing(null)}
        />
      )}
      {picking && (
        <MenuPicker onPick={handlePickMenu} onCancel={() => setPicking(false)} />
      )}
    </div>
  )
}

// Daftar item dikelompokkan per kategori, dengan kontrol sesuai mode.
function ItemGroups({ items, mode, onToggle, onEdit, onDelete }) {
  const groups = groupByCategory(items)
  return groups.map(([cat, its]) => (
    <div key={cat || 'lainnya'} style={{ marginTop: 8 }}>
      <div className="group-header">{cat || 'Tanpa kategori'}</div>
      {its.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          dim={item.status === 'have'}
          // Mode belanja: seluruh baris bisa diketuk untuk toggle keranjang.
          onClick={
            mode === 'shopping' && item.status !== 'have'
              ? () => onToggle(item, item.status === 'cart' ? 'need' : 'cart')
              : undefined
          }
          leading={
            mode === 'shopping' || mode === 'done' ? (
              <span className={'check' + (item.status === 'cart' ? ' check--on' : '')}>
                {item.status === 'cart' ? '✓' : ''}
              </span>
            ) : null
          }
          actions={
            mode === 'draft' ? (
              <>
                <button
                  className="btn btn--icon"
                  title={item.status === 'have' ? 'Tandai perlu' : 'Sudah punya'}
                  onClick={() => onToggle(item, item.status === 'have' ? 'need' : 'have')}
                >
                  {item.status === 'have' ? '↩️' : '🏠'}
                </button>
                <button className="btn btn--icon" title="Ubah" onClick={() => onEdit(item)}>
                  ✏️
                </button>
                <button className="btn btn--icon" title="Hapus" onClick={() => onDelete(item)}>
                  🗑️
                </button>
              </>
            ) : null
          }
        />
      ))}
    </div>
  ))
}
