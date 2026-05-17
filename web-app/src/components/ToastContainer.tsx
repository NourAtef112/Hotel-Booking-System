import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import type { AppNotification, NotificationType } from '../types/notifications'

const DURATION = 4500

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; accentClass: string; barColor: string }
> = {
  new_booking: {
    accentClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    barColor: '#34d399',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
      </svg>
    ),
  },
  booking_confirmed: {
    accentClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    barColor: '#38bdf8',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  booking_completed: {
    accentClass: 'text-white/50 bg-white/[0.06] border-white/[0.10]',
    barColor: 'rgba(255,255,255,0.35)',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  booking_cancelled: {
    accentClass: 'text-red-400 bg-red-500/10 border-red-500/20',
    barColor: '#f87171',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  new_room: {
    accentClass: 'text-primary bg-primary/10 border-primary/20',
    barColor: '#b30000',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: AppNotification
  onClose: (id: string) => void
}) {
  const cfg = TYPE_CONFIG[toast.type]
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function close() {
    if (leaving) return
    setLeaving(true)
    setTimeout(() => onClose(toast.id), 320)
  }

  useEffect(() => {
    timerRef.current = setTimeout(close, DURATION)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        animation: leaving
          ? 'slideOutRight 0.32s cubic-bezier(0.4,0,1,1) forwards'
          : 'slideInRight 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards',
        boxShadow:
          '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
      className="relative w-80 overflow-hidden rounded-2xl glass-strong border border-white/[0.10]"
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 inset-y-0 w-[3px] rounded-l-2xl"
        style={{ backgroundColor: cfg.barColor }}
      />

      {/* Body */}
      <div className="flex items-start gap-3 pl-4 pr-3 py-3.5">
        {/* Icon */}
        <div
          className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border ${cfg.accentClass}`}
        >
          {cfg.icon}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-[13px] font-semibold text-white leading-none mb-1">{toast.title}</p>
          <p className="text-[11px] text-white/50 leading-snug">{toast.message}</p>
        </div>

        {/* Close */}
        <button
          onClick={close}
          className="shrink-0 mt-0.5 p-1 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
          aria-label="Dismiss"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.05]">
        <div
          style={{
            height: '100%',
            backgroundColor: cfg.barColor,
            transformOrigin: 'left',
            animation: `shrinkX ${DURATION}ms linear forwards`,
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={dismissToast} />
        </div>
      ))}
    </div>
  )
}
