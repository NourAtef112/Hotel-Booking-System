import { useRef } from 'react'

export function useGlowCard<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const { left, top } = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - left}px`)
    el.style.setProperty('--my', `${e.clientY - top}px`)
  }

  function onMouseLeave() {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--mx', '-999px')
    el.style.setProperty('--my', '-999px')
  }

  return { ref, onMouseMove, onMouseLeave }
}
