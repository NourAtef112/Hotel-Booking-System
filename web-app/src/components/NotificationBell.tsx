import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import type { AppNotification, NotificationType } from '../types/notifications'

function relativeTime(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 5) return 'Just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; accent: string; label: string }
> = {
  new_booking: {
    label: 'New Booking',
    accent: 'text-emerald-400 bg-emerald-500/10',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
      </svg>
    ),
  },
  booking_confirmed: {
    label: 'Confirmed',
    accent: 'text-sky-400 bg-sky-500/10',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  booking_completed: {
    label: 'Completed',
    accent: 'text-white/50 bg-white/[0.06]',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  booking_cancelled: {
    label: 'Cancelled',
    accent: 'text-red-400 bg-red-500/10',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  new_room: {
    label: 'New Room',
    accent: 'text-primary bg-primary/10',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
}

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: AppNotification
  onDismiss: (id: string) => void
}) {
  const cfg = TYPE_CONFIG[notification.type]
  return (
    <div
      className={`group relative flex gap-3 px-4 py-3.5 border-b border-white/[0.05] transition-colors hover:bg-white/[0.03] ${
        !notification.read ? 'bg-white/[0.02]' : ''
      }`}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary" />
      )}

      {/* Icon */}
      <div
        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${cfg.accent}`}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/80 leading-none mb-1">{notification.title}</p>
        <p className="text-xs text-white/45 leading-snug">{notification.message}</p>
        <p className="text-[10px] text-white/25 mt-1.5">{relativeTime(notification.timestamp)}</p>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(notification.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-white/25 hover:text-white/60"
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleToggle() {
    setOpen((o) => !o)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleToggle}
        title="Notifications"
        className="relative p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown — always rendered, animated with CSS */}
      <div
        className={`absolute right-0 top-full mt-2 w-80 dropdown-panel rounded-2xl z-50 overflow-hidden
          transition-all duration-200 ease-out origin-top-right
          ${open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
          }`}
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)' }}
      >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white/80">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-primary/15 text-primary text-[10px] font-semibold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-primary/80 hover:text-primary transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto scroll-area-viewport">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3 text-white/20">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-white/30">No notifications yet</p>
                <p className="text-[11px] text-white/18 mt-1">
                  New bookings and updates will appear here
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onDismiss={dismiss} />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.05]">
              <button
                onClick={() => notifications.forEach((n) => dismiss(n.id))}
                className="text-[11px] text-white/25 hover:text-white/50 transition-colors"
              >
                Clear all notifications
              </button>
            </div>
          )}
      </div>
    </div>
  )
}
