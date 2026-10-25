// E-JUST Guest Housing: home page "BOOK NOW" form hand-off.
// Attach `withHeroBooking` to the BOOK NOW button inside the home page form.
// When the visitor submits, instead of sending the form to Framer's inbox it:
//   1. saves first/last name, email, phone and dates in the browser (ejust_booking_draft)
//   2. sends signed-in guests to /booking, everyone else to /register?next=/booking
// The Register and Booking components read the saved draft and pre-fill their fields.
// It also labels the two date boxes "Check-in date" / "Check-out date" (shown inside the box
// until tapped, then the calendar opens) and stops past dates and check-out before check-in.
import { forwardRef, useEffect, useRef, type ComponentType } from "react"

const DRAFT_KEY = "ejust_booking_draft"
const TOKEN_KEY = "ejust_guest_token"
const BOOKING_PAGE = "/booking"
const REGISTER_PAGE = "/register"
const DATE_LABELS = ["Check-in date", "Check-out date"]

function todayIso(): string {
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Show the label inside an empty date box; switch to a real date picker on focus.
function setupDateInputs(form: HTMLFormElement): () => void {
    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="date"]')).slice(0, 2)
    const cleanups: Array<() => void> = []
    inputs.forEach((el, i) => {
        el.dataset.ejustDate = i === 0 ? "checkin" : "checkout"
        const label = DATE_LABELS[i]
        const toText = () => {
            if (!el.value) {
                el.type = "text"
                el.placeholder = label
            }
        }
        const toDate = () => {
            el.type = "date"
            el.min = i === 0 ? todayIso() : inputs[0]?.value || todayIso()
            try {
                ;(el as any).showPicker?.()
            } catch {}
        }
        const onChange = () => {
            // Keep check-out after check-in
            if (i === 0 && inputs[1] && inputs[1].value && inputs[1].value <= el.value) inputs[1].value = ""
        }
        el.setAttribute("aria-label", label)
        toText()
        el.addEventListener("focus", toDate)
        el.addEventListener("blur", toText)
        el.addEventListener("change", onChange)
        cleanups.push(() => {
            el.removeEventListener("focus", toDate)
            el.removeEventListener("blur", toText)
            el.removeEventListener("change", onChange)
        })
    })
    return () => cleanups.forEach((c) => c())
}

function readDraft(form: HTMLFormElement) {
    const val = (el: Element | null | undefined) => ((el as HTMLInputElement | null)?.value || "").trim()
    const texts = Array.from(form.querySelectorAll('input[type="text"]:not([data-ejust-date]), input:not([type])'))
    return {
        firstName: val(texts[0]),
        lastName: val(texts[1]),
        email: val(form.querySelector('input[type="email"]')),
        phone: val(form.querySelector('input[type="tel"]')),
        checkIn: val(form.querySelector('[data-ejust-date="checkin"]')),
        checkOut: val(form.querySelector('[data-ejust-date="checkout"]')),
        savedAt: Date.now(),
    }
}

function handleSubmit(event: Event) {
    const form = event.currentTarget as HTMLFormElement
    // Keep Framer's own form handler from sending the data to its inbox.
    event.preventDefault()
    event.stopImmediatePropagation()
    event.stopPropagation()
    if (typeof window === "undefined") return
    try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(readDraft(form)))
    } catch {}
    let signedIn = false
    try {
        signedIn = !!window.localStorage.getItem(TOKEN_KEY)
    } catch {}
    window.location.assign(
        signedIn ? BOOKING_PAGE : `${REGISTER_PAGE}?next=${encodeURIComponent(BOOKING_PAGE)}`
    )
}

export function withHeroBooking(Component: ComponentType<any>): ComponentType<any> {
    return forwardRef((props: any, forwardedRef) => {
        const localRef = useRef<HTMLElement | null>(null)

        useEffect(() => {
            const form = localRef.current?.closest("form")
            if (!form) return
            // Capture phase on the form itself runs before React's delegated submit handler.
            form.addEventListener("submit", handleSubmit, true)
            const undoDates = setupDateInputs(form)
            return () => {
                form.removeEventListener("submit", handleSubmit, true)
                undoDates()
            }
        }, [])

        const setRef = (node: HTMLElement | null) => {
            localRef.current = node
            if (typeof forwardedRef === "function") forwardedRef(node)
            else if (forwardedRef) (forwardedRef as any).current = node
        }

        return <Component {...props} ref={setRef} />
    })
}
