import { useEffect, useState } from 'react'

// Status koneksi. Dipakai untuk indikator offline (aplikasi dipakai di pasar
// yang sinyalnya buruk — lihat docs/spesifikasi-model-data.md Bagian 9).
export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}
