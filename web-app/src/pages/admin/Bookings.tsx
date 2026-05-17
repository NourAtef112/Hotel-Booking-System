import { useState } from 'react'
import CustomSelect from '../../components/CustomSelect'
import DatePicker from '../../components/DatePicker'
import { useAdminBookings, useCreateManualBooking, useUpdateBookingStatus } from '../../hooks/useAdminApi'
import type { BookingStatus, ManualBookingCreate } from '../../types/admin'

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  confirmed: { label: 'Confirmed', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  completed: { label: 'Completed', className: 'bg-white/5 text-white/40 border-white/10' },
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',          label: 'All Statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
]

const emptyBookingForm: ManualBookingCreate = {
  guest_name: '',
  room_id: 0,
  start_date: '',
  end_date: '',
}

type BookingFormErrors = Partial<Record<keyof ManualBookingCreate, string>>

function SkeletonRow() {
  return (
    <tr>
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

export default function Bookings() {
  const { data: bookings, isLoading, isError } = useAdminBookings()
  const createManualBooking = useCreateManualBooking()
  const updateStatus = useUpdateBookingStatus()

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ManualBookingCreate>(emptyBookingForm)
  const [formErrors, setFormErrors] = useState<BookingFormErrors>({})

  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  function validateForm(): boolean {
    const e: BookingFormErrors = {}
    if (!form.guest_name.trim()) e.guest_name = 'Guest name is required'
    if (!form.room_id || form.room_id <= 0) e.room_id = 'Valid room ID is required'
    if (!form.start_date) e.start_date = 'Check-in date is required'
    if (!form.end_date) e.end_date = 'Check-out date is required'
    if (form.start_date && form.end_date && form.end_date <= form.start_date) {
      e.end_date = 'Check-out must be after check-in'
    }
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

  const filtered = (bookings ?? []).filter(b => {
    const matchSearch = b.guest_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || b.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-1">Management</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Bookings</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats pill */}
          {bookings && (
            <div className="flex items-center gap-4 glass px-4 py-2 rounded-xl">
              <div className="text-center">
                <p className="text-lg font-semibold text-white">{bookings.length}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Total</p>
              </div>
              <div className="w-px h-8 bg-white/[0.07]" />
              <div className="text-center">
                <p className="text-lg font-semibold text-emerald-400">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Confirmed</p>
              </div>
              <div className="w-px h-8 bg-white/[0.07]" />
              <div className="text-center">
                <p className="text-lg font-semibold text-amber-400">
                  {bookings.filter(b => b.status === 'pending').length}
                </p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Pending</p>
              </div>
            </div>
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
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          Failed to load bookings. Ensure the backend is running.
        </div>
      )}

      {/* Search & filter bar */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg
            width="14" height="14"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search by guest name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all"
          />
        </div>
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          className="w-44"
        />
      </div>

      {/* Table card */}
      <div className="card-float glass rounded-2xl overflow-hidden shadow-glass">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-sm font-medium text-white/60">All Reservations</span>
          <span className="text-xs text-white/25">
            {bookings ? `${filtered.length} of ${bookings.length} records` : '—'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['ID', 'Guest Name', 'Room', 'Check-in', 'Check-out', 'Status', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-medium text-white/30 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
              ) : filtered.length > 0 ? (
                filtered.map(booking => {
                  const st = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending
                  const isPendingUpdate = updateStatus.isPending &&
                    (updateStatus.variables as { id: number } | undefined)?.id === booking.id

                  return (
                    <tr key={booking.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-5 py-4 text-xs font-mono text-white/30">#{booking.id}</td>
                      <td className="px-5 py-4 text-sm font-medium text-white">{booking.guest_name}</td>
                      <td className="px-5 py-4 text-sm text-white/50">Room {booking.room_id}</td>
                      <td className="px-5 py-4 text-sm text-white/50 whitespace-nowrap">{booking.start_date}</td>
                      <td className="px-5 py-4 text-sm text-white/50 whitespace-nowrap">{booking.end_date}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${st.className}`}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {booking.status !== 'confirmed' && booking.status !== 'completed' && (
                            <button
                              disabled={isPendingUpdate}
                              onClick={() => updateStatus.mutate({ id: booking.id, status: 'confirmed' })}
                              className="px-3 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isPendingUpdate ? '…' : 'Confirm'}
                            </button>
                          )}
                          {booking.status !== 'cancelled' && (
                            <button
                              disabled={isPendingUpdate}
                              onClick={() => updateStatus.mutate({ id: booking.id, status: 'cancelled' })}
                              className="px-3 py-1 text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isPendingUpdate ? '…' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-white/15">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                      </svg>
                      <p className="text-sm text-white/25">
                        {search || statusFilter ? 'No bookings match your filters' : 'No bookings found'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Booking Modal */}
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4
          transition-all duration-300
          ${modalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        />

        <div
          className={`relative w-full max-w-md glass-strong rounded-2xl shadow-glass
            transform transition-all duration-300
            ${modalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
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
              <input
                type="text"
                value={form.guest_name}
                onChange={e => setForm({ ...form, guest_name: e.target.value })}
                placeholder="e.g. John Doe"
                className={inputClass}
              />
            </InputField>

            <InputField label="Room ID" error={formErrors.room_id}>
              <input
                type="number"
                min={1}
                value={form.room_id || ''}
                onChange={e => setForm({ ...form, room_id: parseInt(e.target.value) || 0 })}
                placeholder="e.g. 3"
                className={inputClass}
              />
            </InputField>

            <div className="grid grid-cols-2 gap-4">
              <InputField label="Check-in" error={formErrors.start_date}>
                <DatePicker
                  value={form.start_date}
                  onChange={val => setForm({ ...form, start_date: val })}
                  placeholder="Check-in date"
                />
              </InputField>

              <InputField label="Check-out" error={formErrors.end_date}>
                <DatePicker
                  value={form.end_date}
                  onChange={val => setForm({ ...form, end_date: val })}
                  placeholder="Check-out date"
                  min={form.start_date || undefined}
                />
              </InputField>
            </div>

            {createManualBooking.isError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                Failed to create booking. Please try again.
              </div>
            )}
          </form>

          <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2.5 text-sm font-medium text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleBookingSubmit}
              disabled={createManualBooking.isPending}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-xl transition-all shadow-glow-sm disabled:opacity-50"
            >
              {createManualBooking.isPending ? 'Saving…' : 'Create Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
