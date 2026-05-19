import { useEffect, useMemo, useRef, useState } from 'react'
import ExportButton from '../../components/ExportButton'
import { useTheme } from '../../contexts/ThemeContext'
import { useAdminBookings, useAdminRooms, useUpdateBookingStatus } from '../../hooks/useAdminApi'
import { useGlowCard } from '../../hooks/useGlowCard'
import { exportMonthlyChartExcel, exportOverviewExcel, exportRevenueTrendExcel } from '../../lib/exportExcel'
import type { Booking, BookingStatus, Room, RoomType } from '../../types/admin'

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const TYPE_COLOR: Record<RoomType, string> = {
  single: '#60a5fa',
  double: '#a78bfa',
  suite:  '#fbbf24',
  family: '#34d399',
}

const STATUS_STYLE: Record<BookingStatus, { bar: string; text: string; badge: string }> = {
  confirmed: { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  pending:   { bar: 'bg-amber-500',   text: 'text-amber-400',   badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  cancelled: { bar: 'bg-red-500',     text: 'text-red-400',     badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
  completed: { bar: 'bg-white/25',    text: 'text-white/40',    badge: 'bg-white/5 text-white/40 border-white/10' },
}

function calcNights(start: string, end: string) {
  const s = new Date(start + 'T00:00:00'), e = new Date(end + 'T00:00:00')
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86_400_000))
}

function fmtEGP(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M EGP`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K EGP`
  return `${Math.round(n).toLocaleString('en-EG')} EGP`
}

// ─── Count-up hook ───────────────────────────────────────────────────────────

function useCountUp(target: number, enabled: boolean, duration = 1100) {
  const [val, setVal] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    if (!enabled) return
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 4)       // ease-out quart
      setVal(Math.round(from + eased * (target - from)))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, enabled, duration])
  return val
}

// ─── Animated Stat Card ──────────────────────────────────────────────────────

function StatCard({
  label, target, suffix = '', sub, accent, accentBg, loading, delay,
}: {
  label: string
  target: number
  suffix?: string
  sub?: string
  accent: string
  accentBg?: string
  loading: boolean
  delay: number
}) {
  const count = useCountUp(target, !loading)
  const glow = useGlowCard()
  return (
    <div
      ref={glow.ref}
      onMouseMove={glow.onMouseMove}
      onMouseLeave={glow.onMouseLeave}
      className={`card-float glass rounded-2xl p-5 border border-white/[0.06] shadow-glass relative overflow-hidden ${accentBg ?? ''}`}
      style={{ animation: `slideUp 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}
    >
      {/* Subtle corner glow */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20"
        style={{ background: accentBg ? undefined : 'rgba(255,255,255,0.04)' }} />

      <p className="text-[11px] text-white/35 uppercase tracking-wider font-medium mb-3 relative z-10">{label}</p>
      {loading
        ? <div className="h-9 w-20 bg-white/[0.06] rounded-lg animate-pulse" />
        : (
          <p className={`text-4xl font-bold tracking-tight relative z-10 ${accent}`}>
            {count.toLocaleString('en-EG')}{suffix}
          </p>
        )
      }
      {sub && !loading && (
        <p className="text-xs text-white/25 mt-1.5 relative z-10">{sub}</p>
      )}
    </div>
  )
}

// ─── Revenue Card ────────────────────────────────────────────────────────────

function RevenueCard({
  label, amount, sub, accent, borderColor, bgColor, loading, delay,
}: {
  label: string
  amount: number
  sub: string
  accent: string
  borderColor: string
  bgColor: string
  loading: boolean
  delay: number
}) {
  const count = useCountUp(amount, !loading, 1300)
  const glow = useGlowCard()

  return (
    <div
      ref={glow.ref}
      onMouseMove={glow.onMouseMove}
      onMouseLeave={glow.onMouseLeave}
      className={`card-float glass rounded-2xl p-5 shadow-glass relative overflow-hidden border ${borderColor} ${bgColor}`}
      style={{ animation: `slideUp 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)',
          backgroundSize: '400% 100%',
          animation: 'shimmerSlide 4s linear infinite',
        }}
      />

      <div className="flex items-center justify-between mb-3 relative z-10">
        <p className="text-[11px] text-white/35 uppercase tracking-wider font-medium">{label}</p>
        <span className="w-1.5 h-1.5 rounded-full animate-glow-pulse" style={{ backgroundColor: accent.replace('text-','').includes('emerald') ? '#10b981' : '#f59e0b' }} />
      </div>

      {loading
        ? <div className="h-9 w-36 bg-white/[0.06] rounded-lg animate-pulse" />
        : (
          <p className={`text-4xl font-bold tracking-tight relative z-10 ${accent}`}>
            {fmtEGP(count)}
          </p>
        )
      }
      <p className="text-xs text-white/25 mt-1.5 relative z-10">{sub}</p>
    </div>
  )
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

