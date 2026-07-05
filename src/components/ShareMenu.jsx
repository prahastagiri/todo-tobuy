import { useState } from 'react'
import { enableShare, disableShare } from '../lib/menus'

// Bagikan Menu (alur-layar.md Bagian 10). Model salin: penerima mendapat
// SALINAN sendiri, bukan akses ke data pemilik (prinsip inti #1).
export default function ShareMenu({ menu, onChange, onClose }) {
  const [code, setCode] = useState(menu.share_code || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const link = code ? `${window.location.origin}/import?code=${code}` : ''

  async function enable() {
    setBusy(true)
    setError('')
    try {
      const c = await enableShare(menu.id)
      setCode(c)
      onChange(c)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (!confirm('Cabut berbagi? Tautan lama tidak akan berlaku.')) return
    setBusy(true)
    setError('')
    try {
      await disableShare(menu.id)
      setCode(null)
      onChange(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard bisa gagal (izin); pengguna masih bisa salin manual.
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Bagikan menu</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Penerima mendapat <strong>salinannya sendiri</strong> yang bebas
          diubah — bukan akses ke datamu. Cocok saat pindah/berpisah rumah.
        </p>

        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

        {!code ? (
          <button
            className="btn btn--primary btn--block"
            disabled={busy}
            onClick={enable}
          >
            {busy ? 'Mengaktifkan…' : 'Aktifkan berbagi'}
          </button>
        ) : (
          <div className="stack">
            <label className="field" style={{ margin: 0 }}>
              <span className="field__label">Tautan impor</span>
              <input
                className="input"
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <button className="btn btn--primary btn--block" onClick={copy}>
              {copied ? 'Tersalin ✓' : 'Salin tautan'}
            </button>
            <button
              className="btn btn--block"
              disabled={busy}
              onClick={disable}
              style={{ color: 'var(--danger)', borderColor: '#fecaca' }}
            >
              Cabut berbagi
            </button>
          </div>
        )}

        <button className="btn btn--block" style={{ marginTop: 12 }} onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  )
}
