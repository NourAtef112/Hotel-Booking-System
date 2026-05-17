import { useEffect, useRef, useState } from 'react'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className = '',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`
          flex items-center justify-between gap-3 w-full
          bg-white/[0.04] border rounded-xl px-4 py-2.5
          text-sm text-white transition-all duration-200
          ${open
            ? 'border-primary/50 bg-white/[0.06]'
            : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06]'
          }
        `}
      >
        <span className={selected?.value ? 'text-white' : 'text-white/30'}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          width="14" height="14"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`flex-shrink-0 text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown panel */}
      <div
        className={`
          absolute z-50 top-full left-0 mt-1.5 w-full
          dropdown-panel rounded-xl
          overflow-hidden
          transition-all duration-200 origin-top
          ${open
            ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none'
          }
        `}
      >
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => { onChange(option.value); setOpen(false) }}
            className={`
              w-full text-left px-4 py-2.5 text-sm transition-colors duration-150
              flex items-center justify-between
              ${value === option.value
                ? 'text-primary bg-primary/15'
                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
              }
            `}
          >
            {option.label}
            {value === option.value && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary flex-shrink-0">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
