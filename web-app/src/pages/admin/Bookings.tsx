import { useEffect, useMemo, useRef, useState } from 'react'
import CustomSelect from '../../components/CustomSelect'
import DatePicker from '../../components/DatePicker'
import ExportButton from '../../components/ExportButton'
import PhoneInput from '../../components/PhoneInput'
import { exportBookingsExcel } from '../../lib/exportExcel'
import {
  useAdminBookings,
  useAdminRooms,
  useCreateManualBooking,
  useUpdateBookingStatus,
} from '../../hooks/useAdminApi'
import { useUpdateBooking } from '../../hooks/useAdminApi'
import type { Booking, BookingStatus, BookingUpdate, ManualBookingCreate, Room } from '../../types/admin'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcNights(start: string, end: string) {
  return Math.max(
    0,
    Math.round(
      (new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86_400_000,
    ),
  )
}

function fmtEGP(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M EGP`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K EGP`
  return `${Math.round(n).toLocaleString('en-EG')} EGP`
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  confirmed: { label: 'Confirmed', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  completed: { label: 'Completed', className: 'bg-white/5 text-white/40 border-white/10' },
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
]

const TRANSITIONS: Record<BookingStatus, { status: BookingStatus; label: string; cls: string }[]> = {
  pending: [
    { status: 'confirmed', label: 'Confirm',       cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20' },
    { status: 'cancelled', label: 'Cancel Booking', cls: 'text-red-400 bg-red-500/10 border-red-500/25 hover:bg-red-500/20' },
  ],
  confirmed: [
    { status: 'completed', label: 'Mark Completed', cls: 'text-white/60 bg-white/[0.05] border-white/[0.10] hover:bg-white/[0.09]' },
    { status: 'cancelled', label: 'Cancel Booking', cls: 'text-red-400 bg-red-500/10 border-red-500/25 hover:bg-red-500/20' },
  ],
  cancelled: [
    { status: 'confirmed', label: 'Re-confirm', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20' },
  ],
  completed: [],
}

const ROOM_TYPE_COLOR: Record<string, string> = {
  single: '#60a5fa', double: '#a78bfa', suite: '#fbbf24', family: '#34d399',
}

const emptyBookingForm: ManualBookingCreate = { guest_name: '', guest_email: '', guest_phone: '', room_id: 0, start_date: '', end_date: '' }
type BookingFormErrors = Partial<Record<keyof ManualBookingCreate, string>>

// ─── Room Picker ──────────────────────────────────────────────────────────────

function RoomPickerSelect({
  rooms,
  value,
  onChange,
  unavailableIds = new Set(),
}: {
  rooms: Room[]
  value: number
  onChange: (id: number) => void
  unavailableIds?: Set<number>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected = rooms.find((r) => r.id === value)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-3 w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-sm transition-all duration-200 text-left ${
          open
            ? 'border-primary/50 bg-white/[0.06]'
            : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06]'
        }`}
      >
        {selected ? (
          <>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ROOM_TYPE_COLOR[selected.type] ?? '#B30000' }} />
            <span className="flex-1 text-white font-medium">
              Room {selected.room_number}
              <span className="ml-2 text-white/35 font-normal capitalize">
                {selected.type} · {fmtEGP(selected.price_per_night)}/night
              </span>
            </span>
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/25 shrink-0">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-white/25">Select a room…</span>
          </>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`ml-auto shrink-0 text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className={`absolute z-50 top-full left-0 mt-1.5 w-full dropdown-panel rounded-xl overflow-y-auto transition-all duration-200 origin-top ${
          open
            ? 'opacity-100 scale-y-100 pointer-events-auto'
            : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none'
        }`}
        style={{ maxHeight: '240px' }}
      >
        {rooms.length === 0 ? (
          <div className="px-4 py-4 text-sm text-white/30 text-center">No rooms available</div>
        ) : (
          rooms.map((room) => {
            const booked = unavailableIds.has(room.id)
            const isSel = room.id === value
            return (
              <button
                key={room.id}
                type="button"
                disabled={booked}
                onClick={() => { onChange(room.id); setOpen(false) }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors duration-150 flex items-center gap-3 ${
                  booked
                    ? 'opacity-30 cursor-not-allowed'
                    : isSel
                      ? 'bg-primary/15 text-primary'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ROOM_TYPE_COLOR[room.type] ?? '#B30000' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-tight">Room {room.room_number}</p>
                  <p className="text-[11px] text-white/35 capitalize leading-tight mt-0.5">
                    {room.type} · {fmtEGP(room.price_per_night)}/night
                    {booked ? ' · Already booked' : ''}
                  </p>
                </div>
                {isSel && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary shrink-0">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Status Flow Bar ─────────────────────────────────────────────────────────

function StatusFlowBar({ status }: { status: BookingStatus }) {
  const isCancelled = status === 'cancelled'
  const order = ['pending', 'confirmed', 'completed'] as const
  const currentIdx = isCancelled ? -1 : order.indexOf(status)

  const STEP = {
    pending:   { label: 'Pending',   activeColor: '#f59e0b' },
    confirmed: { label: 'Confirmed', activeColor: '#10b981' },
    completed: { label: 'Completed', activeColor: 'rgba(255,255,255,0.5)' },
  }

  return (
    <div className="space-y-3">
      {isCancelled && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Booking cancelled
        </div>
      )}

      <div className="flex items-center">
        {order.map((step, i) => {
          const s = STEP[step]
          const isDone = !isCancelled && order.indexOf(step) < currentIdx
          const isCurrent = !isCancelled && step === status
          const isLast = i === order.length - 1
          const active = isDone || isCurrent

          return (
            <div key={step} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              {/* Step node */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    isCancelled
                      ? 'border-white/[0.10] bg-white/[0.04]'
                      : active
                        ? 'border-current shadow-lg'
                        : 'border-white/[0.12] bg-white/[0.04]'
                  }`}
                  style={active && !isCancelled ? { borderColor: s.activeColor, backgroundColor: `${s.activeColor}22`, color: s.activeColor } : {}}
                >
                  {isDone ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.activeColor }} />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white/[0.15]" />
                  )}
                </div>
                <p
                  className="text-[10px] font-semibold mt-1.5 whitespace-nowrap tracking-wide"
                  style={active && !isCancelled ? { color: s.activeColor } : { color: 'rgba(255,255,255,0.22)' }}
                >
                  {s.label}
                </p>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-3 mb-5">
                  <div
                    className="h-px transition-all duration-700"
                    style={{
                      background: isDone && !isCancelled
                        ? 'linear-gradient(90deg, #10b981 0%, #10b98166 100%)'
                        : 'rgba(255,255,255,0.08)',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Booking Detail Modal ─────────────────────────────────────────────────────

function BookingDetailModal({
  booking,
  rooms,
  isOpen,
  onClose,
  onStatusChange,
  onSaved,
  isStatusUpdating,
}: {
  booking: Booking | null
  rooms: Room[]
  isOpen: boolean
  onClose: () => void
  onStatusChange: (id: number, status: BookingStatus) => void
  onSaved: (updated: Booking) => void
  isStatusUpdating: boolean
}) {
  const updateBooking = useUpdateBooking()

  const [form, setForm] = useState<BookingUpdate>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  // `visible` lags one rAF behind `isOpen` so the CSS transition always plays from the hidden state
  const [visible, setVisible] = useState(false)
  // keep last non-null booking alive so content doesn't vanish during the close animation
  const [staleBooking, setStaleBooking] = useState<Booking | null>(null)

  useEffect(() => {
    if (booking) setStaleBooking(booking)
  }, [booking])

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setVisible(false)
      const t = setTimeout(() => setStaleBooking(null), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const b = booking ?? staleBooking

  // Re-sync form when the displayed booking changes
  useEffect(() => {
    if (b) {
      setForm({ guest_name: b.guest_name, guest_email: b.guest_email ?? '', guest_phone: b.guest_phone ?? '', start_date: b.start_date, end_date: b.end_date })
      setSaveError(null)
    }
  }, [b?.id])

  // Fully unmount only once closed and animation complete
  if (!isOpen && !visible && !staleBooking) return null
  if (!b) return null

  const guestName  = form.guest_name  ?? b.guest_name
  const guestEmail = form.guest_email ?? (b.guest_email ?? '')
  const guestPhone = form.guest_phone ?? (b.guest_phone ?? '')
  const startDate  = form.start_date  ?? b.start_date
  const endDate    = form.end_date    ?? b.end_date

  const isDirty =
    guestName  !== b.guest_name ||
    guestEmail !== (b.guest_email ?? '') ||
    guestPhone !== (b.guest_phone ?? '') ||
    startDate  !== b.start_date ||
    endDate    !== b.end_date

  const datesChanged = startDate !== b.start_date || endDate !== b.end_date
  const nights = calcNights(startDate, endDate)
  const datesInvalid = datesChanged && nights === 0

  const room = rooms.find((r) => r.id === b.room_id)
  const cost = room && nights > 0 ? nights * room.price_per_night : null
  const transitions = TRANSITIONS[b.status] ?? []
  const st = STATUS_CONFIG[b.status]

  function handleSave() {
    if (!b) return
    setSaveError(null)
    const payload: BookingUpdate = {}
    if (guestName  !== b.guest_name)          payload.guest_name  = guestName
    if (guestEmail !== (b.guest_email ?? ''))  payload.guest_email = guestEmail
    if (guestPhone !== (b.guest_phone ?? ''))  payload.guest_phone = guestPhone
    if (startDate  !== b.start_date)           payload.start_date  = startDate
    if (endDate    !== b.end_date)             payload.end_date    = endDate
    updateBooking.mutate(
      { id: b.id, data: payload },
      {
        onSuccess: (updated) => {
          onSaved(updated)
          onClose()
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
            'Failed to save changes. Please try again.'
          setSaveError(msg)
        },
      },
    )
  }

  const inputCls =
    'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all'

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Centered modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`relative w-full max-w-xl glass-strong rounded-2xl pointer-events-auto flex flex-col
            transform transition-all duration-300 ease-out
            ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
          style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)', maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {initials(b.guest_name)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Booking #{b.id}</h2>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.className}`}>
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {st.label}
                  </span>
                </div>
                <p className="text-xs text-white/35 mt-0.5">{b.guest_name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Status Flow ── */}
          <div className="px-6 py-4 border-b border-white/[0.06] shrink-0">
            <StatusFlowBar status={b.status} />
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto scroll-area-viewport px-6 py-5 space-y-5 min-h-0">

            {/* Guest details */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium mb-2.5">Guest Name</p>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
                  className={inputCls}
                  placeholder="Guest name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium mb-2.5">Email</p>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setForm((f) => ({ ...f, guest_email: e.target.value }))}
                    className={inputCls}
                    placeholder="guest@example.com"
                  />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium mb-2.5">Mobile Number</p>
                  <PhoneInput
                    value={guestPhone}
                    onChange={(val) => setForm((f) => ({ ...f, guest_phone: val }))}
                  />
                </div>
              </div>
            </div>

            {/* Room info (read-only display) */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium mb-2.5">Room</p>
              {room ? (
                <div className="flex items-center gap-3 p-3.5 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${ROOM_TYPE_COLOR[room.type] ?? '#B30000'}18` }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                      style={{ color: ROOM_TYPE_COLOR[room.type] ?? '#B30000' }}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Room {room.room_number}</p>
                    <p className="text-xs text-white/40 capitalize">{room.type} · {fmtEGP(room.price_per_night)} / night</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                  <p className="text-sm text-white/40">Room #{b.room_id}</p>
                </div>
              )}
            </div>

            {/* Stay period */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium mb-2.5">Stay Period</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-white/30 mb-1.5">Check-in</p>
                  <DatePicker
                    value={startDate}
                    onChange={(val) => setForm((f) => ({ ...f, start_date: val }))}
                    placeholder="Check-in"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-white/30 mb-1.5">Check-out</p>
                  <DatePicker
                    value={endDate}
                    onChange={(val) => setForm((f) => ({ ...f, end_date: val }))}
                    placeholder="Check-out"
                    min={startDate || undefined}
                  />
                </div>
              </div>

              {/* Live cost summary */}
              {nights > 0 && (
                <div className={`mt-3 flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  cost !== null
                    ? 'bg-emerald-500/[0.05] border-emerald-500/15'
                    : 'bg-white/[0.03] border-white/[0.06]'
                }`}>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    {nights} night{nights !== 1 ? 's' : ''}
                    {room ? ` × ${fmtEGP(room.price_per_night)}` : ''}
                  </div>
                  {cost !== null && (
                    <p className="text-base font-bold text-emerald-400">{fmtEGP(cost)}</p>
                  )}
                </div>
              )}

              {/* Date format hint when both are set */}
              {startDate && endDate && nights === 0 && (
                <p className="mt-2 text-xs text-red-400">Check-out must be after check-in</p>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 space-y-3">
            {/* Status actions */}
            {transitions.length > 0 && (
              <div className="flex gap-2">
                {transitions.map(({ status, label, cls }) => (
                  <button
                    key={status}
                    disabled={isStatusUpdating}
                    onClick={() => onStatusChange(b.id, status)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
                  >
                    {isStatusUpdating ? '…' : label}
                  </button>
                ))}
              </div>
            )}

            {/* Error message */}
            {saveError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                {saveError}
              </div>
            )}

            {/* Dates invalid warning */}
            {datesInvalid && (
              <p className="text-xs text-amber-400">Check-out must be after check-in before saving.</p>
            )}

            {/* Save / Close row */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium text-white/45 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl transition-all"
              >
                Close
              </button>
              <button
                disabled={!isDirty || updateBooking.isPending || datesInvalid}
                onClick={handleSave}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all
                  ${isDirty && !datesInvalid
                    ? 'bg-primary hover:bg-primary-dark text-white shadow-glow-sm'
                    : 'bg-white/[0.04] text-white/20 border border-white/[0.06] cursor-not-allowed'
                  } disabled:opacity-50`}
              >
                {updateBooking.isPending ? 'Saving…' : isDirty ? 'Save Changes' : 'No Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Skeleton / field helpers ─────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      <td className="pl-5 pr-2 py-4 w-10">
        <div className="w-3.5 h-3.5 bg-white/[0.06] rounded animate-pulse" />
      </td>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-3.5 bg-white/[0.06] rounded-full animate-pulse" style={{ width: `${55 + (i * 17) % 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

const inputClass =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all'

function InputField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Bookings() {
  const { data: bookings, isLoading, isError } = useAdminBookings()
  const { data: rooms = [] } = useAdminRooms()
  const createManualBooking = useCreateManualBooking()
  const updateStatus = useUpdateBookingStatus()

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms])

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ManualBookingCreate>(emptyBookingForm)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const unavailableRoomIds = useMemo(() => {
    if (!form.start_date || !form.end_date) return new Set<number>()
    const busy = new Set<number>()
    for (const b of bookings ?? []) {
      if (b.status !== 'pending' && b.status !== 'confirmed') continue
      if (b.start_date < form.end_date && b.end_date > form.start_date) busy.add(b.room_id)
    }
    return busy
  }, [bookings, form.start_date, form.end_date])
  const [formErrors, setFormErrors] = useState<BookingFormErrors>({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15

  async function exportBookings() {
    const today = new Date().toISOString().split('T')[0]
    await exportBookingsExcel(bookings ?? [], roomMap, `ejust-reservations-${today}`)
  }

  function validateForm(): boolean {
    const e: BookingFormErrors = {}
    if (!form.guest_name.trim()) e.guest_name = 'Guest name is required'
    if (!form.room_id || form.room_id <= 0) e.room_id = 'Valid room ID is required'
    if (!form.start_date) e.start_date = 'Check-in date is required'
    if (!form.end_date) e.end_date = 'Check-out date is required'
    if (form.start_date && form.end_date && form.end_date <= form.start_date)
      e.end_date = 'Check-out must be after check-in'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleBookingSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    if (!validateForm()) return
    await createManualBooking.mutateAsync(form)
    setForm(emptyBookingForm)
    setFormErrors({})
    setModalOpen(false)
  }

  function handleStatusChange(id: number, status: BookingStatus) {
    updateStatus.mutate({ id, status })
    if (selectedBooking?.id === id) setSelectedBooking((p) => p ? { ...p, status } : null)
  }

  const filtered = (bookings ?? []).filter((b) => {
    const matchSearch = b.guest_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || b.status === statusFilter
    const matchFrom = !dateFrom || b.start_date >= dateFrom
    const matchTo   = !dateTo   || b.start_date <= dateTo
    return matchSearch && matchStatus && matchFrom && matchTo
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const pageIds = new Set(paginated.map(b => b.id))
  const allPageSelected = pageIds.size > 0 && [...pageIds].every(id => selectedIds.has(id))
  const somePageSelected = [...pageIds].some(id => selectedIds.has(id))

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds(prev => { const next = new Set(prev); pageIds.forEach(id => next.delete(id)); return next })
    } else {
      setSelectedIds(prev => { const next = new Set(prev); pageIds.forEach(id => next.add(id)); return next })
    }
  }

  function toggleSelectOne(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkConfirm() {
    const ids = [...selectedIds].filter(id => {
      const b = (bookings ?? []).find(x => x.id === id)
      return b && (b.status === 'pending' || b.status === 'cancelled')
    })
    await Promise.allSettled(ids.map(id => updateStatus.mutateAsync({ id, status: 'confirmed' })))
    setSelectedIds(new Set())
  }

  async function bulkCancel() {
    const ids = [...selectedIds].filter(id => {
      const b = (bookings ?? []).find(x => x.id === id)
      return b && (b.status === 'pending' || b.status === 'confirmed')
    })
    await Promise.allSettled(ids.map(id => updateStatus.mutateAsync({ id, status: 'cancelled' })))
    setSelectedIds(new Set())
  }

  async function exportSelected() {
    const sel = (bookings ?? []).filter(b => selectedIds.has(b.id))
    const today = new Date().toISOString().split('T')[0]
    await exportBookingsExcel(sel, roomMap, `ejust-selected-${today}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-1">Management</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Bookings</h1>
        </div>

        <div className="flex items-center gap-3">
          {bookings && (
            <div className="flex items-center gap-4 glass px-4 py-2 rounded-xl">
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{bookings.length}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Total</p>
              </div>
              <div className="w-px h-8 bg-white/[0.07]" />
              <div className="text-center">
                <p className="text-lg font-semibold text-emerald-400">
                  {bookings.filter((b) => b.status === 'confirmed').length}
                </p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Confirmed</p>
              </div>
              <div className="w-px h-8 bg-white/[0.07]" />
              <div className="text-center">
                <p className="text-lg font-semibold text-amber-400">
                  {bookings.filter((b) => b.status === 'pending').length}
                </p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Pending</p>
              </div>
            </div>
          )}

          {bookings && bookings.length > 0 && (
            <ExportButton label="Export Excel" onClick={exportBookings} />
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all shadow-glow-sm hover:shadow-glow-red"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Booking
          </button>
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          Failed to load bookings. Ensure the backend is running.
        </div>
      )}

      {/* Search & filter */}
      <div className="flex flex-wrap gap-3">
        {/* Guest name search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input type="text" placeholder="Search by guest name…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all"
          />
        </div>

        {/* Status filter */}
        <CustomSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1) }} options={STATUS_OPTIONS} className="w-40" />

        {/* Date-range filter */}
        <div className="flex items-center gap-2">
          <DatePicker
            value={dateFrom}
            onChange={(val) => { setDateFrom(val); setPage(1) }}
            placeholder="From date"
            className="w-40"
          />
          <span className="text-white/20 text-xs">to</span>
          <DatePicker
            value={dateTo}
            onChange={(val) => { setDateTo(val); setPage(1) }}
            placeholder="To date"
            min={dateFrom || undefined}
            className="w-40"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-all border border-white/[0.06]"
              title="Clear dates">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/[0.07] border border-primary/20">
          <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-white/[0.10]" />
          <button
            onClick={bulkConfirm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Confirm All
          </button>
          <button
            onClick={bulkCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            Cancel All
          </button>
          <button
            onClick={exportSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/50 bg-white/[0.05] border border-white/[0.09] hover:bg-white/[0.10] transition-all"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Export Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden shadow-glass">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-sm font-medium text-white/60">All Reservations</span>
          <span className="text-xs text-white/25">
            {bookings
              ? filtered.length < (bookings.length)
                ? `${filtered.length} filtered · ${bookings.length} total`
                : `${bookings.length} records`
              : '—'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {/* Select-all checkbox */}
                <th className="pl-5 pr-2 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                  />
                </th>
                {['ID', 'Guest Name', 'Room', 'Check-in', 'Check-out', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-white/30 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
              ) : paginated.length > 0 ? (
                paginated.map((booking) => {
                  const st = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending
                  const isPendingUpdate =
                    updateStatus.isPending &&
                    (updateStatus.variables as { id: number } | undefined)?.id === booking.id
                  const isSelected = selectedBooking?.id === booking.id
                  const room = roomMap.get(booking.room_id)

                  return (
                    <tr
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={`hover:bg-white/[0.025] transition-colors cursor-pointer ${isSelected ? 'bg-primary/[0.04] border-l-2 border-primary/30' : selectedIds.has(booking.id) ? 'bg-white/[0.02]' : ''}`}
                    >
                      <td className="pl-5 pr-2 py-3.5 w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(booking.id)}
                          onChange={() => toggleSelectOne(booking.id)}
                          className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono text-white/30">#{booking.id}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                            {booking.guest_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white leading-tight">{booking.guest_name}</p>
                            {booking.guest_email && (
                              <p className="text-[11px] text-white/30 leading-tight">{booking.guest_email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-white/70 font-medium">
                          {room ? `Room ${room.room_number}` : `Room ${booking.room_id}`}
                        </div>
                        {room && <div className="text-[11px] text-white/30 capitalize">{room.type}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-white/50 whitespace-nowrap">{booking.start_date}</td>
                      <td className="px-5 py-3.5 text-sm text-white/50 whitespace-nowrap">{booking.end_date}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${st.className}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            title="View details"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white/40 bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] hover:text-white/70 transition-all"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                            View
                          </button>

                          {/* Confirm / Re-confirm */}
                          {(booking.status === 'pending' || booking.status === 'cancelled') && (
                            <button
                              disabled={isPendingUpdate}
                              onClick={() => handleStatusChange(booking.id, 'confirmed')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isPendingUpdate ? (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                              {booking.status === 'cancelled' ? 'Re-confirm' : 'Confirm'}
                            </button>
                          )}

                          {/* Mark completed */}
                          {booking.status === 'confirmed' && (
                            <button
                              disabled={isPendingUpdate}
                              onClick={() => handleStatusChange(booking.id, 'completed')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white/50 bg-white/[0.05] border border-white/[0.09] hover:bg-white/[0.10] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                              Complete
                            </button>
                          )}

                          {/* Cancel */}
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <button
                              disabled={isPendingUpdate}
                              onClick={() => handleStatusChange(booking.id, 'cancelled')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                              Cancel
                            </button>
                          )}

                          {/* Completed badge */}
                          {booking.status === 'completed' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-white/25 bg-white/[0.03] border border-white/[0.05]">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              Done
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/15">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <p className="text-sm text-white/25">
                        {search || statusFilter || dateFrom || dateTo ? 'No bookings match your filters' : 'No bookings found'}
                      </p>
                      {(search || statusFilter || dateFrom || dateTo) && (
                        <button onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }}
                          className="text-xs text-primary/70 hover:text-primary transition-colors">
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-white/30">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:bg-white/[0.08] hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-white/20">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all border ${
                      p === safePage
                        ? 'bg-primary text-white border-primary/50 shadow-glow-sm'
                        : 'bg-white/[0.04] border-white/[0.07] text-white/40 hover:bg-white/[0.08] hover:text-white/70'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              disabled={safePage === totalPages}
              onClick={() => setPage(safePage + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:bg-white/[0.08] hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Booking detail modal */}
      <BookingDetailModal
        booking={selectedBooking}
        rooms={rooms}
        isOpen={selectedBooking !== null}
        onClose={() => setSelectedBooking(null)}
        onStatusChange={handleStatusChange}
        onSaved={(updated) => setSelectedBooking(updated)}
        isStatusUpdating={updateStatus.isPending}
      />

      {/* New Booking Modal */}
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4 transition-all duration-300 ${
          modalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
        <div
          className={`relative w-full max-w-md glass-strong rounded-2xl shadow-glass transform transition-all duration-300 ${
            modalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-semibold text-white">New Manual Booking</h2>
              <p className="text-xs text-white/30 mt-0.5">Create a booking on behalf of a guest</p>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleBookingSubmit} className="px-6 py-6 space-y-5">
            <InputField label="Guest Name" error={formErrors.guest_name}>
              <input type="text" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} placeholder="e.g. John Doe" className={inputClass} />
            </InputField>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Email">
                <input type="email" value={form.guest_email ?? ''} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} placeholder="guest@example.com" className={inputClass} />
              </InputField>
              <InputField label="Mobile Number">
                <PhoneInput
                  value={form.guest_phone ?? ''}
                  onChange={(val) => setForm({ ...form, guest_phone: val })}
                />
              </InputField>
            </div>
            <InputField label="Room" error={formErrors.room_id}>
              <RoomPickerSelect
                rooms={rooms}
                value={form.room_id}
                onChange={(id) => setForm({ ...form, room_id: id })}
                unavailableIds={unavailableRoomIds}
              />
            </InputField>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Check-in" error={formErrors.start_date}>
                <DatePicker value={form.start_date} onChange={(val) => setForm({ ...form, start_date: val })} placeholder="Check-in date" />
              </InputField>
              <InputField label="Check-out" error={formErrors.end_date}>
                <DatePicker value={form.end_date} onChange={(val) => setForm({ ...form, end_date: val })} placeholder="Check-out date" min={form.start_date || undefined} />
              </InputField>
            </div>
            {createManualBooking.isError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                Failed to create booking. Please try again.
              </div>
            )}
          </form>

          <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 text-sm font-medium text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl transition-all">
              Cancel
            </button>
            <button onClick={handleBookingSubmit} disabled={createManualBooking.isPending} className="flex-1 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-xl transition-all shadow-glow-sm disabled:opacity-50">
              {createManualBooking.isPending ? 'Saving…' : 'Create Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