function BarChart({ data, visible, isDark }: { data: { label: string; count: number }[]; visible: boolean; isDark: boolean }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 520, H = 170
  const pad = { t: 28, r: 12, b: 32, l: 28 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b
  const slot = cw / data.length
  const gap = slot * 0.38

  const gridColor   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'
  const labelMuted  = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(13,13,18,0.35)'
  const labelBright = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(13,13,18,0.80)'
  const trackFill   = isDark ? 'white'                  : 'black'
  const emptyFill   = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B30000" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#B30000" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = pad.t + ch * (1 - t)
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y}
              stroke={gridColor} strokeWidth="1" strokeDasharray="4 4" />
            <text x={pad.l - 6} y={y + 3.5} textAnchor="end"
              fill={labelMuted} fontSize="9" fontFamily="system-ui">
              {Math.round(max * t)}
            </text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const barH = Math.max((d.count / max) * ch, d.count > 0 ? 3 : 0)
        const x = pad.l + i * slot + gap / 2
        const y = pad.t + ch - barH
        const w = slot - gap
        const delay = visible ? i * 70 : 0

        return (
          <g key={i}>
            <rect x={x} y={pad.t} width={w} height={ch}
              fill={trackFill} fillOpacity="0.015" rx="4" />
            <rect x={x} y={y} width={w} height={barH} rx="4"
              fill={d.count > 0 ? 'url(#barGrad)' : emptyFill}
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center bottom',
                animation: visible ? `barGrow 0.65s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both` : 'none',
              }}
            />
            {d.count > 0 && (
              <text x={x + w / 2} y={y - 7} textAnchor="middle"
                fill={labelBright} fontSize="10" fontFamily="system-ui" fontWeight="600"
                style={{ animation: visible ? `fadeIn 0.4s ease ${delay + 300}ms both` : 'none' }}>
                {d.count}
              </text>
            )}
            <text x={x + w / 2} y={H - 7} textAnchor="middle"
              fill={labelMuted} fontSize="10" fontFamily="system-ui">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Line/area chart ─────────────────────────────────────────────────────────

