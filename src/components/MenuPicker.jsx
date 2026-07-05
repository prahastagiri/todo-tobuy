import { useEffect, useState } from 'react'
import { listMenus } from '../lib/menus'

// Modal pemilih menu untuk "Tambah dari menu" (alur-layar.md Bagian 4/8).
// Memilih menu akan menyalin item-itemnya ke daftar (di pemanggil).
export default function MenuPicker({ onPick, onCancel }) {
  const [menus, setMenus] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listMenus()
      .then(setMenus)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Tambah dari menu</h2>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        {menus == null ? (
          <p className="muted">Memuat…</p>
        ) : menus.length === 0 ? (
          <div className="empty">Belum ada menu untuk disalin.</div>
        ) : (
          menus.map((m) => (
            <button
              key={m.id}
              className="card list-card"
              onClick={() => onPick(m)}
            >
              <div>
                <div className="list-card__title">{m.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {m.itemCount} bahan
                </div>
              </div>
              <span className="muted">+</span>
            </button>
          ))
        )}
        <button className="btn btn--block" style={{ marginTop: 8 }} onClick={onCancel}>
          Batal
        </button>
      </div>
    </div>
  )
}
