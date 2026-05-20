// Framer custom code component
// Instructions:
//   1. In Framer: Assets → Code → + New Code File → name it "StaffLoginForm"
//   2. Paste this entire file, replacing YOUR_RAILWAY_URL with your Railway backend URL
//   3. Drag the component onto the Staff tab content panel
//   4. Publish

import { useState, FormEvent } from "react"

const API_URL = "https://master-sandbox-production.up.railway.app"
const ADMIN_DASHBOARD_URL = "https://hotel-booking-system-azure-nu.vercel.app"

export default function StaffLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Step 1: get JWT
      const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!loginRes.ok) {
        setError("Invalid email or password")
        return
      }

      const { access_token } = await loginRes.json()

      // Step 2: verify role
      const meRes = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })

      if (!meRes.ok) {
        setError("Could not verify your account")
        return
      }

      const user = await meRes.json()

      if (user.role !== "admin") {
        setError("You do not have staff access")
        return
      }

      // Step 3: redirect to admin dashboard with token in URL
      // The dashboard reads ?t= on load, saves to localStorage, then removes it
      window.location.href = `${ADMIN_DASHBOARD_URL}/?t=${encodeURIComponent(access_token)}`
    } catch {
      setError("Connection error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #d1c7be",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14,
    outline: "none",
    background: "#faf7f4",
    color: "#1a1a1a",
    boxSizing: "border-box",
  }

  const btnStyle: React.CSSProperties = {
    width: "100%",
    background: loading ? "#c4a898" : "#8B2500",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px",
    fontSize: 15,
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    marginTop: 8,
    transition: "background 0.2s",
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}
    >
      <input
        type="email"
        required
        placeholder="Staff email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={inputStyle}
      />
      <input
        type="password"
        required
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={inputStyle}
      />

      {error && (
        <p
          style={{
            fontSize: 13,
            color: "#c0392b",
            background: "#fdecea",
            borderRadius: 8,
            padding: "8px 12px",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} style={btnStyle}>
        {loading ? "Signing in…" : "Sign In as Staff"}
      </button>
    </form>
  )
}
