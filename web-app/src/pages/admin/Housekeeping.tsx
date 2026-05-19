import { useEffect, useMemo, useRef, useState } from 'react'
import { useAdminBookings, useAdminRooms } from '../../hooks/useAdminApi'
import type { Room } from '../../types/admin'

// ─── Types ────────────────────────────────────────────────────────────────────

type HKStatus = 'needs_cleaning' | 'being_cleaned' | 'ready'

interface HKRoom {
  roomId: number
  status: HKStatus
  checkoutDate?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: HKStatus; label: string; desc: string; color: string; icon: React.ReactNode }[] = [
  {
    id: 'needs_cleaning',
    label: 'Needs Cleaning',
    desc: 'Checked out today',
    color: 'text-red-400',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M3 12h18M3 18h18"/>
        <circle cx="20" cy="6" r="2" fill="currentColor" stroke="none" className="text-red-400"/>
      </svg>
    ),
  },
  {
    id: 'being_cleaned',
    label: 'Being Cleaned',
    desc: 'In progress',
    color: 'text-amber-400',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    ),
  },
  {
    id: 'ready',
    label: 'Ready',
    desc: 'Clean & available',
    color: 'text-emerald-400',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
]

const COL_STYLE: Record<HKStatus, { headerBg: string; cardBorder: string; dropBg: string }> = {
  needs_cleaning: {
    headerBg: 'rgba(239,68,68,0.08)',
    cardBorder: 'border-red-500/15',
    dropBg: 'rgba(239,68,68,0.05)',
  },
  being_cleaned: {
    headerBg: 'rgba(245,158,11,0.08)',
    cardBorder: 'border-amber-500/15',
    dropBg: 'rgba(245,158,11,0.05)',
  },
  ready: {
    headerBg: 'rgba(16,185,129,0.08)',
    cardBorder: 'border-emerald-500/15',
    dropBg: 'rgba(16,185,129,0.05)',
  },
}

const TYPE_COLOR: Record<string, string> = {
  single: '#60a5fa', double: '#a78bfa', suite: '#fbbf24', family: '#34d399',
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0]
const STORAGE_KEY = `hk_board_${TODAY}`

