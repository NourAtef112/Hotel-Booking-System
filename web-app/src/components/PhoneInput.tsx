import { useEffect, useRef, useState } from 'react'

const COUNTRIES = [
  { name: 'Egypt',        flag: '🇪🇬', code: '+20',  min: 10, max: 10 },
  { name: 'Saudi Arabia', flag: '🇸🇦', code: '+966', min: 9,  max: 9  },
  { name: 'UAE',          flag: '🇦🇪', code: '+971', min: 9,  max: 9  },
  { name: 'Kuwait',       flag: '🇰🇼', code: '+965', min: 8,  max: 8  },
  { name: 'Qatar',        flag: '🇶🇦', code: '+974', min: 8,  max: 8  },
  { name: 'Jordan',       flag: '🇯🇴', code: '+962', min: 9,  max: 9  },
  { name: 'Bahrain',      flag: '🇧🇭', code: '+973', min: 8,  max: 8  },
  { name: 'Libya',        flag: '🇱🇾', code: '+218', min: 9,  max: 9  },
  { name: 'Japan',        flag: '🇯🇵', code: '+81',  min: 10, max: 11 },
  { name: 'USA / Canada', flag: '🇺🇸', code: '+1',   min: 10, max: 10 },
  { name: 'UK',           flag: '🇬🇧', code: '+44',  min: 10, max: 10 },
  { name: 'Germany',      flag: '🇩🇪', code: '+49',  min: 10, max: 11 },
  { name: 'France',       flag: '🇫🇷', code: '+33',  min: 9,  max: 9  },
  { name: 'Turkey',       flag: '🇹🇷', code: '+90',  min: 10, max: 10 },
  { name: 'China',        flag: '🇨🇳', code: '+86',  min: 11, max: 11 },
  { name: 'India',        flag: '🇮🇳', code: '+91',  min: 10, max: 10 },
  { name: 'Russia',       flag: '🇷🇺', code: '+7',   min: 10, max: 10 },
  { name: 'Italy',        flag: '🇮🇹', code: '+39',  min: 9,  max: 10 },
  { name: 'Spain',        flag: '🇪🇸', code: '+34',  min: 9,  max: 9  },
  { name: 'South Korea',  flag: '🇰🇷', code: '+82',  min: 9,  max: 10 },
] as const

type Country = (typeof COUNTRIES)[number]

function parsePhone(value: string): { code: string; local: string } {
  if (!value.trim()) return { code: '+20', local: '' }
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) {
    if (value.startsWith(c.code)) {
      return { code: c.code, local: value.slice(c.code.length).trim() }
    }
  }
  return { code: '+20', local: value }
}

export default function PhoneInput({
  value,
  onChange,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const parsed = parsePhone(value)
  const [selectedCode, setSelectedCode] = useState(parsed.code)
  const [localNumber, setLocalNumber] = useState(parsed.local)

  useEffect(() => {
    const { code, local } = parsePhone(value)
    setSelectedCode(code)
    setLocalNumber(local)
  }, [value])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
    else setSearch('')
  }, [open])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const country = (COUNTRIES.find(c => c.code === selectedCode) ?? COUNTRIES[0]) as Country
  const digits = localNumber.replace(/\D/g, '')
  const hasNonDigits = localNumber.trim().length > 0 && /\D/.test(localNumber.trim())
  const isValid = !hasNonDigits && digits.length >= country.min && digits.length <= country.max
  const hasInput = localNumber.trim().length > 0

  function selectCode(code: string) {
    setSelectedCode(code)
    setOpen(false)
    const full = localNumber.trim() ? `${code} ${localNumber.trim()}` : ''
    onChange(full)
  }

  function handleNumber(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setLocalNumber(raw)
    const full = raw.trim() ? `${selectedCode} ${raw.trim()}` : ''
    onChange(full)
  }

  const filtered = COUNTRIES.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search),
  )

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Input row */}
      <div
        className={`flex w-full bg-white/[0.04] border rounded-xl overflow-hidden transition-all ${
          open ? 'border-primary/50 bg-white/[0.06]' : 'border-white/[0.08]'
        }`}
      >
        {/* Country code trigger */}
        <button
          type="button"
          onClick={() => setOpen(p => !p)}
          className="flex items-center gap-1.5 px-3 py-2.5 border-r border-white/[0.07] hover:bg-white/[0.04] transition-colors shrink-0"
        >
          <span className="text-base leading-none select-none">{country.flag}</span>
          <span className="text-sm font-medium text-white/80 whitespace-nowrap">{selectedCode}</span>
          <svg
            width="11" height="11" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Local number input */}
        <input
          type="tel"
          inputMode="numeric"
          value={localNumber}
          onChange={handleNumber}
          placeholder={`${country.min} digits`}
          className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none"
        />

        {/* Validity indicator */}
        {hasInput && (
          <div className={`flex items-center pr-3 shrink-0 ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
            {isValid ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Validation hint */}
      {hasInput && !isValid && (
        <p className="mt-1.5 text-[11px] text-red-400/80 leading-tight">
          {hasNonDigits
            ? 'Digits only — no spaces or letters'
            : `${country.name} numbers must be ${country.min === country.max ? country.min : `${country.min}–${country.max}`} digits`}
        </p>
      )}

      {/* Country dropdown */}
      <div
        className={`absolute z-50 top-full left-0 mt-1.5 dropdown-panel rounded-xl overflow-hidden transition-all duration-200 origin-top ${
          open
            ? 'opacity-100 scale-y-100 pointer-events-auto'
            : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none'
        }`}
        style={{ width: '260px' }}
      >
        {/* Search */}
        <div className="p-2 border-b border-white/[0.06]">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search country or code…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-xs text-white/30 text-center">No results</div>
          ) : (
            filtered.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => selectCode(c.code)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-3 ${
                  c.code === selectedCode
                    ? 'bg-primary/15 text-primary'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span className="text-base select-none">{c.flag}</span>
                <span className="flex-1 text-sm">{c.name}</span>
                <span className="text-xs text-white/35 font-mono">{c.code}</span>
                {c.code === selectedCode && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
