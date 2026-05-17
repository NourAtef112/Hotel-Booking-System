import { useState } from 'react'
import CustomSelect from '../../components/CustomSelect'
import { useAdminRooms, useCreateRoom } from '../../hooks/useAdminApi'
import type { RoomCreate, RoomType } from '../../types/admin'

const ROOM_TYPES: RoomType[] = ['single', 'double', 'suite', 'family']

const TYPE_CONFIG: Record<RoomType, { label: string; className: string }> = {
  single:  { label: 'Single',  className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  double:  { label: 'Double',  className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  suite:   { label: 'Suite',   className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  family:  { label: 'Family',  className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
}

const emptyForm: RoomCreate = { room_number: '', type: 'single', price_per_night: 0 }
type FormErrors = Partial<Record<keyof RoomCreate, string>>

function InputField({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
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

export default function Rooms() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RoomCreate>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { data: rooms = [] } = useAdminRooms()
  const createRoom = useCreateRoom()

  const filtered = rooms.filter(r => {
    const matchSearch = r.room_number.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || r.type === typeFilter
    return matchSearch && matchType
  })

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.room_number.trim()) e.room_number = 'Room number is required'
    if (form.price_per_night <= 0) e.price_per_night = 'Price must be greater than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault()
    if (!validate()) return
    await createRoom.mutateAsync(form)
    setForm(emptyForm)
    setErrors({})
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-medium mb-1">Management</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Rooms</h1>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-all shadow-glow-sm hover:shadow-glow-red"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Room
        </button>
      </div>

      {/* Stats */}
      {rooms.length > 0 && (
        <div className="flex items-center gap-4 glass px-4 py-2 rounded-xl w-fit">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{rooms.length}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Total</p>
          </div>
          {ROOM_TYPES.map((t) => {
            const count = rooms.filter(r => r.type === t).length
            if (!count) return null
            return (
              <div key={t} className="flex items-center gap-4">
                <div className="w-px h-8 bg-white/[0.07]" />
                <div className="text-center">
                  <p className={`text-lg font-semibold ${TYPE_CONFIG[t].className.split(' ')[1]}`}>{count}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">{t}</p>
                </div>
              </div>
            )
          })}
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
            placeholder="Search by room number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all"
          />
        </div>
        <CustomSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: '', label: 'All Types' },
            ...ROOM_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
          ]}
          className="w-40"
        />
      </div>

      {/* Table */}
      <div className="card-float glass rounded-2xl overflow-hidden shadow-glass">
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
                {['ID', 'Room Number', 'Type', 'Price / Night'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-medium text-white/30 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center">
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
                filtered.map(room => {
                  const tc = TYPE_CONFIG[room.type] ?? TYPE_CONFIG.single
                  return (
                    <tr key={room.id} className={`hover:bg-white/[0.02] transition-colors ${room.id < 0 ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-4 text-xs font-mono text-white/30">
                        {room.id < 0 ? '…' : `#${room.id}`}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-white">{room.room_number}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${tc.className}`}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {tc.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-white">
                        {room.price_per_night.toLocaleString('en-EG')}
                        <span className="text-white/30 ml-1 text-xs">EGP</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4
          transition-all duration-300
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />

        {/* Dialog */}
        <div
          className={`relative w-full max-w-md glass-strong rounded-2xl shadow-glass
            transform transition-all duration-300
            ${open ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-semibold text-white">Add New Room</h2>
              <p className="text-xs text-white/30 mt-0.5">Fill in the room details below</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            <InputField label="Room Number" error={errors.room_number}>
              <input
                type="text"
                value={form.room_number}
                onChange={e => setForm({ ...form, room_number: e.target.value })}
                placeholder="e.g. A101"
                className={inputClass}
              />
            </InputField>

            <InputField label="Room Type">
              <CustomSelect
                value={form.type}
                onChange={val => setForm({ ...form, type: val as RoomType })}
                options={ROOM_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              />
            </InputField>

            <InputField label="Price per Night (EGP)" error={errors.price_per_night}>
              <input
                type="number"
                min={1}
                step="0.01"
                value={form.price_per_night || ''}
                onChange={e => setForm({ ...form, price_per_night: parseFloat(e.target.value) || 0 })}
                placeholder="e.g. 500"
                className={inputClass}
              />
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

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-2.5 text-sm font-medium text-white/50 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createRoom.isPending}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-xl transition-all shadow-glow-sm disabled:opacity-50"
            >
              {createRoom.isPending ? 'Saving…' : 'Add Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
