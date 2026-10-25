// E-JUST Guest Housing: guest sign-in / sign-up form.
// Talks to the housing backend (FastAPI): POST /api/v1/auth/login and /api/v1/auth/register.
// Stores the guest's login token in the browser so the Booking and My Bookings components can use it.
// Set "API URL" to the university's API address (e.g. https://housing-api.ejust.edu.eg).
import { startTransition, useCallback, useEffect, useState, type CSSProperties } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

const TOKEN_KEY = "ejust_guest_token"
const NAME_KEY = "ejust_guest_name"
// Saved by the home page form (HeroBookingOverride) so guests don't retype their details
const DRAFT_KEY = "ejust_booking_draft"

function readDraft(): any {
    if (typeof window === "undefined") return null
    try {
        return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null")
    } catch {
        return null
    }
}

function saveSession(token: string, name: string) {
    if (typeof window === "undefined") return
    try {
        window.localStorage.setItem(TOKEN_KEY, token)
        window.localStorage.setItem(NAME_KEY, name)
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

function cleanBase(url: string) {
    return (url || "").trim().replace(/\/+$/, "")
}

interface GuestAuthFormProps {
    mode: "login" | "register"
    apiUrl: string
    redirectTo: string
    switchLink: string
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
 * @framerIntrinsicWidth 460
 * @framerIntrinsicHeight 520
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function GuestAuthForm(props: GuestAuthFormProps) {
    const {
        mode,
        apiUrl,
        redirectTo,
        switchLink,
        accent,
        background,
        textColor,
        inputBackground,
        borderColor,
        titleFont,
        bodyFont,
    } = props
    const isRegister = mode === "register"
    const isCanvas = RenderTarget.current() === RenderTarget.canvas

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")
    const [next, setNext] = useState("")

    useEffect(() => {
        if (typeof window === "undefined") return
        const n = new URLSearchParams(window.location.search).get("next")
        // Only allow same-site paths to avoid open redirects
        if (n && n.startsWith("/") && !n.startsWith("//")) startTransition(() => setNext(n))
        const draft = readDraft()
        if (draft) {
            const fullName = [draft.firstName, draft.lastName].filter(Boolean).join(" ")
            startTransition(() => {
                if (fullName) setName((v) => v || fullName)
                if (draft.email) setEmail((v) => v || draft.email)
            })
        }
    }, [])

    const onSubmit = useCallback(
        async (e: any) => {
            e.preventDefault()
            if (isCanvas) return
            startTransition(() => {
                setBusy(true)
                setError("")
            })
            const base = cleanBase(apiUrl)
            const path = isRegister ? "/api/v1/auth/register" : "/api/v1/auth/login"
            const payload = isRegister
                ? { name: name.trim(), email: email.trim(), password }
                : { email: email.trim(), password }
            try {
                const res = await fetch(base + path, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                const body = await res.json().catch(() => ({}))
                if (!res.ok) {
                    startTransition(() => setError(errorMessage(body, res.status)))
                    return
                }
                const displayName = body?.user?.full_name || name.trim() || email.trim()
                saveSession(body.access_token, displayName)
                if (typeof window !== "undefined") {
                    window.location.assign(next || redirectTo || "/my-bookings")
                }
            } catch {
                startTransition(() =>
                    setError(`Can't reach the booking server at ${base || "(no API URL set)"}. Please try again later.`)
                )
            } finally {
                startTransition(() => setBusy(false))
            }
        },
        [apiUrl, isRegister, name, email, password, next, redirectTo, isCanvas]
    )

    // Keep the return path when switching between sign-in and register
    const switchHref = next
        ? `${switchLink}${switchLink.includes("?") ? "&" : "?"}next=${encodeURIComponent(next)}`
        : switchLink

    const field: CSSProperties = {
        width: "100%",
        boxSizing: "border-box",
        padding: "14px 16px",
        background: inputBackground,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        outline: "none",
        ...bodyFont,
    }
    const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 8, ...bodyFont, color: textColor }

    return (
        <form
            onSubmit={onSubmit}
            aria-label={isRegister ? "Create an account" : "Sign in"}
            style={{
                ...props.style,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                padding: 40,
                boxSizing: "border-box",
                background,
                color: textColor,
                borderRadius: 6,
            }}
        >
            <h2 style={{ margin: 0, ...titleFont, color: textColor }}>
                {isRegister ? "Create your account" : "Welcome back"}
            </h2>
            <p style={{ margin: 0, ...bodyFont, color: textColor, opacity: 0.7 }}>
                {isRegister
                    ? "Register to book a room at the E-JUST Guest House."
                    : "Sign in to book a room and track your bookings."}
            </p>

            {isRegister && (
                <label style={label}>
                    Full name
                    <input
                        style={field}
                        required
                        minLength={2}
                        maxLength={80}
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>
            )}
            <label style={label}>
                Email
                <input
                    style={field}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </label>
            <label style={label}>
                Password
                <input
                    style={field}
                    type="password"
                    required
                    minLength={isRegister ? 8 : 1}
                    maxLength={128}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {isRegister && <span style={{ fontSize: 12, opacity: 0.6 }}>At least 8 characters.</span>}
            </label>

            {error && (
                <div
                    role="alert"
                    style={{
                        padding: "12px 14px",
                        borderRadius: 4,
                        background: "rgba(255, 34, 68, 0.15)",
                        color: "#FF8090",
                        ...bodyFont,
                    }}
                >
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={busy}
                style={{
                    padding: "16px 20px",
                    border: "none",
                    borderRadius: 4,
                    background: accent,
                    color: "#FFFFFF",
                    cursor: busy ? "wait" : "pointer",
                    opacity: busy ? 0.7 : 1,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    ...bodyFont,
                    fontWeight: 600,
                }}
            >
                {busy ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
            </button>

            <p style={{ margin: 0, textAlign: "center", ...bodyFont, color: textColor, opacity: 0.8 }}>
                {isRegister ? "Already have an account? " : "New to the Guest House? "}
                <a href={switchHref} style={{ color: accent, fontWeight: 600 }}>
                    {isRegister ? "Sign in" : "Create an account"}
                </a>
            </p>
        </form>
    )
}

addPropertyControls(GuestAuthForm, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        options: ["login", "register"],
        optionTitles: ["Sign in", "Register"],
        defaultValue: "login",
        displaySegmentedControl: true,
    },
    apiUrl: {
        type: ControlType.String,
        title: "API URL",
        defaultValue: "http://localhost:8000",
        description: "Address of the housing backend, e.g. https://housing-api.ejust.edu.eg",
    },
    redirectTo: { type: ControlType.Link, title: "After sign-in", defaultValue: "/my-bookings" },
    switchLink: { type: ControlType.Link, title: "Switch link", defaultValue: "/register" },
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
