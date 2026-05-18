import { useState } from 'react'

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" className="shrink-0">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const SpinnerIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    className="shrink-0 animate-spin">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
)

export default function ExportButton({
  onClick,
  label = 'Export',
  variant = 'default',
}: {
  onClick: () => void | Promise<void>
  label?: string
  variant?: 'default' | 'icon'
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleClick() {
    if (state !== 'idle') return
    setState('loading')
    try {
      await Promise.resolve(onClick())
      setState('done')
      setTimeout(() => setState('idle'), 2400)
    } catch {
      setState('idle')
    }
  }

  const isDone    = state === 'done'
  const isLoading = state === 'loading'

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        title={isDone ? 'Exported!' : isLoading ? 'Exporting…' : label}
        className={`
          flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200
          ${isDone
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
            : isLoading
              ? 'border-black/[0.08] dark:border-white/[0.10] bg-black/[0.04] dark:bg-white/[0.06] text-gray-400 dark:text-white/40 cursor-wait'
              : 'border-black/[0.08] dark:border-white/[0.10] bg-black/[0.03] dark:bg-white/[0.04] text-gray-400 dark:text-white/40 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-white/75 hover:border-black/[0.14] dark:hover:border-white/[0.18] active:scale-95'
          }
        `}
      >
        {isDone ? <CheckIcon /> : isLoading ? <SpinnerIcon /> : <DownloadIcon />}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border transition-all duration-200
        ${isDone
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
          : isLoading
            ? 'border-black/[0.08] dark:border-white/[0.10] bg-black/[0.04] dark:bg-white/[0.06] text-gray-400 dark:text-white/40 cursor-wait'
            : 'border-black/[0.08] dark:border-white/[0.10] bg-black/[0.03] dark:bg-white/[0.04] text-gray-500 dark:text-white/55 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] hover:text-gray-800 dark:hover:text-white/85 hover:border-black/[0.14] dark:hover:border-white/[0.18] active:scale-95'
        }
      `}
    >
      {isDone    && <><CheckIcon />Exported!</>}
      {isLoading && <><SpinnerIcon />Exporting…</>}
      {!isDone && !isLoading && <><DownloadIcon />{label}</>}
    </button>
  )
}
