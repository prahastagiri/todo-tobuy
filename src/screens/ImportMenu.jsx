import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Impor Menu (alur-layar.md Bagian 11): penerima membuka tautan berbagi
// ?code=... lalu memanggil fungsi DB import_shared_menu (spec Bagian 8).
export default function ImportMenu() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const code = params.get('code') ?? ''
  const [status, setStatus] = useState('idle') // idle | busy | done | error
  const [message, setMessage] = useState('')

  async function doImport() {
    setStatus('busy')
    setMessage('')
    const { data, error } = await supabase.rpc('import_shared_menu', {
      p_share_code: code,
    })
    if (error) {
      setStatus('error')
      setMessage(error.message)
    } else {
      setStatus('done')
      setMessage('Menu berhasil diimpor ke akunmu.')
      // data = id menu baru; arahkan ke daftar menu.
      setTimeout(() => navigate('/menu'), 1200)
    }
  }

  if (!code) {
    return (
      <div className="app">
        <div className="center-screen">
          <p>Tautan impor tidak berisi kode yang valid.</p>
          <button className="btn" onClick={() => navigate('/')}>
            Ke beranda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="center-screen">
        <div style={{ fontSize: 40 }}>📥</div>
        <h1 className="app__title">Impor Menu</h1>
        {!session && (
          <p className="muted">Kamu perlu masuk dulu untuk mengimpor menu.</p>
        )}
        <p className="muted">
          Menu yang dibagikan akan <strong>disalin</strong> ke akunmu dan bebas
          kamu ubah — tidak memengaruhi milik pengirim.
        </p>

        {status !== 'done' && (
          <button
            className="btn btn--primary"
            onClick={doImport}
            disabled={status === 'busy' || !session}
          >
            {status === 'busy' ? 'Mengimpor…' : 'Impor menu ini'}
          </button>
        )}

        {message && (
          <p style={{ color: status === 'error' ? 'var(--danger)' : 'var(--green)' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