function loadBoard(): Record<number, HKStatus> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveBoard(board: Record<number, HKStatus>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
    // Clean up yesterday's key
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    localStorage.removeItem(`hk_board_${yesterday}`)
  } catch {
    // ignore storage errors
  }
}

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({
  room,
  hkRoom,
  isDragging,
  onDragStart,
}: {
  room: Room
  hkRoom: HKRoom
  isDragging: boolean
  onDragStart: () => void
}) {
  const col = COLUMNS.find(c => c.id === hkRoom.status)!

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`
        flex items-center gap-3 p-3.5 rounded-xl border cursor-grab active:cursor-grabbing
        bg-white/[0.03] hover:bg-white/[0.05] transition-all select-none
        ${COL_STYLE[hkRoom.status].cardBorder}
        ${isDragging ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}
      `}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
    >
      {/* Type dot */}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: TYPE_COLOR[room.type] ?? '#fff' }}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-none">Room {room.room_number}</p>
        <p className="text-[11px] text-white/35 capitalize mt-0.5">{room.type}</p>
        {hkRoom.checkoutDate && (
          <p className="text-[10px] text-white/20 mt-0.5">Checked out {hkRoom.checkoutDate}</p>
        )}
      </div>

      {/* Status indicator */}
      <div className={`shrink-0 ${col.color}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.2"/>
        </svg>
      </div>

      {/* Drag handle */}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white/15 shrink-0">
        <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
        <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
        <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
      </svg>
    </div>
  )
}

// ─── Drop Column ──────────────────────────────────────────────────────────────

function DropColumn({
  col,
  rooms,
  hkRooms,
  draggingId,
  onDrop,
  onDragStart,
}: {
  col: (typeof COLUMNS)[number]
  rooms: Map<number, Room>
  hkRooms: HKRoom[]
  draggingId: number | null
  onDrop: (targetStatus: HKStatus) => void
  onDragStart: (id: number) => void
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const style = COL_STYLE[col.id]
  const colRooms = hkRooms.filter(r => r.status === col.id)

  return (
    <div className="flex flex-col flex-1 min-w-[240px]">
      {/* Column header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-t-2xl border border-b-0"
        style={{
          background: style.headerBg,
          borderColor: `${style.cardBorder.replace('border-', '').replace('/15', '')}22`,
        }}
      >
        <span className={col.color}>{col.icon}</span>
        <div>
          <p className={`text-sm font-semibold ${col.color}`}>{col.label}</p>
          <p className="text-[10px] text-white/30">{col.desc}</p>
        </div>
        <div className={`ml-auto w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${col.color}`}
          style={{ background: style.headerBg }}>
          {colRooms.length}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="flex-1 rounded-b-2xl border border-t-0 p-2 space-y-2 transition-all duration-200 min-h-[200px]"
        style={{
          background: isDragOver ? style.dropBg : 'rgba(255,255,255,0.02)',
          borderColor: isDragOver ? style.cardBorder.replace('border-', '').replace('/15', '33') : 'rgba(255,255,255,0.06)',
          boxShadow: isDragOver ? `inset 0 0 20px ${style.dropBg}` : 'none',
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={() => { setIsDragOver(false); onDrop(col.id) }}
      >
        {colRooms.length === 0 ? (
          <div className="h-full flex items-center justify-center py-8">
            <p className="text-[11px] text-white/15 text-center">
              {isDragOver ? 'Drop here' : 'No rooms'}
            </p>
          </div>
        ) : (
          colRooms.map((hkRoom) => {
            const room = rooms.get(hkRoom.roomId)
            if (!room) return null
            return (
              <RoomCard
                key={hkRoom.roomId}
                room={room}
                hkRoom={hkRoom}
                isDragging={draggingId === hkRoom.roomId}
                onDragStart={() => onDragStart(hkRoom.roomId)}
              />
            )
          })
        )}

        {isDragOver && draggingId !== null && (
          <div
            className="rounded-xl border-2 border-dashed h-14 flex items-center justify-center"
            style={{ borderColor: style.cardBorder.replace('border-', '').replace('/15', '44') }}
          >
            <p className="text-[11px]" style={{ color: col.color.replace('text-', '') }}>
              Move here →
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Housekeeping() {
  const { data: rooms = [], isLoading: roomsLoading } = useAdminRooms()
  const { data: bookings = [], isLoading: bookingsLoading } = useAdminBookings()

  const roomMap = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms])

  // Compute which rooms need initial placement
  const checkoutRoomIds = useMemo(() => {
    const ids = new Set<number>()
    for (const b of bookings) {
      if ((b.status === 'confirmed' || b.status === 'completed') && b.end_date === TODAY) {
        ids.add(b.room_id)
      }
    }
    return ids
  }, [bookings])

  const occupiedRooms = useMemo(() => {
    const ids = new Set<number>()
    for (const b of bookings) {
      if (b.status === 'confirmed' && b.start_date <= TODAY && b.end_date > TODAY) {
        ids.add(b.room_id)
      }
    }
    return ids
  }, [bookings])

  // Board state: roomId → HKStatus
  const [board, setBoard] = useState<Record<number, HKStatus>>({})
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || rooms.length === 0) return
    initialized.current = true

    const saved = loadBoard()
    if (saved) {
      setBoard(saved)
      return
    }

    // Default: checkout rooms → needs_cleaning, rest → ready
    const initial: Record<number, HKStatus> = {}
    for (const room of rooms) {
      if (occupiedRooms.has(room.id)) continue // occupied — skip from board
      initial[room.id] = checkoutRoomIds.has(room.id) ? 'needs_cleaning' : 'ready'
    }
    setBoard(initial)
  }, [rooms, checkoutRoomIds, occupiedRooms])

  const draggingIdRef = useRef<number | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)

  function handleDragStart(roomId: number) {
    draggingIdRef.current = roomId
    setDraggingId(roomId)
  }

  function handleDrop(targetStatus: HKStatus) {
    const id = draggingIdRef.current
    if (id === null) return
    setBoard(prev => {
      const next = { ...prev, [id]: targetStatus }
      saveBoard(next)
      return next
    })
    draggingIdRef.current = null
    setDraggingId(null)
  }

  function handleDragEnd() {
    draggingIdRef.current = null
    setDraggingId(null)
  }

  // Build HKRoom list (only non-occupied rooms)
  const hkRooms: HKRoom[] = useMemo(() => {
    return Object.entries(board).map(([id, status]) => ({
      roomId: Number(id),
      status,
      checkoutDate: checkoutRoomIds.has(Number(id)) ? TODAY : undefined,
    }))
  }, [board, checkoutRoomIds])

  function resetToday() {
    const fresh: Record<number, HKStatus> = {}
    for (const room of rooms) {
      if (occupiedRooms.has(room.id)) continue
      fresh[room.id] = checkoutRoomIds.has(room.id) ? 'needs_cleaning' : 'ready'
    }
    setBoard(fresh)
    saveBoard(fresh)
  }

  const isLoading = roomsLoading || bookingsLoading

  const needsCount   = hkRooms.filter(r => r.status === 'needs_cleaning').length
  const cleaningCount = hkRooms.filter(r => r.status === 'being_cleaned').length
  const readyCount   = hkRooms.filter(r => r.status === 'ready').length

  return (
    <div className="space-y-6" onDragEnd={handleDragEnd}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-1">Operations</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Housekeeping</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          {!isLoading && (
            <div className="flex items-center gap-3 glass px-4 py-2 rounded-xl">
              <div className="text-center">
                <p className="text-base font-semibold text-red-400">{needsCount}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">To Clean</p>
              </div>
              <div className="w-px h-7 bg-white/[0.07]" />
              <div className="text-center">
                <p className="text-base font-semibold text-amber-400">{cleaningCount}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">In Progress</p>
              </div>
              <div className="w-px h-7 bg-white/[0.07]" />
              <div className="text-center">
                <p className="text-base font-semibold text-emerald-400">{readyCount}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Ready</p>
              </div>
              {occupiedRooms.size > 0 && (
                <>
                  <div className="w-px h-7 bg-white/[0.07]" />
                  <div className="text-center">
                    <p className="text-base font-semibold text-blue-400">{occupiedRooms.size}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Occupied</p>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={resetToday}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl glass border border-white/[0.08] text-sm text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Reset Today
          </button>
        </div>
      </div>

      {/* Occupied rooms notice */}
      {occupiedRooms.size > 0 && !isLoading && (
        <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-xl bg-blue-500/[0.06] border border-blue-500/15">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400 shrink-0">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <span className="text-xs text-blue-300/70">
            Currently occupied (not on board):&nbsp;
            {Array.from(occupiedRooms).map(id => {
              const r = roomMap.get(id)
              return r ? `Room ${r.room_number}` : `#${id}`
            }).join(', ')}
          </span>
        </div>
      )}

      {/* Hint */}
      <p className="text-[11px] text-white/20 flex items-center gap-1.5">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        Drag and drop rooms between columns · State saved for today and resets each morning
      </p>

      {/* Board */}
      {isLoading ? (
        <div className="flex gap-4">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex-1 glass rounded-2xl p-4 space-y-3 min-h-[300px]">
              <div className="h-4 bg-white/[0.06] rounded-full w-32 animate-pulse" />
              <div className="h-14 bg-white/[0.04] rounded-xl animate-pulse" />
              <div className="h-14 bg-white/[0.04] rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 items-start">
          {COLUMNS.map(col => (
            <DropColumn
              key={col.id}
              col={col}
              rooms={roomMap}
              hkRooms={hkRooms}
              draggingId={draggingId}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
            />
          ))}
        </div>
      )}
    </div>
  )
}
