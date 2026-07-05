import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Layar Masuk (alur-layar.md Bagian 2): magic link atau Google.
export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendMagicLink(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  async function signInGoogle() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="app">
      <div className="center-screen">
        <div style={{ fontSize: 48 }}>🛒</div>
        <h1 className="app__title">Todo Belanja</h1>
        <p className="muted" style={{ maxWidth: 320 }}>
          Daftar belanja pribadi yang bisa dibuka di HP maupun laptop dan
          tetap jalan saat offline.
        </p>

        {!isSupabaseConfigured && (
          <div className="banner" style={{ maxWidth: 360 }}>
            Supabase belum dikonfigurasi. Salin <code>.env.example</code> ke{' '}
            <code>.env.local</code> dan isi kredensialnya agar login berfungsi.
          </div>
        )}

        {sent ? (
          <div className="card" style={{ maxWidth: 360 }}>
            <p>
              Tautan masuk sudah dikirim ke <strong>{email}</strong>. Cek
              email dan klik tautannya.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="stack" style={{ width: '100%', maxWidth: 360 }}>
            <input
              className="input"
              type="email"
              required
              placeholder="email@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Mengirim…' : 'Kirim tautan masuk'}
            </button>
            <button
              type="button"
              className="btn btn--block"
              onClick={signInGoogle}
            >
              Masuk dengan Google
            </button>
          </form>
        )}

        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  )
}
