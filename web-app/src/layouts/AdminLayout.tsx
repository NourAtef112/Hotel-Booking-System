import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import NotificationBell from '../components/NotificationBell'
import ScrollArea from '../components/ScrollArea'
import ToastContainer from '../components/ToastContainer'
import { useTheme, type ThemeMode } from '../contexts/ThemeContext'
import { clearToken } from '../lib/auth'

const navItems = [
  {
    to: '/admin/overview',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/admin/bookings',
    label: 'Bookings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    to: '/admin/rooms',
    label: 'Rooms',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/admin/calendar',
    label: 'Calendar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
  {
    to: '/admin/guests',
    label: 'Guests',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    to: '/admin/housekeeping',
    label: 'Housekeeping',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
]

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: React.ReactNode }[] = [
  {
    key: 'dark',
    label: 'Dark',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
      </svg>
    ),
  },
  {
    key: 'system',
    label: 'System',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    key: 'light',
    label: 'Light',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="4.5"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    ),
  },
]

function ThemeToggle() {
  const { mode, setMode } = useTheme()

  return (
    <div className="px-1 mb-2">
      <p className="text-[10px] uppercase tracking-widest text-white/25 font-medium mb-2 px-2">Appearance</p>
      <div className="flex items-center p-1 rounded-xl bg-white/[0.05] border border-white/[0.06] gap-0.5">
        {THEME_OPTIONS.map(({ key, label, icon }) => {
          const isActive = mode === key
          return (
            <button
              key={key}
              onClick={() => setMode(key)}
              title={label}
              className={`
                flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-primary text-white shadow-glow-sm'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.05]'
                }
              `}
            >
              {icon}
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808]">
      <ToastContainer />
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 right-0 w-[700px] h-[500px] bg-radial-red" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-radial-subtle" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex flex-col
          glass-strong border-r border-white/[0.06]
          transform transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/[0.06]">
          <img
            src="/ejust_logo.png"
            alt="E-JUST Guest House"
            className="w-16 h-16 object-contain brightness-[0.25] dark:brightness-100 transition-[filter] duration-300"
          />
          <div>
            <span className="font-semibold text-white text-sm tracking-wide">E-JUST</span>
            <p className="text-white/40 text-[11px] tracking-widest uppercase">Admin Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          <p className="px-3 mb-3 text-[10px] uppercase tracking-widest text-white/25 font-medium">
            Navigation
          </p>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/20 shadow-glow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.05] border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-primary' : 'text-white/40 group-hover:text-white/70 transition-colors'}>
                    {icon}
                  </span>
                  {label}
                  {/* Active indicator dot */}
                  <span className={`ml-auto w-1.5 h-1.5 rounded-full transition-opacity ${isActive ? 'bg-primary opacity-100' : 'opacity-0'}`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Theme + User / Logout */}
        <div className="p-4 border-t border-white/[0.06]">
          <ThemeToggle />
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">
              A
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium leading-none">Admin</p>
              <p className="text-white/30 text-xs mt-0.5 truncate">admin@ejust.edu.eg</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all border border-transparent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-10 h-16 glass border-b border-white/[0.06] flex items-center px-4 md:px-6 gap-4">
          <button
            className="md:hidden p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="flex-1" />

          {/* Status badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass border-white/[0.08] text-xs text-white/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>

          <NotificationBell />

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">
            A
          </div>
        </header>

        {/* Page content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
