import { useEffect, useMemo, useRef, useState } from 'react'
import { useAdminBookings, useAdminRooms } from '../../hooks/useAdminApi'
import { useGlowCard } from '../../hooks/useGlowCard'
import type { BookingStatus, RoomType } from '../../types/admin'

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

function BarChart({ data, visible }: { data: { label: string; count: number }[]; visible: boolean }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 520, H = 170
  const pad = { t: 28, r: 12, b: 32, l: 28 }
  const cw = W - pad.l - pad.r
  const ch = H - pad.t - pad.b
  const slot = cw / data.length
  const gap = slot * 0.38

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
              stroke="white" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="4 4" />
            <text x={pad.l - 6} y={y + 3.5} textAnchor="end"
              fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="system-ui">
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
            {/* Track */}
            <rect x={x} y={pad.t} width={w} height={ch}
              fill="white" fillOpacity="0.015" rx="4" />
            {/* Bar */}
            <rect x={x} y={y} width={w} height={barH} rx="4"
              fill={d.count > 0 ? 'url(#barGrad)' : 'rgba(255,255,255,0.03)'}
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'center bottom',
                animation: visible ? `barGrow 0.65s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both` : 'none',
              }}
            />
            {/* Count label */}
            {d.count > 0 && (
              <text x={x + w / 2} y={y - 7} textAnchor="middle"
                fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="system-ui" fontWeight="600"
                style={{ animation: visible ? `fadeIn 0.4s ease ${delay + 300}ms both` : 'none' }}>
                {d.count}
              </text>
            )}
            {/* Month label */}
            <text x={x + w / 2} y={H - 7} textAnchor="middle"
              fill="rgba(255,255,255,0.25)" fontSize="10" fontFamily="system-ui">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Line/area chart ─────────────────────────────────────────────────────────

function LineChart({ data, visible }: { data: { label: string; value: number }[]; visible: boolean }) {
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
            fill="rgba(255,255,255,0.25)" fontSize="10" fontFamily="system-ui">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Overview() {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ animation: 'slideUp 0.4s ease both' }}>
        <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-1">Dashboard</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Overview</h1>
      </div>

      {/* ── Booking stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={isLoading} delay={80}  label="Total Bookings" target={counts.total}     accent="text-white"       sub={`${rooms.length} rooms registered`} />
        <StatCard loading={isLoading} delay={160} label="Confirmed"      target={counts.confirmed}  accent="text-emerald-400" sub={`${occupancy}% occupancy rate`} />
        <StatCard loading={isLoading} delay={240} label="Pending"        target={counts.pending}    accent="text-amber-400"   sub="Awaiting confirmation" />
        <StatCard loading={isLoading} delay={320} label="Cancelled"      target={counts.cancelled}  accent="text-red-400"     sub={`${counts.completed} completed`} />
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
            <span className="text-[10px] font-mono text-white/20 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/[0.05]">
              Last 6 months
            </span>
          </div>
          {isLoading
            ? <div className="h-40 bg-white/[0.03] rounded-xl animate-pulse" />
            : <BarChart data={monthly} visible={chartsVisible} />
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
          <div>
            <p className="text-sm font-semibold text-white">Revenue Trend</p>
            <p className="text-xs text-white/30 mt-0.5">Monthly confirmed revenue</p>
          </div>
          {isLoading
            ? <div className="h-24 bg-white/[0.03] rounded-xl animate-pulse" />
            : <LineChart data={monthly.map(m => ({ label: m.label, value: m.revenue }))} visible={chartsVisible} />
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
