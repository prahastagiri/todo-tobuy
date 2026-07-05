import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listDoneLists } from '../lib/lists'

// Tab Riwayat (alur-layar.md Bagian 6): daftar dengan status 'done'.
export default function HistoryScreen() {
  const navigate = useNavigate()
  const [lists, setLists] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listDoneLists()
      .then(setLists)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>
  if (lists == null) return <p className="muted">Memuat…</p>

  if (lists.length === 0) {
    return (
      <div className="empty">
        Belum ada riwayat belanja.
        <br />
        Daftar yang sudah selesai akan muncul di sini.
      </div>
    )
  }

  return (
    <div>
      {lists.map((l) => (
        <button
          key={l.id}
          className="card list-card"
          onClick={() => navigate(`/daftar/${l.id}`)}
        >
          <div>
            <div className="list-card__title">{l.name}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {l.completed_at
                ? new Date(l.completed_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}{' '}
              · {l.itemCount} item
            </div>
          </div>
          <span className="muted">›</span>
        </button>
      ))}
    </div>
  )
}
