import { useEffect, useState } from 'react'
import CustomSelect from '../../components/CustomSelect'
import { useAdminBookings, useAdminRooms, useCreateRoom, useDeleteRoom, useUpdateRoom } from '../../hooks/useAdminApi'
import type { Booking, Room, RoomCreate, RoomType, RoomUpdate } from '../../types/admin'

const ROOM_TYPES: RoomType[] = ['single', 'double', 'suite', 'family']

const TYPE_CONFIG: Record<RoomType, { label: string; dot: string; className: string }> = {
  single:  { label: 'Single',  dot: 'bg-blue-400',   className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  double:  { label: 'Double',  dot: 'bg-purple-400', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  suite:   { label: 'Suite',   dot: 'bg-amber-400',  className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  family:  { label: 'Family',  dot: 'bg-emerald-400',className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
}

const TYPE_COLOR: Record<string, string> = {
  single: '#60a5fa', double: '#a78bfa', suite: '#fbbf24', family: '#34d399',
}

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  completed: 'bg-white/5 text-white/40 border-white/10',
}

function fmtEGP(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M EGP`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K EGP`
  return `${Math.round(n).toLocaleString('en-EG')} EGP`
}

function nights(start: string, end: string) {
  return Math.max(0, Math.round(
    (new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86_400_000,
  ))
}

const emptyForm: RoomCreate = { room_number: '', type: 'single', price_per_night: 0 }
type FormErrors = Partial<Record<keyof RoomCreate, string>>

function InputField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}

const inputClass =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all'

// ─── Room Detail Modal ────────────────────────────────────────────────────────

function RoomDetailModal({
  room,
  bookings,
  onClose,
  onEdit,
  onDelete,
}: {
  room: Room
  bookings: Booking[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
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

  const tc = TYPE_CONFIG[room.type as RoomType] ?? TYPE_CONFIG.single
  const typeColor = TYPE_COLOR[room.type] ?? '#B30000'
  const today = new Date().toISOString().split('T')[0]

  const roomBookings = bookings.filter(b => b.room_id === room.id)

  const upcoming = roomBookings
    .filter(b => b.end_date > today && (b.status === 'pending' || b.status === 'confirmed'))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  const past = roomBookings
    .filter(b => b.end_date <= today || b.status === 'completed' || b.status === 'cancelled')
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .slice(0, 5)

  const occupiedToday = roomBookings.find(
    b => b.start_date <= today && b.end_date > today && (b.status === 'confirmed' || b.status === 'pending'),
  )

  const totalRevenue = roomBookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + nights(b.start_date, b.end_date) * room.price_per_night, 0)

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-[280ms] ${
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`relative w-full max-w-lg glass-strong rounded-2xl pointer-events-auto flex flex-col transform transition-all duration-[280ms] ease-out ${
            visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          }`}
          style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)', maxHeight: '85vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${typeColor}18`, border: `1px solid ${typeColor}30` }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  style={{ color: typeColor }}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white">Room {room.room_number}</h2>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${tc.className}`}>
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {tc.label}
                  </span>
                </div>
                <p className="text-sm text-white/40 mt-0.5">
                  {room.price_per_night.toLocaleString('en-EG')} EGP / night
                </p>
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

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto scroll-area-viewport px-6 py-5 space-y-5 min-h-0">

            {/* Status + stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3.5 rounded-xl border text-center ${
                occupiedToday
                  ? 'bg-red-500/[0.07] border-red-500/[0.18]'
                  : upcoming.length > 0
                    ? 'bg-amber-500/[0.07] border-amber-500/[0.18]'
                    : 'bg-emerald-500/[0.07] border-emerald-500/[0.18]'
              }`}>
                <p className={`text-xs font-semibold ${
                  occupiedToday ? 'text-red-400' : upcoming.length > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {occupiedToday ? 'Occupied' : upcoming.length > 0 ? 'Booked Soon' : 'Available'}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">Today</p>
              </div>
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-center">
                <p className="text-xl font-bold text-white">{roomBookings.length}</p>
                <p className="text-[10px] text-white/30 mt-0.5">Total bookings</p>
              </div>
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-center">
                <p className="text-sm font-bold text-white leading-tight">{fmtEGP(totalRevenue)}</p>
                <p className="text-[10px] text-white/30 mt-0.5">Revenue</p>
              </div>
            </div>

            {/* Upcoming reservations */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium">Upcoming Reservations</p>
                {upcoming.length > 0 && (
                  <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold rounded-full">
                    {upcoming.length}
                  </span>
                )}
              </div>
              {upcoming.length === 0 ? (
                <div className="flex items-center justify-center py-7 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01]">
                  <p className="text-xs text-white/25">No upcoming reservations</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map(b => {
                    const n = nights(b.start_date, b.end_date)
                    const initials = b.guest_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                    return (
                      <div key={b.id} className="flex items-center gap-3 p-3.5 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                        <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary text-[11px] font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{b.guest_name}</p>
                          <p className="text-xs text-white/35">
                            {b.start_date} → {b.end_date}
                            <span className="text-white/20"> · </span>
                            {n} night{n !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${STATUS_BADGE[b.status] ?? ''}`}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Recent history */}
            {past.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-3">Recent History</p>
                <div className="space-y-1.5">
                  {past.map(b => {
                    const n = nights(b.start_date, b.end_date)
                    const initials = b.guest_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
                    return (
                      <div key={b.id} className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                        <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/30 text-[10px] font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/60 truncate">{b.guest_name}</p>
                          <p className="text-[11px] text-white/25">{b.start_date} · {n}n</p>
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[b.status] ?? ''}`}>
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-white/[0.06] flex gap-2 shrink-0">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 text-sm font-medium text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl transition-all"
            >
              Close
            </button>
            <button
              onClick={() => { setVisible(false); setTimeout(() => { onClose(); onEdit() }, 280) }}
              className="flex-1 py-2.5 text-sm font-semibold text-white/80 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.10] rounded-xl transition-all"
            >
              Edit Room
            </button>
            <button
              onClick={() => { setVisible(false); setTimeout(() => { onClose(); onDelete() }, 280) }}
              className="px-5 py-2.5 text-sm font-semibold text-red-400 bg-red-500/[0.08] hover:bg-red-500/20 border border-red-500/[0.15] rounded-xl transition-all"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({
  room,
  onConfirm,
  onCancel,
  isPending,
}: {
  room: Room
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  const tc = TYPE_CONFIG[room.type as RoomType] ?? TYPE_CONFIG.single
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm glass-strong rounded-2xl shadow-glass transform animate-[slideUp_0.25s_ease_both]">
        <div className="px-6 pt-6 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </div>
          <h3 className="text-base font-bold text-white mb-1">Remove Room?</h3>
          <p className="text-sm text-white/40 mb-4">
            Room <span className="text-white/70 font-medium">{room.room_number}</span>{' '}
            (<span className={`text-xs font-semibold ${tc.className.split(' ')[1]}`}>{tc.label}</span>)
            will be hidden from the system. This can be undone by re-activating it in the database.
          </p>
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="flex-1 py-2.5 text-sm font-medium text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl transition-all">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={isPending}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-red-900/30">
              {isPending ? 'Removing…' : 'Remove Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Room Modal ──────────────────────────────────────────────────────────

function EditModal({
  room,
  onSave,
  onClose,
  isPending,
}: {
  room: Room
  onSave: (data: RoomUpdate) => void
  onClose: () => void
  isPending: boolean
}) {
  const [form, setForm] = useState<RoomUpdate>({
    room_number: room.room_number,
    type: room.type as RoomType,
    price_per_night: room.price_per_night,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof RoomUpdate, string>>>({})

  function validate() {
    const e: typeof errors = {}
    if (form.room_number !== undefined && !form.room_number.trim()) e.room_number = 'Room number is required'
    if (form.price_per_night !== undefined && form.price_per_night <= 0) e.price_per_night = 'Price must be greater than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const changed: RoomUpdate = {}
    if (form.room_number !== room.room_number) changed.room_number = form.room_number
    if (form.type !== room.type) changed.type = form.type
    if (form.price_per_night !== room.price_per_night) changed.price_per_night = form.price_per_night
    onSave(changed)
  }

  const isDirty =
    form.room_number !== room.room_number ||
    form.type !== room.type ||
    form.price_per_night !== room.price_per_night

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-strong rounded-2xl shadow-glass transform animate-[slideUp_0.25s_ease_both]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <h2 className="text-base font-semibold text-white">Edit Room</h2>
            <p className="text-xs text-white/30 mt-0.5">Room #{room.room_number}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] flex items-center justify-center text-white/40 hover:text-white transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <InputField label="Room Number" error={errors.room_number}>
            <input type="text" value={form.room_number ?? ''} onChange={(e) => setForm({ ...form, room_number: e.target.value })}
              placeholder="e.g. A101" className={inputClass} />
          </InputField>
          <InputField label="Room Type">
            <CustomSelect value={form.type ?? 'single'} onChange={(v) => setForm({ ...form, type: v as RoomType })}
              options={ROOM_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
          </InputField>
          <InputField label="Price per Night (EGP)" error={errors.price_per_night}>
            <input type="number" min={1} step="0.01" value={form.price_per_night || ''} onChange={(e) => setForm({ ...form, price_per_night: parseFloat(e.target.value) || 0 })}
              placeholder="e.g. 500" className={inputClass} />
          </InputField>
        </form>

        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isPending || !isDirty}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              isDirty
                ? 'bg-primary hover:bg-primary-dark text-white shadow-glow-sm disabled:opacity-50'
                : 'bg-white/[0.04] text-white/20 border border-white/[0.06] cursor-not-allowed'
            }`}>
            {isPending ? 'Saving…' : isDirty ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Rooms() {
  const [addOpen, setAddOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null)
  const [form, setForm] = useState<RoomCreate>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { data: rooms = [] } = useAdminRooms()
  const { data: bookings = [] } = useAdminBookings()
  const createRoom  = useCreateRoom()
  const updateRoom  = useUpdateRoom()
  const deleteRoom  = useDeleteRoom()

  const filtered = rooms.filter((r) => {
    const matchSearch = r.room_number.toLowerCase().includes(search.toLowerCase())
    const matchType   = !typeFilter || r.type === typeFilter
    return matchSearch && matchType
  })

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.room_number.trim()) e.room_number = 'Room number is required'
    if (form.price_per_night <= 0) e.price_per_night = 'Price must be greater than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAdd(evt: React.FormEvent) {
    evt.preventDefault()
    if (!validate()) return
    await createRoom.mutateAsync(form)
    setForm(emptyForm)
    setErrors({})
    setAddOpen(false)
  }

  function handleEdit(data: RoomUpdate) {
    if (!editingRoom) return
    updateRoom.mutate(
      { id: editingRoom.id, data },
      { onSuccess: () => setEditingRoom(null) },
    )
  }

  function handleDelete() {
    if (!deletingRoom) return
    deleteRoom.mutate(deletingRoom.id, { onSuccess: () => setDeletingRoom(null) })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-1">Management</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Rooms</h1>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all shadow-glow-sm hover:shadow-glow-red">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add Room
        </button>
      </div>

      {/* Stats strip */}
      {rooms.length > 0 && (
        <div className="flex items-center gap-4 glass px-4 py-2 rounded-xl w-fit">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{rooms.length}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Total</p>
          </div>
          {ROOM_TYPES.map((t) => {
            const count = rooms.filter((r) => r.type === t).length
            if (!count) return null
            const tc = TYPE_CONFIG[t]
            return (
              <div key={t} className="flex items-center gap-4">
                <div className="w-px h-8 bg-white/[0.07]" />
                <div className="text-center">
                  <p className={`text-lg font-semibold ${tc.className.split(' ')[1]}`}>{count}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">{t}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Search by room number…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all" />
        </div>
        <CustomSelect value={typeFilter} onChange={setTypeFilter}
          options={[{ value: '', label: 'All Types' }, ...ROOM_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))]}
          className="w-40" />
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden shadow-glass">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-sm font-medium text-white/60">Room Inventory</span>
          <span className="text-xs text-white/25">
            {search || typeFilter ? `${filtered.length} of ${rooms.length} rooms` : `${rooms.length} rooms`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['ID', 'Room Number', 'Type', 'Price / Night', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-white/30 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/15">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                      <p className="text-sm text-white/25">
                        {search || typeFilter ? 'No rooms match your filters' : 'No rooms yet. Add one to get started.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((room) => {
                  const tc = TYPE_CONFIG[room.type as RoomType] ?? TYPE_CONFIG.single
                  const isDeleting = deleteRoom.isPending && (deleteRoom.variables as number | undefined) === room.id
                  return (
                    <tr
                      key={room.id}
                      onClick={() => room.id > 0 && setSelectedRoom(room)}
                      className={`transition-colors group ${room.id < 0 || isDeleting ? 'opacity-40' : 'cursor-pointer hover:bg-white/[0.03]'}`}
                    >
                      <td className="px-5 py-4 text-xs font-mono text-white/30">
                        {room.id < 0 ? '…' : `#${room.id}`}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${tc.dot}`} />
                          <span className="text-sm font-semibold text-white group-hover:text-primary/90 transition-colors">
                            {room.room_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tc.className}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {tc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-white">
                          {room.price_per_night.toLocaleString('en-EG')}
                        </span>
                        <span className="text-white/30 ml-1 text-xs">EGP / night</span>
                      </td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingRoom(room)}
                            disabled={room.id < 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white/50 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] hover:text-white/80 transition-all disabled:opacity-30"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingRoom(room)}
                            disabled={room.id < 0 || isDeleting}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-red-400 bg-red-500/[0.08] border border-red-500/[0.15] hover:bg-red-500/20 transition-all disabled:opacity-30"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                            </svg>
                            {isDeleting ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Room Modal */}
      <div className={`fixed inset-0 z-40 flex items-center justify-center p-4 transition-all duration-300 ${addOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
        <div className={`relative w-full max-w-md glass-strong rounded-2xl shadow-glass transform transition-all duration-300 ${addOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-semibold text-white">Add New Room</h2>
              <p className="text-xs text-white/30 mt-0.5">Fill in the room details below</p>
            </div>
            <button onClick={() => setAddOpen(false)}
              className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form onSubmit={handleAdd} className="px-6 py-6 space-y-5">
            <InputField label="Room Number" error={errors.room_number}>
              <input type="text" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                placeholder="e.g. A101" className={inputClass} />
            </InputField>
            <InputField label="Room Type">
              <CustomSelect value={form.type} onChange={(v) => setForm({ ...form, type: v as RoomType })}
                options={ROOM_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
            </InputField>
            <InputField label="Price per Night (EGP)" error={errors.price_per_night}>
              <input type="number" min={1} step="0.01" value={form.price_per_night || ''} onChange={(e) => setForm({ ...form, price_per_night: parseFloat(e.target.value) || 0 })}
                placeholder="e.g. 500" className={inputClass} />
            </InputField>
            {createRoom.isError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                Failed to create room. Please try again.
              </div>
            )}
          </form>
          <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
            <button type="button" onClick={() => setAddOpen(false)}
              className="flex-1 py-2.5 text-sm font-medium text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl transition-all">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={createRoom.isPending}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-xl transition-all shadow-glow-sm disabled:opacity-50">
              {createRoom.isPending ? 'Saving…' : 'Add Room'}
            </button>
          </div>
        </div>
      </div>

      {/* Room Detail Modal */}
      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          bookings={bookings}
          onClose={() => setSelectedRoom(null)}
          onEdit={() => setEditingRoom(selectedRoom)}
          onDelete={() => setDeletingRoom(selectedRoom)}
        />
      )}

      {/* Edit Room Modal */}
      {editingRoom && (
        <EditModal
          room={editingRoom}
          onSave={handleEdit}
          onClose={() => setEditingRoom(null)}
          isPending={updateRoom.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingRoom && (
        <DeleteModal
          room={deletingRoom}
          onConfirm={handleDelete}
          onCancel={() => setDeletingRoom(null)}
          isPending={deleteRoom.isPending}
        />
      )}
    </div>
  )
}
