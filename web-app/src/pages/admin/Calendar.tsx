import { useEffect, useMemo, useRef, useState } from 'react'
import { useAdminBookings, useAdminRooms } from '../../hooks/useAdminApi'
import { useTheme } from '../../contexts/ThemeContext'
import type { Booking, BookingStatus, Room } from '../../types/admin'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<BookingStatus, { bg: string; border: string; text: string }> = {
  confirmed: { bg: 'rgba(16,185,129,0.18)',  border: 'rgba(16,185,129,0.35)',  text: '#34d399' },
  pending:   { bg: 'rgba(245,158,11,0.18)',  border: 'rgba(245,158,11,0.35)',  text: '#fbbf24' },
  completed: { bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.30)', text: '#94a3b8' },
  cancelled: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.30)',   text: '#f87171' },
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: 'Confirmed', pending: 'Pending', completed: 'Completed', cancelled: 'Cancelled',
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const DAY_W   = 72   // px — normal day column
const TODAY_W = 108  // px — today's column (wider)
const ROW_H   = 56   // px per room row
const LEFT_W  = 168  // px for sticky room name column

// ─── Booking Detail Popup ─────────────────────────────────────────────────────

function BookingPopup({
  booking,
  room,
  anchorRef,
  onClose,
}: {
  booking: Booking
  room: Room | undefined
  anchorRef: { x: number; y: number }
  onClose: () => void
}) {
  const col = STATUS_COLOR[booking.status]
  const nights = Math.max(0, Math.round(
    (new Date(booking.end_date + 'T00:00').getTime() - new Date(booking.start_date + 'T00:00').getTime()) / 86_400_000,
  ))
  const cost = room ? nights * room.price_per_night : null

  const POPUP_W = 288
  const POPUP_H = 280 // conservative estimate
  const MARGIN  = 12

  const rawLeft = anchorRef.x
  const rawTop  = anchorRef.y + MARGIN

  const left = Math.min(rawLeft, window.innerWidth  - POPUP_W - MARGIN)
  const top  = rawTop + POPUP_H > window.innerHeight - MARGIN
    ? Math.max(MARGIN, anchorRef.y - POPUP_H - MARGIN)  // flip above click
    : rawTop

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 glass-strong rounded-2xl p-4 w-72 shadow-[0_24px_60px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.07)]"
        style={{ left, top }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text }}>
            {initials(booking.guest_name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{booking.guest_name}</p>
            <p className="text-[11px]" style={{ color: col.text }}>
              {STATUS_LABEL[booking.status]}
            </p>
          </div>
          <button onClick={onClose}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] hover:bg-white/[0.10] text-white/40 hover:text-white/70 transition-all shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {room && (
            <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
              <span className="text-white/40">Room</span>
              <span className="text-white font-medium">#{room.room_number} · <span className="capitalize">{room.type}</span></span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-white/40">Check-in</span>
            <span className="text-white/80 font-mono">{booking.start_date}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/40">Check-out</span>
            <span className="text-white/80 font-mono">{booking.end_date}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/40">Duration</span>
            <span className="text-white/80">{nights} night{nights !== 1 ? 's' : ''}</span>
          </div>
          {cost !== null && (
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <span className="text-white/40">Total</span>
              <span className="font-semibold" style={{ color: col.text }}>
                {cost >= 1000 ? `${(cost / 1000).toFixed(1)}K` : cost.toLocaleString('en-EG')} EGP
              </span>
            </div>
          )}
          {booking.guest_email && (
            <div className="flex items-center justify-between">
              <span className="text-white/40">Email</span>
              <span className="text-white/60 truncate max-w-[160px]">{booking.guest_email}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items: { status: BookingStatus; label: string }[] = [
    { status: 'confirmed', label: 'Confirmed' },
    { status: 'pending',   label: 'Pending' },
    { status: 'completed', label: 'Completed' },
    { status: 'cancelled', label: 'Cancelled' },
  ]
  return (
    <div className="flex items-center gap-4">
      {items.map(({ status, label }) => {
        const c = STATUS_COLOR[status]
        return (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: c.bg, border: `1px solid ${c.border}` }} />
            <span className="text-[11px] text-white/40">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Calendar() {
  const { mode } = useTheme()
  // Re-reads when mode changes so isDark stays in sync with the toggled .dark class
  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const { data: rooms = [], isLoading: roomsLoading } = useAdminRooms()
  const { data: bookings = [], isLoading: bookingsLoading } = useAdminBookings()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [popup, setPopup] = useState<{ booking: Booking; x: number; y: number } | null>(null)
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const numDays = daysInMonth(year, month)
  const todayStr = today.toISOString().split('T')[0]

  // Returns the column width for day d in the currently displayed month
  function dayW(d: number) {
    return toDateStr(year, month, d) === todayStr ? TODAY_W : DAY_W
  }

  // Left-pixel offset of day d inside the scrollable grid (excluding LEFT_W)
  function dayOffset(d: number) {
    let offset = 0
    for (let i = 1; i < d; i++) offset += dayW(i)
    return offset
  }

  // Total inner grid width
  function gridWidth() {
    let w = 0
    for (let i = 1; i <= numDays; i++) w += dayW(i)
    return LEFT_W + w
  }

  function scrollToToday() {
    const el = scrollRef.current
    if (!el) return
    const todayDay = today.getDate()
    const todayLeft = LEFT_W + dayOffset(todayDay)
    const w = dayW(todayDay)
    const center = todayLeft - el.clientWidth / 2 + w / 2
    el.scrollTo({ left: Math.max(0, center), behavior: 'smooth' })
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    // scroll after the state update renders
    setTimeout(scrollToToday, 50)
  }

  // Scroll to today on first render
  useEffect(() => {
    setTimeout(scrollToToday, 100)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // For each room, map each occupied day to its booking
  const roomDayMap = useMemo(() => {
    const map = new Map<number, Map<string, Booking>>()
    for (const room of rooms) map.set(room.id, new Map())
    const filtered = statusFilter ? bookings.filter(b => b.status === statusFilter) : bookings
    for (const b of filtered) {
      const dayMap = map.get(b.room_id)
      if (!dayMap) continue
      const start = new Date(b.start_date + 'T00:00')
      const end   = new Date(b.end_date   + 'T00:00')
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const str = d.toISOString().split('T')[0]
        dayMap.set(str, b)
      }
    }
    return map
  }, [rooms, bookings, statusFilter])

  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms])

  function handleCellClick(booking: Booking, e: React.MouseEvent) {
    e.stopPropagation()
    setPopup({ booking, x: e.clientX, y: e.clientY })
  }

  // Occupancy stats for current month
  const stats = useMemo(() => {
    const totalSlots = rooms.length * numDays
    let occupied = 0
    for (const [roomId, dayMap] of roomDayMap) {
      for (let d = 1; d <= numDays; d++) {
        const str = toDateStr(year, month, d)
        const b = dayMap.get(str)
        if (b && (b.status === 'confirmed' || b.status === 'pending')) occupied++
      }
      void roomId
    }
    return { occupied, totalSlots, pct: totalSlots > 0 ? Math.round((occupied / totalSlots) * 100) : 0 }
  }, [roomDayMap, rooms, numDays, year, month])

  const isLoading = roomsLoading || bookingsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-1">Occupancy</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Room Calendar</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Occupancy stat */}
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-3">
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{stats.pct}%</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Occupancy</p>
            </div>
            <div className="w-px h-8 bg-white/[0.07]" />
            <div className="text-center">
              <p className="text-lg font-semibold text-emerald-400">{stats.occupied}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Booked Days</p>
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 glass px-2 py-1.5 rounded-xl">
            {(['', 'confirmed', 'pending', 'completed', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-primary/20 text-primary'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Month nav + legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl glass border border-white/[0.08] text-white/40 hover:text-white/80 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="min-w-[180px] text-center">
            <span className="text-lg font-semibold text-white">{MONTH_NAMES[month]} {year}</span>
          </div>
          <button onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-xl glass border border-white/[0.08] text-white/40 hover:text-white/80 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button onClick={goToday}
            className="px-3 py-1.5 rounded-xl text-[11px] font-medium glass border border-white/[0.08] text-white/40 hover:text-white/70 transition-all">
            Today
          </button>
        </div>
        <Legend />
      </div>

      {/* Calendar grid */}
      <div className="glass rounded-2xl overflow-hidden shadow-glass">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-white/20 animate-spin">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
              </svg>
              <p className="text-sm text-white/25">Loading calendar…</p>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/15">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <p className="text-sm text-white/25">No rooms configured yet</p>
          </div>
        ) : (
          <div ref={scrollRef} className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '68vh' }}>
            <div style={{ width: gridWidth() }}>
              {/* Header row: day numbers */}
              <div
                className="flex sticky top-0 z-20 border-b border-white/[0.06]"
                style={{ paddingLeft: LEFT_W, background: isDark ? '#0f0f0f' : '#f4f4f8' }}
              >
                {/* Sticky corner */}
                <div
                  className="absolute left-0 top-0 flex items-center px-4 border-r border-white/[0.06]"
                  style={{ width: LEFT_W, height: ROW_H, background: isDark ? '#0f0f0f' : '#d8d8e4' }}
                >
                  <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Room</span>
                </div>

                {Array.from({ length: numDays }, (_, i) => {
                  const d = i + 1
                  const str = toDateStr(year, month, d)
                  const isToday = str === todayStr
                  const dow = new Date(str).getDay()
                  const isWeekend = dow === 5 || dow === 6
                  const colW = dayW(d)

                  return (
                    <div
                      key={d}
                      className={`flex flex-col items-center justify-center shrink-0 border-r transition-all ${
                        isToday ? 'border-primary/30 bg-primary/[0.06]' : 'border-white/[0.04]'
                      }`}
                      style={{ width: colW, height: ROW_H }}
                    >
                      <span className={`font-medium uppercase tracking-wide ${
                        isToday ? 'text-[11px] text-primary/80' : isWeekend ? 'text-[10px] text-primary/50' : 'text-[10px] text-white/25'
                      }`}>
                        {DOW[dow]}
                      </span>
                      <span className={`font-bold mt-0.5 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'text-base w-8 h-8 bg-primary text-white shadow-[0_0_12px_rgba(179,0,0,0.5)]'
                          : isWeekend
                            ? 'text-sm w-6 h-6 text-primary/60'
                            : 'text-sm w-6 h-6 text-white/55'
                      }`}>
                        {d}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-semibold text-primary/70 uppercase tracking-widest mt-0.5">
                          Today
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Room rows */}
              {rooms.map((room, rowIdx) => {
                const dayMap = roomDayMap.get(room.id) ?? new Map<string, Booking>()
                const isEven = rowIdx % 2 === 0

                return (
                  <div
                    key={room.id}
                    className="flex relative"
                    style={{ height: ROW_H, background: isEven ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                  >
                    {/* Sticky room label */}
                    <div
                      className="sticky left-0 z-10 flex items-center gap-2.5 px-4 border-r border-b border-white/[0.05] shrink-0"
                      style={{
                        width: LEFT_W,
                        background: isEven
                          ? (isDark ? '#111111' : '#e4e4ee')
                          : (isDark ? '#0d0d0d' : '#dcdce8'),
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: { single: '#60a5fa', double: '#a78bfa', suite: '#fbbf24', family: '#34d399' }[room.type] ?? '#fff' }}
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-white/80 leading-none truncate">Room {room.room_number}</p>
                        <p className="text-[10px] text-white/30 capitalize mt-0.5">{room.type}</p>
                      </div>
                    </div>

                    {/* Day cells */}
                    {Array.from({ length: numDays }, (_, i) => {
                      const d = i + 1
                      const str = toDateStr(year, month, d)
                      const booking = dayMap.get(str)
                      const isToday = str === todayStr
                      const isFirstDay = booking && booking.start_date === str
                      const isLastDay  = booking && booking.end_date === toDateStr(year, month, d + 1)
                      const colW = dayW(d)

                      return (
                        <div
                          key={d}
                          className={`relative border-b shrink-0 ${isToday ? 'border-r border-primary/20' : 'border-r border-white/[0.03]'}`}
                          style={{ width: colW, height: ROW_H }}
                        >
                          {/* Today column highlight */}
                          {isToday && (
                            <div className="absolute inset-0 pointer-events-none"
                              style={{ background: 'rgba(179,0,0,0.055)' }} />
                          )}

                          {/* Booking block */}
                          {booking && (
                            <button
                              onClick={(e) => handleCellClick(booking, e)}
                              className="absolute inset-y-2 z-10 cursor-pointer transition-all hover:brightness-125 hover:z-20 overflow-hidden"
                              style={{
                                left: isFirstDay ? 3 : 0,
                                right: isLastDay ? 3 : 0,
                                background: STATUS_COLOR[booking.status].bg,
                                borderTop: `1px solid ${STATUS_COLOR[booking.status].border}`,
                                borderBottom: `1px solid ${STATUS_COLOR[booking.status].border}`,
                                borderLeft: isFirstDay ? `3px solid ${STATUS_COLOR[booking.status].border}` : 'none',
                                borderRight: isLastDay ? `1px solid ${STATUS_COLOR[booking.status].border}` : 'none',
                                borderRadius: isFirstDay && isLastDay ? 6 : isFirstDay ? '6px 0 0 6px' : isLastDay ? '0 6px 6px 0' : 0,
                              }}
                            >
                              {isFirstDay && (
                                <span
                                  className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold whitespace-nowrap"
                                  style={{ color: STATUS_COLOR[booking.status].text }}
                                >
                                  {booking.guest_name.split(' ')[0]}
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Popup */}
      {popup && (
        <BookingPopup
          booking={popup.booking}
          room={roomMap.get(popup.booking.room_id)}
          anchorRef={{ x: popup.x, y: popup.y }}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
