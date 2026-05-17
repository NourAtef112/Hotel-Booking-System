import { useEffect, useRef, useState } from 'react'

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  min?: string
  className?: string
}

function parseLocal(str: string): Date | null {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDisplay(str: string): string {
  const d = parseLocal(str)
  if (!d) return ''
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  min,
  className = '',
}: DatePickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)

  const today = new Date()
  const selected = parseLocal(value)
  const minDate = parseLocal(min ?? '')

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear())
      setViewMonth(selected.getMonth())
    }
  }, [value])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  // Build cell array: nulls for leading blanks, then day numbers
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function isDisabled(day: number) {
    if (!minDate) return false
    return new Date(viewYear, viewMonth, day) < minDate
  }
  function isSelected(day: number) {
    return !!selected &&
      selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
  }
  function isToday(day: number) {
    return today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect()
            setOpenUp(window.innerHeight - rect.bottom < 320)
          }
          setOpen(p => !p)
        }}
        className={`
          flex items-center gap-2.5 w-full
          bg-white/[0.04] border rounded-xl px-4 py-2.5
          text-sm transition-all duration-200 text-left
          ${open
            ? 'border-primary/50 bg-white/[0.06]'
            : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06]'
          }
        `}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          className="flex-shrink-0 text-white/30"
        >
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <span className={value ? 'text-white' : 'text-white/25'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
      </button>

      {/* Calendar panel */}
      <div
        className={`
          absolute z-50 left-0
          dropdown-panel rounded-2xl
          p-4 w-[17rem]
          transition-all duration-200
          ${openUp
            ? 'bottom-full mb-2 origin-bottom'
            : 'top-full mt-2 origin-top'
          }
          ${open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : openUp
              ? 'opacity-0 scale-95 translate-y-2 pointer-events-none'
              : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          }
        `}
      >
        {/* Month / year navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <span className="text-sm font-semibold text-white tracking-tight">
            {MONTHS[viewMonth]} {viewYear}
          </span>

          <button
            type="button"
            onClick={nextMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.07] transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1.5">
          {DAYS_SHORT.map(d => (
            <div
              key={d}
              className="text-center text-[10px] font-medium text-white/20 py-1 uppercase tracking-widest"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />

            const disabled = isDisabled(day)
            const sel = isSelected(day)
            const tod = isToday(day)

            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => { onChange(toYMD(viewYear, viewMonth, day)); setOpen(false) }}
                className={`
                  h-8 w-full rounded-lg text-xs font-medium transition-all duration-100
                  ${disabled
                    ? 'text-white/15 cursor-not-allowed'
                    : sel
                      ? 'bg-primary text-white shadow-glow-sm scale-105'
                      : tod
                        ? 'text-primary border border-primary/25 hover:bg-primary/10'
                        : 'text-white/55 hover:text-white hover:bg-white/[0.07]'
                  }
                `}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Footer: selected label + clear */}
        <div className={`
          flex items-center justify-between
          transition-all duration-200
          ${value ? 'mt-3 pt-3 border-t border-white/[0.08] opacity-100' : 'h-0 overflow-hidden opacity-0'}
        `}>
          <span className="text-xs text-white/30">{formatDisplay(value)}</span>
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className="text-xs text-white/25 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
