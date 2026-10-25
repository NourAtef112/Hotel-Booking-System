// E-JUST Guest Housing: home page "BOOK NOW" form hand-off.
// Attach `withHeroBooking` to the BOOK NOW button inside the home page form.
// When the visitor submits, instead of sending the form to Framer's inbox it:
//   1. saves first/last name, email, phone and dates in the browser (ejust_booking_draft)
//   2. sends signed-in guests to /booking, everyone else to /register?next=/booking
// The Register and Booking components read the saved draft and pre-fill their fields.
import { forwardRef, useEffect, useRef, type ComponentType } from "react"

const DRAFT_KEY = "ejust_booking_draft"
const TOKEN_KEY = "ejust_guest_token"
const BOOKING_PAGE = "/booking"
const REGISTER_PAGE = "/register"

function readDraft(form: HTMLFormElement) {
    const val = (el: Element | null | undefined) => ((el as HTMLInputElement | null)?.value || "").trim()
    const texts = Array.from(form.querySelectorAll('input[type="text"], input:not([type])'))
    const dates = Array.from(form.querySelectorAll('input[type="date"]'))
    return {
        firstName: val(texts[0]),
        lastName: val(texts[1]),
        email: val(form.querySelector('input[type="email"]')),
        phone: val(form.querySelector('input[type="tel"]')),
        checkIn: val(dates[0]),
        checkOut: val(dates[1]),
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
            return () => form.removeEventListener("submit", handleSubmit, true)
        }, [])

        const setRef = (node: HTMLElement | null) => {
            localRef.current = node
            if (typeof forwardedRef === "function") forwardedRef(node)
            else if (forwardedRef) (forwardedRef as any).current = node
        }

        return <Component {...props} ref={setRef} />
    })
}
