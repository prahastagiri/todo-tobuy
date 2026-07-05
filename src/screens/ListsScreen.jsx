import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listActiveLists, createList } from '../lib/lists'

const STATUS_LABEL = { draft: 'Draf', shopping: 'Sedang belanja' }

// Tab Daftar (alur-layar.md Bagian 3): sesi belanja aktif (draft/shopping).
export default function ListsScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [lists, setLists] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setLists(await listActiveLists())
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
      const list = await createList(user.id, newName.trim())
      navigate(`/daftar/${list.id}`)
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
            placeholder='Nama daftar, mis. "Belanja Sup Ayam"'
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
          + Buat daftar baru
        </button>
      )}

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <div style={{ marginTop: 12 }}>
        {lists == null ? (
          <p className="muted">Memuat…</p>
        ) : lists.length === 0 ? (
          <div className="empty">
            Belum ada daftar aktif.
            <br />
            Buat daftar baru lalu tambah item dari menu.
          </div>
        ) : (
          lists.map((l) => (
            <button
              key={l.id}
              className="card list-card"
              onClick={() => navigate(`/daftar/${l.id}`)}
            >
              <div>
                <div className="list-card__title">{l.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {STATUS_LABEL[l.status]} · {l.itemCount} item
                </div>
              </div>
              <span className="muted">›</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
