import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

// Profil / Setelan (alur-layar.md Bagian 12): akun, keluar, pasang PWA,
// status koneksi.
export default function Profile() {
  const { user, signOut } = useAuth()
  const online = useOnlineStatus()
  const [canInstall, setCanInstall] = useState(!!window.__deferredInstallPrompt)

  useEffect(() => {
    // Event beforeinstallprompt ditangkap global di main.jsx; pantau kalau
    // baru terpicu setelah layar ini tampil.
    const onAvail = () => setCanInstall(true)
    window.addEventListener('pwa-install-available', onAvail)
    return () => window.removeEventListener('pwa-install-available', onAvail)
  }, [])

  async function install() {
    const e = window.__deferredInstallPrompt
    if (!e) return
    e.prompt()
    await e.userChoice
    window.__deferredInstallPrompt = null
    setCanInstall(false)
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="field__label">Masuk sebagai</div>
        <div style={{ fontWeight: 600 }}>{user?.email ?? '—'}</div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span>Status koneksi</span>
          <span className={'chip ' + (online ? 'chip--ok' : 'chip--off')}>
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
          Aplikasi dapat dibuka saat offline. Perubahan data saat offline masih
          dalam pengembangan (lihat catatan sinkronisasi).
        </p>
      </div>

      {canInstall && (
        <button className="btn btn--primary btn--block" onClick={install}>
          📲 Pasang aplikasi ke layar
        </button>
      )}

      <button
        className="btn btn--block"
        style={{ color: 'var(--danger)', borderColor: '#fecaca' }}
        onClick={signOut}
      >
        Keluar
      </button>

      <p className="muted" style={{ textAlign: 'center', fontSize: 12 }}>
        Todo Belanja v0.1.0
      </p>
    </div>
  )
}
