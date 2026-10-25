// E-JUST Guest Housing: room booking widget.
// Loads real rooms from the housing backend (GET /api/v1/rooms/), lets a signed-in guest pick
// a room and dates, shows the live price, and creates the booking (POST /api/v1/bookings/).
// New bookings are "pending" until the housing office confirms them (payment at reception).
// Guests who are not signed in are sent to the sign-in page and brought back afterwards.
import { startTransition, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

const TOKEN_KEY = "ejust_guest_token"
const MAX_NIGHTS = 30

type Room = { id: number; name: string; room_type: string; capacity: number; price_per_night: number; status: string }

const TYPE_LABEL: Record<string, string> = { single: "Single", double: "Double", suite: "Suite", vip_suite: "VIP Suite" }

const SAMPLE_ROOMS: Room[] = [
    { id: 1, name: "101", room_type: "single", capacity: 1, price_per_night: 500, status: "available" },
    { id: 2, name: "102", room_type: "double", capacity: 2, price_per_night: 750, status: "available" },
]

function readToken(): string | null {
    if (typeof window === "undefined") return null
    try {
        return window.localStorage.getItem(TOKEN_KEY)
    } catch {
        return null
    }
}

function clearSession() {
    if (typeof window === "undefined") return
    try {
        window.localStorage.removeItem(TOKEN_KEY)
    } catch {}
}

function errorMessage(body: any, status: number): string {
    if (body?.detail?.message) return body.detail.message
    if (typeof body?.detail === "string") return body.detail
    const first = body?.details?.errors?.[0]
    if (first) return first.ctx?.error || String(first.msg || "").replace(/^Value error, /, "")
    if (body?.message) return body.message
    return `Something went wrong (error ${status}). Please try again.`
}

function isoDay(offsetDays: number): string {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    const p = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function nightsBetween(a: string, b: string): number {
    if (!a || !b) return 0
    const [y1, m1, d1] = a.split("-").map(Number)
    const [y2, m2, d2] = b.split("-").map(Number)
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

function egp(n: number) {
    return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`
}

interface BookingWidgetProps {
    apiUrl: string
    loginPage: string
    myBookingsPage: string
    accent: string
    background: string
    textColor: string
    inputBackground: string
    borderColor: string
    titleFont: any
    bodyFont: any
    style?: CSSProperties
}

/**
 * @framerIntrinsicWidth 760
 * @framerIntrinsicHeight 640
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function BookingWidget(props: BookingWidgetProps) {
    const { apiUrl, loginPage, myBookingsPage, accent, background, textColor, inputBackground, borderColor, titleFont, bodyFont } =
        props
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const base = (apiUrl || "").trim().replace(/\/+$/, "")

    const [token, setToken] = useState<string | null>(null)
    const [rooms, setRooms] = useState<Room[]>(isCanvas ? SAMPLE_ROOMS : [])
    const [loading, setLoading] = useState(!isCanvas)
    const [loadError, setLoadError] = useState("")
    const [roomId, setRoomId] = useState<number | "">(isCanvas ? 1 : "")
    const [checkIn, setCheckIn] = useState(isoDay(1))
    const [checkOut, setCheckOut] = useState(isoDay(3))
    const [phone, setPhone] = useState("")
    const [universityId, setUniversityId] = useState("")
    const [nationalId, setNationalId] = useState("")
    const [notes, setNotes] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const [created, setCreated] = useState<any>(null)

    useEffect(() => {
        if (isCanvas) return
        startTransition(() => setToken(readToken()))
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch(`${base}/api/v1/rooms/?page_size=100`)
                const body = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(errorMessage(body, res.status))
                const list: Room[] = (body.rooms || []).filter((r: Room) => r.status !== "maintenance")
                if (!cancelled)
                    startTransition(() => {
                        setRooms(list)
                        if (list.length) setRoomId(list[0].id)
                    })
            } catch {
                if (!cancelled)
                    startTransition(() =>
                        setLoadError(`Can't reach the booking server at ${base || "(no API URL set)"}. Please try again later.`)
                    )
            } finally {
                if (!cancelled) startTransition(() => setLoading(false))
            }
        })()
        return () => {
            cancelled = true
        }
    }, [base, isCanvas])

    const room = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId])
    const nights = nightsBetween(checkIn, checkOut)
    const datesValid = nights >= 1 && nights <= MAX_NIGHTS && checkIn >= isoDay(0)
    const total = room && datesValid ? room.price_per_night * nights : 0

    const loginHref = useMemo(() => {
        if (typeof window === "undefined") return loginPage
        const sep = loginPage.includes("?") ? "&" : "?"
        return `${loginPage}${sep}next=${encodeURIComponent(window.location.pathname)}`
    }, [loginPage])

    const onSubmit = useCallback(
        async (e: any) => {
            e.preventDefault()
            if (isCanvas || !room) return
            if (!token) {
                if (typeof window !== "undefined") window.location.assign(loginHref)
                return
            }
            startTransition(() => {
                setBusy(true)
                setError("")
            })
            try {
                const res = await fetch(`${base}/api/v1/bookings/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        room_id: room.id,
                        start_date: checkIn,
                        end_date: checkOut,
                        phone_number: phone.trim() || null,
                        university_id: universityId.trim() || null,
                        national_id: nationalId.trim() || null,
                        special_requests: notes.trim() || null,
                    }),
                })
                const body = await res.json().catch(() => ({}))
                if (res.status === 401) {
                    clearSession()
                    startTransition(() => {
                        setToken(null)
                        setError("Your session has expired. Please sign in again.")
                    })
                    return
                }
                if (!res.ok) {
                    startTransition(() => setError(errorMessage(body, res.status)))
                    return
                }
                startTransition(() => setCreated(body))
            } catch {
                startTransition(() => setError(`Can't reach the booking server at ${base}. Please try again later.`))
            } finally {
                startTransition(() => setBusy(false))
            }
        },
        [isCanvas, room, token, loginHref, base, checkIn, checkOut, phone, universityId, nationalId, notes]
    )

    const field: CSSProperties = {
        width: "100%",
        boxSizing: "border-box",
        padding: "14px 16px",
        background: inputBackground,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        outline: "none",
        colorScheme: "dark",
        ...bodyFont,
    }
    const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 8, ...bodyFont, color: textColor, minWidth: 0 }
    const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }
    const shell: CSSProperties = {
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
    }
    const button: CSSProperties = {
        padding: "16px 24px",
        border: "none",
        borderRadius: 4,
        background: accent,
        color: "#FFFFFF",
        cursor: "pointer",
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        textDecoration: "none",
        textAlign: "center",
        ...bodyFont,
        fontWeight: 600,
    }

    if (created) {
        return (
            <section style={shell} aria-live="polite">
                <h2 style={{ margin: 0, ...titleFont, color: textColor }}>Booking request received</h2>
                <p style={{ margin: 0, ...bodyFont, color: textColor, opacity: 0.8 }}>
                    Reference <strong>#{created.id}</strong>: room {room?.name}, {created.start_date} to {created.end_date} (
                    {nightsBetween(created.start_date, created.end_date)} nights), total <strong>{egp(created.total_cost)}</strong>.
                </p>
                <p style={{ margin: 0, ...bodyFont, color: textColor, opacity: 0.8 }}>
                    Your booking is <strong>pending</strong>. The housing office will confirm it; payment is made at reception.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <a href={myBookingsPage} style={button}>
                        View my bookings
                    </a>
                    <button
                        type="button"
                        style={{ ...button, background: "transparent", border: `1px solid ${borderColor}` }}
                        onClick={() => startTransition(() => setCreated(null))}
                    >
                        Book another room
                    </button>
                </div>
            </section>
        )
    }

    return (
        <form onSubmit={onSubmit} aria-label="Book a room" style={shell}>
            <h2 style={{ margin: 0, ...titleFont, color: textColor }}>Book your stay</h2>

            {loading && <p style={{ margin: 0, ...bodyFont, opacity: 0.7 }}>Loading available rooms...</p>}
            {loadError && (
                <div role="alert" style={{ padding: "12px 14px", borderRadius: 4, background: "rgba(255, 34, 68, 0.15)", color: "#FF8090", ...bodyFont }}>
                    {loadError}
                </div>
            )}
            {!loading && !loadError && rooms.length === 0 && (
                <p style={{ margin: 0, ...bodyFont, opacity: 0.7 }}>No rooms are open for booking right now.</p>
            )}

            {rooms.length > 0 && (
                <>
                    <label style={label}>
                        Room
                        <select style={field} value={roomId} onChange={(e) => setRoomId(Number(e.target.value))} required>
                            {rooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {`Room ${r.name}: ${TYPE_LABEL[r.room_type] || r.room_type}, up to ${r.capacity} guest${
                                        r.capacity > 1 ? "s" : ""
                                    }, ${egp(r.price_per_night)} / night`}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div style={grid}>
                        <label style={label}>
                            Check-in
                            <input
                                style={field}
                                type="date"
                                required
                                min={isoDay(0)}
                                value={checkIn}
                                onChange={(e) => {
                                    const v = e.target.value
                                    setCheckIn(v)
                                    if (nightsBetween(v, checkOut) < 1) {
                                        const [y, m, d] = v.split("-").map(Number)
                                        const n = new Date(Date.UTC(y, m - 1, d + 1))
                                        setCheckOut(n.toISOString().slice(0, 10))
                                    }
                                }}
                            />
                        </label>
                        <label style={label}>
                            Check-out
                            <input
                                style={field}
                                type="date"
                                required
                                min={checkIn}
                                value={checkOut}
                                onChange={(e) => setCheckOut(e.target.value)}
                            />
                        </label>
                    </div>

                    <div style={grid}>
                        <label style={label}>
                            Phone number
                            <input style={field} type="tel" autoComplete="tel" maxLength={30} required placeholder="+20 ..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </label>
                        <label style={label}>
                            University ID (if E-JUST)
                            <input style={field} maxLength={50} value={universityId} onChange={(e) => setUniversityId(e.target.value)} />
                        </label>
                        <label style={label}>
                            National ID / passport
                            <input style={field} maxLength={50} value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
                        </label>
                    </div>

                    <label style={label}>
                        Special requests (optional)
                        <textarea style={{ ...field, minHeight: 80, resize: "vertical" }} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </label>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 16,
                            flexWrap: "wrap",
                            paddingTop: 16,
                            borderTop: `1px solid ${borderColor}`,
                        }}
                    >
                        <div style={{ ...bodyFont }}>
                            {datesValid && room ? (
                                <>
                                    <div style={{ opacity: 0.7 }}>
                                        {nights} night{nights > 1 ? "s" : ""} x {egp(room.price_per_night)}
                                    </div>
                                    <div style={{ ...titleFont, fontSize: 26, color: textColor }}>{egp(total)}</div>
                                </>
                            ) : (
                                <div style={{ color: "#FF8090" }}>
                                    {nights > MAX_NIGHTS ? `Bookings are limited to ${MAX_NIGHTS} nights.` : "Choose a check-out date after check-in."}
                                </div>
                            )}
                        </div>
                        <button type="submit" disabled={busy || !datesValid || !room} style={{ ...button, opacity: busy || !datesValid ? 0.6 : 1, cursor: busy ? "wait" : "pointer" }}>
                            {busy ? "Booking..." : token || isCanvas ? "Request booking" : "Sign in to book"}
                        </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.6, ...bodyFont }}>
                        Payment is made at reception. Your booking is confirmed by the housing office.
                    </p>
                </>
            )}

            {error && (
                <div role="alert" style={{ padding: "12px 14px", borderRadius: 4, background: "rgba(255, 34, 68, 0.15)", color: "#FF8090", ...bodyFont }}>
                    {error}
                    {!token && !isCanvas && (
                        <>
                            {" "}
                            <a href={loginHref} style={{ color: accent, fontWeight: 600 }}>
                                Sign in
                            </a>
                        </>
                    )}
                </div>
            )}
        </form>
    )
}

addPropertyControls(BookingWidget, {
    apiUrl: {
        type: ControlType.String,
        title: "API URL",
        defaultValue: "http://localhost:8000",
        description: "Address of the housing backend, e.g. https://housing-api.ejust.edu.eg",
    },
    loginPage: { type: ControlType.Link, title: "Sign-in page", defaultValue: "/login" },
    myBookingsPage: { type: ControlType.Link, title: "My bookings", defaultValue: "/my-bookings" },
    accent: { type: ControlType.Color, title: "Accent", defaultValue: "rgb(207, 33, 49)" },
    background: { type: ControlType.Color, title: "Background", defaultValue: "rgb(34, 33, 33)" },
    textColor: { type: ControlType.Color, title: "Text", defaultValue: "#FFFFFF" },
    inputBackground: { type: ControlType.Color, title: "Input", defaultValue: "rgb(42, 41, 41)" },
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
