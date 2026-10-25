// E-JUST Guest Housing: "My bookings" list for the signed-in guest.
// Reads GET /api/v1/bookings/me and GET /api/v1/rooms/ from the housing backend and shows each
// booking with its status (pending, confirmed, rejected, cancelled, completed). Includes sign-out.
import { startTransition, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

const TOKEN_KEY = "ejust_guest_token"
const NAME_KEY = "ejust_guest_name"

type Booking = { id: number; room_id: number; start_date: string; end_date: string; status: string; total_cost: number; created_at: string }

const STATUS: Record<string, { label: string; color: string; note: string }> = {
    pending: { label: "Pending", color: "#F5B83D", note: "Waiting for the housing office to confirm." },
    confirmed: { label: "Confirmed", color: "#34C17B", note: "Confirmed. Please pay at reception on arrival." },
    rejected: { label: "Not approved", color: "#FF8090", note: "The housing office could not approve this request." },
    cancelled: { label: "Cancelled", color: "#9A9393", note: "This booking was cancelled." },
    completed: { label: "Completed", color: "#9A9393", note: "Stay completed. Thank you for staying with us." },
}

const SAMPLE: Booking[] = [
    { id: 12, room_id: 1, start_date: "2026-11-02", end_date: "2026-11-05", status: "confirmed", total_cost: 1500, created_at: "" },
    { id: 9, room_id: 2, start_date: "2026-10-01", end_date: "2026-10-03", status: "completed", total_cost: 1500, created_at: "" },
]

function readKey(key: string): string | null {
    if (typeof window === "undefined") return null
    try {
        return window.localStorage.getItem(key)
    } catch {
        return null
    }
}

function clearSession() {
    if (typeof window === "undefined") return
    try {
        window.localStorage.removeItem(TOKEN_KEY)
        window.localStorage.removeItem(NAME_KEY)
    } catch {}
}

function nights(a: string, b: string) {
    const [y1, m1, d1] = a.split("-").map(Number)
    const [y2, m2, d2] = b.split("-").map(Number)
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

function niceDate(iso: string) {
    const [y, m, d] = iso.split("-").map(Number)
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

interface MyBookingsProps {
    apiUrl: string
    loginPage: string
    bookingPage: string
    accent: string
    background: string
    textColor: string
    borderColor: string
    titleFont: any
    bodyFont: any
    style?: CSSProperties
}

/**
 * @framerIntrinsicWidth 760
 * @framerIntrinsicHeight 480
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function MyBookings(props: MyBookingsProps) {
    const { apiUrl, loginPage, bookingPage, accent, background, textColor, borderColor, titleFont, bodyFont } = props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const base = (apiUrl || "").trim().replace(/\/+$/, "")

    const [state, setState] = useState<"loading" | "signedOut" | "error" | "ready">(isCanvas ? "ready" : "loading")
    const [bookings, setBookings] = useState<Booking[]>(isCanvas ? SAMPLE : [])
    const [roomNames, setRoomNames] = useState<Record<number, string>>(isCanvas ? { 1: "101", 2: "102" } : {})
    const [guestName, setGuestName] = useState(isCanvas ? "Guest" : "")
    const [error, setError] = useState("")

    const load = useCallback(async () => {
        const token = readKey(TOKEN_KEY)
        if (!token) {
            startTransition(() => setState("signedOut"))
            return
        }
        startTransition(() => {
            setState("loading")
            setGuestName(readKey(NAME_KEY) || "")
        })
        try {
            const [bRes, rRes] = await Promise.all([
                fetch(`${base}/api/v1/bookings/me`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${base}/api/v1/rooms/?page_size=100`),
            ])
            if (bRes.status === 401) {
                clearSession()
                startTransition(() => setState("signedOut"))
                return
            }
            if (!bRes.ok) throw new Error(String(bRes.status))
            const list: Booking[] = await bRes.json()
            const rooms = rRes.ok ? (await rRes.json()).rooms || [] : []
            const names: Record<number, string> = {}
            rooms.forEach((r: any) => (names[r.id] = r.name))
            list.sort((a, b) => (a.start_date < b.start_date ? 1 : -1))
            startTransition(() => {
                setBookings(list)
                setRoomNames(names)
                setState("ready")
            })
        } catch {
            startTransition(() => {
                setError(`Can't reach the booking server at ${base || "(no API URL set)"}. Please try again later.`)
                setState("error")
            })
        }
    }, [base])

    useEffect(() => {
        if (!isCanvas) load()
    }, [isCanvas, load])

    const signOut = useCallback(() => {
        clearSession()
        if (typeof window !== "undefined") window.location.assign(loginPage)
    }, [loginPage])

    const loginHref = useMemo(() => {
        if (typeof window === "undefined") return loginPage
        return `${loginPage}${loginPage.includes("?") ? "&" : "?"}next=${encodeURIComponent(window.location.pathname)}`
    }, [loginPage])

    const button: CSSProperties = {
        display: "inline-block",
        padding: "14px 22px",
        border: "none",
        borderRadius: 4,
        background: accent,
        color: "#FFFFFF",
        cursor: "pointer",
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        textDecoration: "none",
        ...bodyFont,
        fontWeight: 600,
    }

    return (
        <section
            aria-label="My bookings"
            style={{
                ...props.style,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 20,
                padding: 40,
                boxSizing: "border-box",
                background,
                color: textColor,
                borderRadius: 6,
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, ...titleFont, color: textColor }}>
                    {guestName ? `${guestName.split(" ")[0]}'s bookings` : "My bookings"}
                </h2>
                {state === "ready" && (
                    <div style={{ display: "flex", gap: 10 }}>
                        <a href={bookingPage} style={button}>
                            New booking
                        </a>
                        <button type="button" onClick={signOut} style={{ ...button, background: "transparent", border: `1px solid ${borderColor}` }}>
                            Sign out
                        </button>
                    </div>
                )}
            </div>

            {state === "loading" && <p style={{ margin: 0, ...bodyFont, opacity: 0.7 }}>Loading your bookings...</p>}

            {state === "signedOut" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
                    <p style={{ margin: 0, ...bodyFont, opacity: 0.8 }}>Sign in to see your bookings.</p>
                    <a href={loginHref} style={button}>
                        Sign in
                    </a>
                </div>
            )}

            {state === "error" && (
                <div role="alert" style={{ padding: "12px 14px", borderRadius: 4, background: "rgba(255, 34, 68, 0.15)", color: "#FF8090", ...bodyFont }}>
                    {error}
                </div>
            )}

            {state === "ready" && bookings.length === 0 && (
                <p style={{ margin: 0, ...bodyFont, opacity: 0.8 }}>You have no bookings yet.</p>
            )}

            {state === "ready" &&
                bookings.map((b) => {
                    const s = STATUS[b.status] || { label: b.status, color: "#9A9393", note: "" }
                    const n = nights(b.start_date, b.end_date)
                    return (
                        <article
                            key={b.id}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 16,
                                flexWrap: "wrap",
                                padding: 20,
                                border: `1px solid ${borderColor}`,
                                borderRadius: 4,
                                ...bodyFont,
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                                <div style={{ fontWeight: 600 }}>
                                    Room {roomNames[b.room_id] || b.room_id}
                                    <span style={{ opacity: 0.5, fontWeight: 400 }}> · Ref #{b.id}</span>
                                </div>
                                <div style={{ opacity: 0.8 }}>
                                    {niceDate(b.start_date)} to {niceDate(b.end_date)} · {n} night{n > 1 ? "s" : ""}
                                </div>
                                <div style={{ opacity: 0.6, fontSize: 13 }}>{s.note}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                                <span
                                    style={{
                                        padding: "4px 10px",
                                        borderRadius: 999,
                                        border: `1px solid ${s.color}`,
                                        color: s.color,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.04em",
                                    }}
                                >
                                    {s.label}
                                </span>
                                <span style={{ fontWeight: 600 }}>{b.total_cost.toLocaleString("en-US")} EGP</span>
                            </div>
                        </article>
                    )
                })}

            {state === "ready" && bookings.length > 0 && (
                <p style={{ margin: 0, fontSize: 12, opacity: 0.6, ...bodyFont }}>
                    To change or cancel a booking, please contact the housing office.
                </p>
            )}
        </section>
    )
}

addPropertyControls(MyBookings, {
    apiUrl: {
        type: ControlType.String,
        title: "API URL",
        defaultValue: "http://localhost:8000",
        description: "Address of the housing backend, e.g. https://housing-api.ejust.edu.eg",
    },
    loginPage: { type: ControlType.Link, title: "Sign-in page", defaultValue: "/login" },
    bookingPage: { type: ControlType.Link, title: "Booking page", defaultValue: "/booking" },
    accent: { type: ControlType.Color, title: "Accent", defaultValue: "rgb(207, 33, 49)" },
    background: { type: ControlType.Color, title: "Background", defaultValue: "rgb(34, 33, 33)" },
    textColor: { type: ControlType.Color, title: "Text", defaultValue: "#FFFFFF" },
    borderColor: { type: ControlType.Color, title: "Border", defaultValue: "rgb(61, 60, 60)" },
    titleFont: {
        type: ControlType.Font,
        title: "Title Font",
        defaultValue: { fontSize: "32px", variant: "Bold", letterSpacing: "-0.03em", lineHeight: "1.1em" },
        controls: "extended",
        defaultFontType: "sans-serif",
    },
    bodyFont: {
        type: ControlType.Font,
        title: "Body Font",
        defaultValue: { fontSize: "15px", variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.4em" },
        controls: "extended",
        defaultFontType: "sans-serif",
    },
})
