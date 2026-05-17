import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  children: React.ReactNode
  className?: string
}

export default function ScrollArea({ children, className = '' }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)

  // Thumb geometry
  const [thumbTop, setThumbTop]       = useState(0)
  const [thumbHeight, setThumbHeight] = useState(40)
  // Directional stretch: positive = stretching downward, negative = upward
  const [stretchDown, setStretchDown] = useState(0)
  const [stretchUp,   setStretchUp]   = useState(0)

  const [visible,   setVisible]   = useState(false)
  const [snapping,  setSnapping]  = useState(false)
  const [hovered,   setHovered]   = useState(false)

  const lastScrollTop = useRef(0)
  const scrollTimer   = useRef<ReturnType<typeof setTimeout>>()
  const snapTimer     = useRef<ReturnType<typeof setTimeout>>()

  // Drag support
  const dragging        = useRef(false)
  const dragStartY      = useRef(0)
  const dragStartScroll = useRef(0)

  // ── Compute thumb position & size ───────────────────────────────────────

  const getThumb = useCallback(() => {
    const el = viewportRef.current
    if (!el) return { top: 0, height: 40 }
    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight <= clientHeight) return { top: 0, height: clientHeight }
    const ratio  = clientHeight / scrollHeight
    const h      = Math.max(ratio * clientHeight, 32)
    const maxTop = clientHeight - h
    const top    = (scrollTop / (scrollHeight - clientHeight)) * maxTop
    return { top, height: h }
  }, [])

  // ── Scroll handler ───────────────────────────────────────────────────────

  const onScroll = useCallback(() => {
    const el = viewportRef.current
    if (!el) return

    const { top, height } = getThumb()
    const velocity = el.scrollTop - lastScrollTop.current
    lastScrollTop.current = el.scrollTop

    const stretch = Math.min(Math.abs(velocity) * 0.7, 20)

    setThumbTop(top)
    setThumbHeight(height)
    setStretchDown(velocity > 0 ? stretch : 0)
    setStretchUp(velocity   < 0 ? stretch : 0)
    setVisible(true)
    setSnapping(false)

    clearTimeout(scrollTimer.current)
    clearTimeout(snapTimer.current)

    // After 130ms of no scroll → spring back, then fade out
    scrollTimer.current = setTimeout(() => {
      setStretchDown(0)
      setStretchUp(0)
      setSnapping(true)
      snapTimer.current = setTimeout(() => {
        setVisible(false)
        setSnapping(false)
      }, 650)
    }, 130)
  }, [getThumb])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    // Set initial thumb height before first scroll
    const { height } = getThumb()
    setThumbHeight(height)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [onScroll, getThumb])

  // ── Thumb drag ───────────────────────────────────────────────────────────

  function onThumbPointerDown(e: React.PointerEvent) {
    e.preventDefault()
    dragging.current    = true
    dragStartY.current  = e.clientY
    dragStartScroll.current = viewportRef.current?.scrollTop ?? 0
    setVisible(true)

    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function onThumbPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !viewportRef.current) return
    const el = viewportRef.current
    const { scrollHeight, clientHeight } = el
    const { height } = getThumb()
    const trackHeight  = clientHeight - height
    const dy           = e.clientY - dragStartY.current
    const scrollRatio  = (scrollHeight - clientHeight) / (trackHeight || 1)
    el.scrollTop = dragStartScroll.current + dy * scrollRatio
  }

  function onThumbPointerUp() {
    dragging.current = false
  }

  // ── Visual thumb with directional stretch ────────────────────────────────

  const displayTop    = Math.max(0, thumbTop - stretchUp)
  const displayHeight = thumbHeight + stretchDown + stretchUp

  const springTransition =
    'height 0.55s cubic-bezier(0.34,1.56,0.64,1), top 0.55s cubic-bezier(0.34,1.56,0.64,1)'

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Scrollable viewport — native bar hidden via CSS class */}
      <div
        ref={viewportRef}
        className="scroll-area-viewport h-full overflow-y-auto"
      >
        {children}
      </div>

      {/* Custom scrollbar track + thumb */}
      <div
        className="absolute right-1.5 top-3 bottom-3 w-[5px] pointer-events-none"
        style={{ opacity: visible || hovered ? 1 : 0, transition: 'opacity 0.4s ease' }}
      >
        {/* Track */}
        <div className="absolute inset-0 rounded-full bg-white/[0.05]" />

        {/* Thumb */}
        <div
          className="absolute left-0 right-0 rounded-full cursor-grab active:cursor-grabbing"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onPointerDown={onThumbPointerDown}
          onPointerMove={onThumbPointerMove}
          onPointerUp={onThumbPointerUp}
          style={{
            top:    displayTop,
            height: displayHeight,
            background: hovered
              ? 'rgba(179, 0, 0, 0.65)'
              : 'rgba(255, 255, 255, 0.22)',
            pointerEvents: 'auto',
            transition: snapping
              ? `${springTransition}, background 0.2s`
              : 'background 0.2s',
          }}
        />
      </div>
    </div>
  )
}
