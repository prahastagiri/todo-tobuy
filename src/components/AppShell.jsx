import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

// Kerangka aplikasi: header + konten + bottom navigation 3 tab.
// Judul header mengikuti tab aktif.
const TABS = [
  { to: '/', label: 'Daftar', icon: '🛒', end: true },
  { to: '/menu', label: 'Menu', icon: '📋', end: false },
  { to: '/riwayat', label: 'Riwayat', icon: '🕘', end: false },
]

const TITLES = {
  '/': 'Daftar Belanja',
  '/menu': 'Menu (Template)',
  '/riwayat': 'Riwayat',
}

function detailTitle(pathname) {
  if (pathname.startsWith('/menu/')) return 'Detail Menu'
  if (pathname.startsWith('/daftar/')) return 'Detail Daftar'
  if (pathname === '/profil') return 'Profil'
  return 'Todo Belanja'
}

export default function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const online = useOnlineStatus()

  // Halaman detail (mis. /menu/<id>) bukan salah satu tab: tampilkan tombol
  // kembali dan judul yang sesuai.
  const isDetail = !(pathname in TITLES)
  const title = isDetail ? detailTitle(pathname) : TITLES[pathname]

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-left">
          {isDetail && (
            <button
              className="btn btn--icon"
              onClick={() => navigate(-1)}
              title="Kembali"
            >
              ←
            </button>
          )}
          <h1 className="app__title">{title}</h1>
        </div>
        <button
          className="btn btn--icon"
          onClick={() => navigate('/profil')}
          title="Profil"
        >
          👤
        </button>
      </header>

      {!online && (
        <div className="offline-bar">Offline — perubahan mungkin belum tersimpan</div>
      )}

      <main className="app__main">
        <Outlet />
      </main>

      <nav className="nav">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              'nav__item' + (isActive ? ' nav__item--active' : '')
            }
          >
            <span className="nav__icon">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
