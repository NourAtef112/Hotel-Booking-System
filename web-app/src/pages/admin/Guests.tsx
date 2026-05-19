import { useMemo, useState } from 'react'
import { useAdminBookings, useAdminRooms } from '../../hooks/useAdminApi'
import type { Booking, BookingStatus } from '../../types/admin'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function fmtEGP(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M EGP`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K EGP`
  return `${Math.round(n).toLocaleString('en-EG')} EGP`
}

function nights(start: string, end: string) {
  return Math.max(0, Math.round(
    (new Date(end + 'T00:00').getTime() - new Date(start + 'T00:00').getTime()) / 86_400_000,
  ))
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  confirmed: { label: 'Confirmed', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  completed: { label: 'Completed', className: 'bg-white/5 text-white/40 border-white/10' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuestRecord {
  key: string
  name: string
  email: string
  phone: string
  bookings: Booking[]
  totalNights: number
  totalSpent: number
  lastVisit: string
  firstVisit: string
}

// ─── Guest Card ───────────────────────────────────────────────────────────────

function GuestCard({
  guest,
  expanded,
  onToggle,
  roomMap,
}: {
  guest: GuestRecord
  expanded: boolean
  onToggle: () => void
  roomMap: Map<number, { room_number: string; type: string; price_per_night: number }>
}) {
  const confirmedCount = guest.bookings.filter(b => b.status === 'confirmed').length
  const pendingCount   = guest.bookings.filter(b => b.status === 'pending').length

  // Hue from name for avatar color
  const hue = guest.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  const avatarStyle = {
    background: `hsl(${hue},45%,22%)`,
    border: `1px solid hsl(${hue},50%,32%)`,
    color: `hsl(${hue},70%,72%)`,
  }

  return (
    <div className="glass rounded-2xl overflow-hidden transition-all duration-200 hover:border-white/[0.10]"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Avatar */}
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0" style={avatarStyle}>
          {initials(guest.name)}
        </div>

        {/* Name + contact */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{guest.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {guest.email && (
              <span className="text-[11px] text-white/35 truncate">{guest.email}</span>
            )}
            {guest.phone && (
              <span className="text-[11px] text-white/25 shrink-0">{guest.phone}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-6 shrink-0">
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{guest.bookings.length}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Stays</p>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{guest.totalNights}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Nights</p>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div className="text-center">
            <p className="text-sm font-semibold text-emerald-400">{fmtEGP(guest.totalSpent)}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Spent</p>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{guest.lastVisit}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Last Visit</p>
          </div>
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          {confirmedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {confirmedCount} confirmed
            </span>
          )}
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* Chevron */}
        <div className={`ml-1 shrink-0 text-white/25 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expanded booking history */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-5 py-4">
          <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium mb-3">Booking History</p>
          <div className="space-y-2">
            {[...guest.bookings].sort((a, b) => b.start_date.localeCompare(a.start_date)).map((b) => {
              const room = roomMap.get(b.room_id)
              const n = nights(b.start_date, b.end_date)
              const cost = room ? n * room.price_per_night : null
              const st = STATUS_CONFIG[b.status]

              return (
                <div key={b.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-white/25">#{b.id}</span>
                      {room ? (
                        <span className="text-xs text-white/70 font-medium">Room {room.room_number}
                          <span className="text-white/30 capitalize ml-1">· {room.type}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-white/40">Room #{b.room_id}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-white/35">
                      <span className="font-mono">{b.start_date}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/20">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                      <span className="font-mono">{b.end_date}</span>
                      <span className="text-white/20">· {n} night{n !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.className} shrink-0`}>
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {st.label}
                  </span>

                  {cost !== null && (
                    <span className="text-xs font-semibold text-white/60 shrink-0">{fmtEGP(cost)}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'stays' | 'nights' | 'spent' | 'lastVisit'

export default function Guests() {
  const { data: bookings = [], isLoading: bookingsLoading } = useAdminBookings()
  const { data: rooms = [], isLoading: roomsLoading } = useAdminRooms()

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('lastVisit')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const roomMap = useMemo(
    () => new Map(rooms.map(r => [r.id, r])),
    [rooms],
  )

  // Group bookings into guest records
  const guests = useMemo((): GuestRecord[] => {
    const map = new Map<string, GuestRecord>()

    for (const b of bookings) {
      // Derive guest key: prefer email, fall back to normalized name
      const key = b.guest_email?.trim()
        ? b.guest_email.toLowerCase().trim()
        : b.guest_name.toLowerCase().trim()

      let rec = map.get(key)
      if (!rec) {
        rec = {
          key,
          name: b.guest_name,
          email: b.guest_email ?? '',
          phone: b.guest_phone ?? '',
          bookings: [],
          totalNights: 0,
          totalSpent: 0,
          lastVisit: b.start_date,
          firstVisit: b.start_date,
        }
        map.set(key, rec)
      }

      rec.bookings.push(b)

      // Fill in missing contact info from later bookings
      if (!rec.email && b.guest_email) rec.email = b.guest_email
      if (!rec.phone && b.guest_phone) rec.phone = b.guest_phone

      const n = nights(b.start_date, b.end_date)
      const room = roomMap.get(b.room_id)
      rec.totalNights += n
      if (room) rec.totalSpent += n * room.price_per_night

      if (b.start_date > rec.lastVisit) rec.lastVisit = b.start_date
      if (b.start_date < rec.firstVisit) rec.firstVisit = b.start_date
    }

    return Array.from(map.values())
  }, [bookings, roomMap])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return guests
      .filter(g =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.phone.includes(q),
      )
      .sort((a, b) => {
        let cmp = 0
        switch (sortKey) {
          case 'name':      cmp = a.name.localeCompare(b.name); break
          case 'stays':     cmp = a.bookings.length - b.bookings.length; break
          case 'nights':    cmp = a.totalNights - b.totalNights; break
          case 'spent':     cmp = a.totalSpent - b.totalSpent; break
          case 'lastVisit': cmp = a.lastVisit.localeCompare(b.lastVisit); break
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [guests, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const isLoading = bookingsLoading || roomsLoading

  const SORT_BUTTONS: { key: SortKey; label: string }[] = [
    { key: 'lastVisit', label: 'Last Visit' },
    { key: 'stays',     label: 'Stays' },
    { key: 'nights',    label: 'Nights' },
    { key: 'spent',     label: 'Spent' },
    { key: 'name',      label: 'Name' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-1">Directory</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Guests</h1>
        </div>

        {!isLoading && (
          <div className="flex items-center gap-3 glass px-4 py-2 rounded-xl">
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{guests.length}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Unique Guests</p>
            </div>
            <div className="w-px h-8 bg-white/[0.07]" />
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{bookings.length}</p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Total Bookings</p>
            </div>
            <div className="w-px h-8 bg-white/[0.07]" />
            <div className="text-center">
              <p className="text-lg font-semibold text-emerald-400">
                {fmtEGP(guests.reduce((s, g) => s + g.totalSpent, 0))}
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Total Revenue</p>
            </div>
          </div>
        )}
      </div>

      {/* Search + sort */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all"
          />
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1 glass px-2 py-1.5 rounded-xl">
          <span className="text-[10px] text-white/25 px-1 mr-1 uppercase tracking-wider">Sort</span>
          {SORT_BUTTONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                sortKey === key
                  ? 'bg-primary/20 text-primary'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              {label}
              {sortKey === key && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                  className={`transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Guest list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 flex items-center gap-4 animate-pulse">
              <div className="w-11 h-11 rounded-2xl bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-white/[0.06] rounded-full w-40" />
                <div className="h-2.5 bg-white/[0.04] rounded-full w-64" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 glass rounded-2xl gap-3">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/15">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <p className="text-sm text-white/25">
            {search ? 'No guests match your search' : 'No guest data yet — bookings will appear here'}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-primary/70 hover:text-primary transition-colors">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((guest) => (
            <GuestCard
              key={guest.key}
              guest={guest}
              expanded={expandedKey === guest.key}
              onToggle={() => setExpandedKey(expandedKey === guest.key ? null : guest.key)}
              roomMap={roomMap}
            />
          ))}
          {filtered.length > 0 && (
            <p className="text-center text-xs text-white/20 pt-2">
              Showing {filtered.length} of {guests.length} guests
            </p>
          )}
        </div>
      )}
    </div>
  )
}