function LineChart({ data, visible, isDark }: { data: { label: string; value: number }[]; visible: boolean; isDark: boolean }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 520, H = 110
  const pad = { t: 16, r: 12, b: 26, l: 10 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b

  const pts = data.map((d, i) => ({
    x: pad.l + (data.length > 1 ? i / (data.length - 1) : 0.5) * cw,
    y: pad.t + ch - (d.value / max) * ch,
    ...d,
  }))

  const lineStr = pts.map(p => `${p.x},${p.y}`).join(' ')
  const areaStr = [
    `${pts[0]?.x},${pad.t + ch}`,
    ...pts.map(p => `${p.x},${p.y}`),
    `${pts[pts.length - 1]?.x},${pad.t + ch}`,
  ].join(' ')

  // Approximate polyline length for dasharray animation
  const lineLen = pts.reduce((len, p, i) => {
    if (i === 0) return 0
    const prev = pts[i - 1]
    return len + Math.hypot(p.x - prev.x, p.y - prev.y)
  }, 0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {pts.length > 1 && (
        <>
          <polygon points={areaStr} fill="url(#areaGrad)"
            style={{ animation: visible ? 'fadeIn 1s ease 200ms both' : 'none' }} />
          <polyline points={lineStr} fill="none" stroke="#10b981" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={lineLen}
            strokeDashoffset={lineLen}
            style={{ animation: visible ? `lineDrawIn 1.2s cubic-bezier(0.16,1,0.3,1) 100ms both` : 'none' }}
          />
        </>
      )}

      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#10b981"
            fillOpacity={p.value > 0 ? 1 : 0.2}
            style={{ animation: visible ? `dotPop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${300 + i * 120}ms both` : 'none' }}
          />
          <text x={p.x} y={H - 5} textAnchor="middle"
            fill={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(13,13,18,0.38)'} fontSize="10" fontFamily="system-ui">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── Agenda Preview Modal ────────────────────────────────────────────────────

const AGENDA_TYPE_COLOR: Record<string, string> = {
  single: '#60a5fa', double: '#a78bfa', suite: '#fbbf24', family: '#34d399',
}

function AgendaPreviewModal({
  booking,
  roomMap,
  onClose,
}: {
  booking: Booking
  roomMap: Map<number, Room>
  onClose: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const room = roomMap.get(booking.room_id)
  const nights = calcNights(booking.start_date, booking.end_date)
  const cost = room ? nights * room.price_per_night : null
  const initials = booking.guest_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  const st = STATUS_STYLE[booking.status]
  const statusLabel = booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
  const typeColor = AGENDA_TYPE_COLOR[room?.type ?? ''] ?? '#B30000'

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-280 ${
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`relative w-full max-w-md glass-strong rounded-2xl pointer-events-auto transform transition-all duration-280 ease-out ${
            visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          }`}
          style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {initials}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{booking.guest_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/35">Booking #{booking.id}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.badge}`}>
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Room */}
            <div className="flex items-center gap-3 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${typeColor}18` }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  style={{ color: typeColor }}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {room ? `Room ${room.room_number}` : `Room #${booking.room_id}`}
                </p>
                <p className="text-xs text-white/35 capitalize">
                  {room?.type ?? 'Unknown'}
                  {room ? ` · ${fmtEGP(room.price_per_night)}/night` : ''}
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.15)' }}>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-medium mb-1">Check-in</p>
                <p className="text-sm font-semibold text-white">{booking.start_date}</p>
              </div>
              <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.15)' }}>
                <p className="text-[10px] uppercase tracking-widest text-amber-400/70 font-medium mb-1">Check-out</p>
                <p className="text-sm font-semibold text-white">{booking.end_date}</p>
              </div>
            </div>

            {/* Duration + cost */}
            {nights > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                  {nights} night{nights !== 1 ? 's' : ''}
                </div>
                {cost !== null && <p className="text-base font-bold text-white">{fmtEGP(cost)}</p>}
              </div>
            )}

            {/* Contact */}
            {(booking.guest_email || booking.guest_phone) && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-white/25 font-medium">Contact</p>
                {booking.guest_email && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.03] rounded-lg border border-white/[0.05]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 shrink-0">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span className="text-sm text-white/70">{booking.guest_email}</span>
                  </div>
                )}
                {booking.guest_phone && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.03] rounded-lg border border-white/[0.05]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 shrink-0">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                    </svg>
                    <span className="text-sm text-white/70">{booking.guest_phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.06]">
            <button
              onClick={handleClose}
              className="w-full py-2.5 text-sm font-medium text-white/60 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Today's Agenda ──────────────────────────────────────────────────────────

function TodayAgenda({
  bookings,
  roomMap,
  loading,
}: {
  bookings: Booking[]
  roomMap: Map<number, Room>
  loading: boolean
}) {
  const today = new Date().toISOString().split('T')[0]
  const checkIns  = bookings.filter(b => b.start_date === today && b.status !== 'cancelled')
  const checkOuts = bookings.filter(b => b.end_date   === today && b.status !== 'cancelled')
  const isEmpty   = checkIns.length === 0 && checkOuts.length === 0
  const [preview, setPreview] = useState<Booking | null>(null)

  function GuestRow({ b, type }: { b: Booking; type: 'in' | 'out' }) {
    const initials = b.guest_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    const room = roomMap.get(b.room_id)
    return (
      <button
        className="flex items-center gap-3 py-2.5 w-full text-left rounded-xl px-2 -mx-2 hover:bg-white/[0.04] transition-colors group cursor-pointer"
        onClick={() => setPreview(b)}
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/25 flex items-center justify-center text-primary text-[11px] font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate group-hover:text-primary/90 transition-colors">
            {b.guest_name}
          </p>
          <p className="text-xs text-white/35">
            {room ? `Room ${room.room_number}` : `Room ${b.room_id}`}
            {room ? ` · ${room.type}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            type === 'in'
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
          }`}>
            {type === 'in' ? 'Check-in' : 'Check-out'}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className="text-white/20 group-hover:text-white/50 transition-colors">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </button>
    )
  }

  return (
    <>
      <div
        className="glass rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ animation: 'slideUp 0.55s cubic-bezier(0.16,1,0.3,1) 90ms both' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Today's Agenda</p>
              <p className="text-[11px] text-white/30">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-white/40">{checkIns.length} in</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-xs text-white/40">{checkOuts.length} out</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-3 max-h-64 overflow-y-auto scroll-area-viewport">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-white/[0.05] rounded animate-pulse" />
                  <div className="h-2.5 w-20 bg-white/[0.04] rounded animate-pulse" />
                </div>
              </div>
            ))
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-white/40">All clear today</p>
              <p className="text-xs text-white/25 mt-0.5">No check-ins or check-outs scheduled</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {[
                ...checkIns.map(b => ({ b, type: 'in' as const })),
                ...checkOuts.map(b => ({ b, type: 'out' as const })),
              ].map(({ b, type }) => (
                <GuestRow key={`${type}-${b.id}`} b={b} type={type} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking preview — portal-free, fixed positioning escapes overflow */}
      {preview && (
        <AgendaPreviewModal
          booking={preview}
          roomMap={roomMap}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  )
}

// ─── Pending Approvals ────────────────────────────────────────────────────────

function PendingApprovals({
  bookings,
  roomMap,
  loading,
}: {
  bookings: Booking[]
  roomMap: Map<number, Room>
  loading: boolean
}) {
  const updateStatus = useUpdateBookingStatus()
  const pending = bookings.filter(b => b.status === 'pending')

  function calcNights(start: string, end: string) {
    return Math.max(0, Math.round(
      (new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86_400_000
    ))
  }

  return (
    <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{ animation: 'slideUp 0.55s cubic-bezier(0.16,1,0.3,1) 170ms both' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Pending Approvals</p>
            <p className="text-[11px] text-white/30">Awaiting confirmation</p>
          </div>
        </div>
        {!loading && pending.length > 0 && (
          <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-full">
            {pending.length}
          </span>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-white/[0.04] max-h-64 overflow-y-auto scroll-area-viewport">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-36 bg-white/[0.05] rounded animate-pulse" />
                <div className="h-2.5 w-24 bg-white/[0.04] rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="h-7 w-16 bg-white/[0.05] rounded-lg animate-pulse" />
                <div className="h-7 w-14 bg-white/[0.05] rounded-lg animate-pulse" />
              </div>
            </div>
          ))
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white/40">Nothing pending</p>
            <p className="text-xs text-white/25 mt-0.5">All bookings have been reviewed</p>
          </div>
        ) : (
          pending.map(b => {
            const initials = b.guest_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
            const room = roomMap.get(b.room_id)
            const nights = calcNights(b.start_date, b.end_date)
            const cost = room ? nights * room.price_per_night : null
            const isUpdating = updateStatus.isPending &&
              (updateStatus.variables as { id: number } | undefined)?.id === b.id

            return (
              <div key={b.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/25 flex items-center justify-center text-primary text-[11px] font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{b.guest_name}</p>
                  <p className="text-xs text-white/35">
                    Room {b.room_id} · {b.start_date} → {b.end_date}
                    {cost !== null ? ` · ${fmtEGP(cost)}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    disabled={isUpdating}
                    onClick={() => updateStatus.mutate({ id: b.id, status: 'confirmed' })}
                    className="px-3 py-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? '…' : 'Confirm'}
                  </button>
                  <button
                    disabled={isUpdating}
                    onClick={() => updateStatus.mutate({ id: b.id, status: 'cancelled' })}
                    className="px-3 py-1.5 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? '…' : 'Reject'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Overview() {
  const { mode } = useTheme()
  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const { data: bookings = [], isLoading: bLoad } = useAdminBookings()
  const { data: rooms = [],    isLoading: rLoad } = useAdminRooms()
  const isLoading = bLoad || rLoad

  // Trigger animations only once data is ready
  const [chartsVisible, setChartsVisible] = useState(false)
  useEffect(() => {
    if (!isLoading) setTimeout(() => setChartsVisible(true), 200)
  }, [isLoading])

  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms])

  const counts = useMemo(() => ({
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  }), [bookings])

  const revenue = useMemo(() => {
    let confirmed = 0, pending = 0
    for (const b of bookings) {
      const room = roomMap.get(b.room_id)
      if (!room) continue
      const amt = calcNights(b.start_date, b.end_date) * room.price_per_night
      if (b.status === 'confirmed' || b.status === 'completed') confirmed += amt
      else if (b.status === 'pending') pending += amt
    }
    return { confirmed, pending }
  }, [bookings, roomMap])

  const monthly = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const [y, m] = [d.getFullYear(), d.getMonth()]
      const mb = bookings.filter(b => {
        const bd = new Date(b.start_date + 'T00:00:00')
        return bd.getFullYear() === y && bd.getMonth() === m
      })
      const rev = mb.reduce((s, b) => {
        const room = roomMap.get(b.room_id)
        return s + (room ? calcNights(b.start_date, b.end_date) * room.price_per_night : 0)
      }, 0)
      return { label: MONTHS_SHORT[m], count: mb.length, revenue: rev }
    })
  }, [bookings, roomMap])

  const revenueByType = useMemo(() => {
    const map: Record<string, number> = {}
    for (const b of bookings) {
      if (b.status !== 'confirmed' && b.status !== 'completed') continue
      const room = roomMap.get(b.room_id)
      if (!room) continue
      map[room.type] = (map[room.type] ?? 0) + calcNights(b.start_date, b.end_date) * room.price_per_night
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [bookings, roomMap])

  const maxTypeRev = Math.max(...revenueByType.map(([, v]) => v), 1)

  const recent = useMemo(() =>
    [...bookings].sort((a, b) => b.id - a.id).slice(0, 7), [bookings])

  const occupancy = counts.total > 0
    ? Math.round(((counts.confirmed + counts.completed) / counts.total) * 100)
    : 0

  const glowPipeline    = useGlowCard()
  const glowBarChart    = useGlowCard()
  const glowStatus      = useGlowCard()
  const glowRevTrend    = useGlowCard()
  const glowActivity    = useGlowCard()

  const statusRows: { key: BookingStatus; label: string }[] = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pending',   label: 'Pending' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'completed', label: 'Completed' },
  ]

  // ── Export helpers ───────────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0]

  async function exportOverviewReport() {
    await exportOverviewExcel(counts, revenue, monthly, revenueByType, occupancy, `ejust-overview-report-${today}`)
  }

  async function exportMonthlyChart() {
    await exportMonthlyChartExcel(monthly, `ejust-monthly-bookings-${today}`)
  }

  async function exportRevenueTrend() {
    await exportRevenueTrendExcel(monthly, revenueByType, `ejust-revenue-trend-${today}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between" style={{ animation: 'slideUp 0.4s ease both' }}>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-1">Dashboard</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Overview</h1>
        </div>
        {!isLoading && (
          <ExportButton label="Export Report" onClick={exportOverviewReport} />
        )}
      </div>

      {/* ── Booking stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={isLoading} delay={80}  label="Total Bookings" target={counts.total}     accent="text-white"       sub={`${rooms.length} rooms registered`} />
        <StatCard loading={isLoading} delay={160} label="Confirmed"      target={counts.confirmed}  accent="text-emerald-400" sub={`${occupancy}% occupancy rate`} />
        <StatCard loading={isLoading} delay={240} label="Pending"        target={counts.pending}    accent="text-amber-400"   sub="Awaiting confirmation" />
        <StatCard loading={isLoading} delay={320} label="Cancelled"      target={counts.cancelled}  accent="text-red-400"     sub={`${counts.completed} completed`} />
      </div>

      {/* ── Today + Pending ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TodayAgenda bookings={bookings} roomMap={roomMap} loading={isLoading} />
        <PendingApprovals bookings={bookings} roomMap={roomMap} loading={isLoading} />
      </div>

      {/* ── Revenue cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <RevenueCard
          loading={isLoading} delay={400}
          label="Confirmed Revenue" amount={revenue.confirmed}
          sub="From confirmed & completed bookings"
          accent="text-emerald-400"
          borderColor="border-emerald-500/[0.15]"
          bgColor="bg-emerald-500/[0.03]"
        />
        <RevenueCard
          loading={isLoading} delay={480}
          label="Pending Revenue" amount={revenue.pending}
          sub="Awaiting confirmation"
          accent="text-amber-400"
          borderColor="border-amber-500/[0.15]"
          bgColor="bg-amber-500/[0.03]"
        />
        {/* Total revenue */}
        <div
          ref={glowPipeline.ref}
          onMouseMove={glowPipeline.onMouseMove}
          onMouseLeave={glowPipeline.onMouseLeave}
          className="card-float glass rounded-2xl p-5 border border-white/[0.06] shadow-glass relative overflow-hidden"
          style={{ animation: `slideUp 0.55s cubic-bezier(0.16,1,0.3,1) 560ms both` }}
        >
          <p className="text-[11px] text-white/35 uppercase tracking-wider font-medium mb-3">Total Pipeline</p>
          {isLoading
            ? <div className="h-9 w-28 bg-white/[0.06] rounded-lg animate-pulse" />
            : <p className="text-4xl font-bold tracking-tight text-white">{fmtEGP(revenue.confirmed + revenue.pending)}</p>
          }
          <p className="text-xs text-white/25 mt-1.5">Confirmed + pending combined</p>
        </div>
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly bookings bar chart */}
        <div
          ref={glowBarChart.ref}
          onMouseMove={glowBarChart.onMouseMove}
          onMouseLeave={glowBarChart.onMouseLeave}
          className="card-float lg:col-span-2 glass rounded-2xl p-5 border border-white/[0.06] shadow-glass"
          style={{ animation: 'slideUp 0.55s cubic-bezier(0.16,1,0.3,1) 200ms both' }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-white">Monthly Bookings</p>
              <p className="text-xs text-white/30 mt-0.5">Check-ins per month</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/20 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/[0.05]">
                Last 6 months
              </span>
              {!isLoading && <ExportButton variant="icon" label="Export chart data" onClick={exportMonthlyChart} />}
            </div>
          </div>
          {isLoading
            ? <div className="h-40 bg-white/[0.03] rounded-xl animate-pulse" />
            : <BarChart data={monthly} visible={chartsVisible} isDark={isDark} />
          }
        </div>

        {/* Status breakdown */}
        <div
          ref={glowStatus.ref}
          onMouseMove={glowStatus.onMouseMove}
          onMouseLeave={glowStatus.onMouseLeave}
          className="card-float glass rounded-2xl p-5 border border-white/[0.06] shadow-glass"
          style={{ animation: 'slideUp 0.55s cubic-bezier(0.16,1,0.3,1) 300ms both' }}
        >
          <p className="text-sm font-semibold text-white mb-0.5">Status Breakdown</p>
          <p className="text-xs text-white/30 mb-5">Proportion across all bookings</p>

          {!isLoading && counts.total > 0
            ? (
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-5">
                {statusRows.map(({ key }) => counts[key] > 0 && (
                  <div key={key} className={`${STATUS_STYLE[key].bar} transition-all duration-700`}
                    style={{ width: `${(counts[key] / counts.total) * 100}%` }} />
                ))}
              </div>
            )
            : <div className="h-2 bg-white/[0.06] rounded-full animate-pulse mb-5" />
          }

          <div className="space-y-3.5">
            {statusRows.map(({ key, label }, i) => (
              <div key={key} className="flex items-center gap-3"
                style={{ animation: chartsVisible ? `slideUpFast 0.4s ease ${i * 70}ms both` : 'none' }}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_STYLE[key].bar}`} />
                <span className="text-xs text-white/45 flex-1">{label}</span>
                <div className="w-20 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  {!isLoading && counts.total > 0 && (
                    <div className={`h-full rounded-full ${STATUS_STYLE[key].bar}`}
                      style={{
                        width: `${(counts[key] / counts.total) * 100}%`,
                        transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                        transitionDelay: `${i * 100 + 200}ms`,
                      }} />
                  )}
                </div>
                <span className={`text-sm font-bold w-7 text-right ${STATUS_STYLE[key].text}`}>
                  {isLoading ? '—' : counts[key]}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-xs text-white/25">Total bookings</span>
            <span className="text-sm font-bold text-white">{isLoading ? '—' : counts.total}</span>
          </div>
        </div>
      </div>

      {/* ── Revenue trend + Activity ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Revenue trend + by-type bars */}
        <div
          ref={glowRevTrend.ref}
          onMouseMove={glowRevTrend.onMouseMove}
          onMouseLeave={glowRevTrend.onMouseLeave}
          className="card-float glass rounded-2xl p-5 border border-white/[0.06] shadow-glass space-y-5"
          style={{ animation: 'slideUp 0.55s cubic-bezier(0.16,1,0.3,1) 350ms both' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Revenue Trend</p>
              <p className="text-xs text-white/30 mt-0.5">Monthly confirmed revenue</p>
            </div>
            {!isLoading && <ExportButton variant="icon" label="Export revenue data" onClick={exportRevenueTrend} />}
          </div>
          {isLoading
            ? <div className="h-24 bg-white/[0.03] rounded-xl animate-pulse" />
            : <LineChart data={monthly.map(m => ({ label: m.label, value: m.revenue }))} visible={chartsVisible} isDark={isDark} />
          }

          {!isLoading && revenueByType.length > 0 && (
            <div className="pt-4 border-t border-white/[0.05] space-y-3">
              <p className="text-[11px] text-white/25 uppercase tracking-widest">By room type</p>
              {revenueByType.map(([type, amount], i) => (
                <div key={type} className="space-y-1.5"
                  style={{ animation: chartsVisible ? `slideUpFast 0.4s ease ${i * 80}ms both` : 'none' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TYPE_COLOR[type as RoomType] ?? '#B30000' }} />
                      <span className="text-xs text-white/50 capitalize">{type}</span>
                    </div>
                    <span className="text-xs font-semibold text-white/70">{fmtEGP(amount)}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{
                        backgroundColor: TYPE_COLOR[type as RoomType] ?? '#B30000',
                        width: chartsVisible ? `${(amount / maxTypeRev) * 100}%` : '0%',
                        transition: `width 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 100 + 200}ms`,
                      }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity feed */}
        <div
          ref={glowActivity.ref}
          onMouseMove={glowActivity.onMouseMove}
          onMouseLeave={glowActivity.onMouseLeave}
          className="card-float glass rounded-2xl border border-white/[0.06] shadow-glass overflow-hidden flex flex-col"
          style={{ animation: 'slideUp 0.55s cubic-bezier(0.16,1,0.3,1) 430ms both' }}
        >
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white">Recent Activity</p>
            <p className="text-xs text-white/30 mt-0.5">Latest bookings in the system</p>
          </div>

          <div className="divide-y divide-white/[0.04] flex-1">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-28 bg-white/[0.06] rounded animate-pulse" />
                    <div className="h-2.5 w-20 bg-white/[0.04] rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-16 bg-white/[0.06] rounded-full animate-pulse" />
                </div>
              ))
              : recent.length === 0
                ? (
                  <div className="px-5 py-16 text-center text-sm text-white/25 flex flex-col items-center gap-3">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/15">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                    No bookings yet
                  </div>
                )
                : recent.map((b, i) => {
                  const st = STATUS_STYLE[b.status]
                  const initials = b.guest_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                  const nights = calcNights(b.start_date, b.end_date)
                  const room = roomMap.get(b.room_id)
                  const amt = room ? nights * room.price_per_night : null
                  const statusLabel = b.status.charAt(0).toUpperCase() + b.status.slice(1)

                  return (
                    <div key={b.id}
                      className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.025] transition-colors"
                      style={{ animation: chartsVisible ? `slideUpFast 0.4s ease ${i * 60}ms both` : 'none' }}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/25 flex items-center justify-center text-primary text-[11px] font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{b.guest_name}</p>
                        <p className="text-xs text-white/30">
                          Room {b.room_id} &middot; {nights}n &middot; {b.start_date}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${st.badge}`}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {statusLabel}
                        </span>
                        {amt !== null && (
                          <span className="text-[11px] text-white/25">{fmtEGP(amt)}</span>
                        )}
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>
      </div>
    </div>
  )
}
