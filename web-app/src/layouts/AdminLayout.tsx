import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearToken } from '../lib/auth'
import ScrollArea from '../components/ScrollArea'

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
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/admin/bookings')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808]">
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
            className="w-16 h-16 object-contain drop-shadow-sm"
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

        {/* User / Logout */}
        <div className="p-4 border-t border-white/[0.06]">
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
