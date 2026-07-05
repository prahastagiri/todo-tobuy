import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { sync } from './lib/sync'
import AppShell from './components/AppShell'
import Login from './screens/Login'
import ListsScreen from './screens/ListsScreen'
import ListDetail from './screens/ListDetail'
import MenusScreen from './screens/MenusScreen'
import MenuDetail from './screens/MenuDetail'
import HistoryScreen from './screens/HistoryScreen'
import Profile from './screens/Profile'
import ImportMenu from './screens/ImportMenu'

export default function App() {
  const { session, loading } = useAuth()
  const location = useLocation()
  // Sinkron awal mengisi cache lokal (offline-first). Layar membaca dari
  // cache, jadi tunggu sinkron pertama selesai sebelum menampilkannya.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!session) {
      setHydrated(false)
      return
    }
    let mounted = true
    sync()
      .catch(() => {})
      .finally(() => {
        if (mounted) setHydrated(true)
      })
    // Sinkron ulang begitu koneksi kembali.
    const onOnline = () => sync().catch(() => {})
    window.addEventListener('online', onOnline)
    return () => {
      mounted = false
      window.removeEventListener('online', onOnline)
    }
  }, [session])

  if (loading) {
    return (
      <div className="app">
        <div className="center-screen">
          <p className="muted">Memuat…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    // Simpan tujuan agar tautan impor tetap bekerja setelah login.
    if (location.pathname === '/import') {
      return (
        <Routes>
          <Route path="/import" element={<ImportMenu />} />
          <Route path="*" element={<Login />} />
        </Routes>
      )
    }
    return <Login />
  }

  if (!hydrated) {
    return (
      <div className="app">
        <div className="center-screen">
          <p className="muted">Menyinkronkan…</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ListsScreen />} />
        <Route path="daftar/:id" element={<ListDetail />} />
        <Route path="menu" element={<MenusScreen />} />
        <Route path="menu/:id" element={<MenuDetail />} />
        <Route path="riwayat" element={<HistoryScreen />} />
        <Route path="profil" element={<Profile />} />
      </Route>
      <Route path="/import" element={<ImportMenu />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
