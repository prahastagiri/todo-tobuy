import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listMenus, createMenu } from '../lib/menus'

// Tab Menu (alur-layar.md Bagian 8): daftar template milik pengguna.
export default function MenusScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [menus, setMenus] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setMenus(await listMenus())
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submitCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    setError('')
    try {
      const menu = await createMenu(user.id, newName.trim())
      navigate(`/menu/${menu.id}`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div>
      {creating ? (
        <form className="card stack" onSubmit={submitCreate}>
          <input
            className="input"
            autoFocus
            placeholder='Nama menu, mis. "Opor Ayam"'
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="row">
            <button
              type="button"
              className="btn btn--block"
              onClick={() => {
                setCreating(false)
                setNewName('')
              }}
            >
              Batal
            </button>
            <button className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Membuat…' : 'Buat'}
            </button>
          </div>
        </form>
      ) : (
        <button
          className="btn btn--primary btn--block"
          onClick={() => setCreating(true)}
        >
          + Buat menu
        </button>
      )}

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <div style={{ marginTop: 12 }}>
        {menus == null ? (
          <p className="muted">Memuat…</p>
        ) : menus.length === 0 ? (
          <div className="empty">
            Belum ada menu.
            <br />
            Buat template pertamamu, mis. "Opor Ayam".
          </div>
        ) : (
          menus.map((m) => (
            <button
              key={m.id}
              className="card list-card"
              onClick={() => navigate(`/menu/${m.id}`)}
            >
              <div>
                <div className="list-card__title">{m.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {m.itemCount} bahan
                </div>
              </div>
              <div className="list-card__right">
                {m.share_code && <span title="Sedang dibagikan">🔗</span>}
                <span className="muted">›</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
