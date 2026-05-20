import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveToken } from '../../lib/auth'

const API = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const loginRes = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!loginRes.ok) {
        setError('Invalid email or password')
        return
      }

      const { access_token } = await loginRes.json()

      const meRes = await fetch(`${API}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })

      if (!meRes.ok) {
        setError('Could not verify your account')
        return
      }

      const user = await meRes.json()

      if (user.role !== 'admin') {
        setError('You do not have staff access')
        return
      }

      saveToken(access_token)
      navigate('/admin/overview', { replace: true })
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f0eb] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <img src="/ejust_logo.png" alt="E-JUST" className="h-10 w-10 rounded-lg" />
          <span className="font-semibold text-lg text-gray-800">E-JUST Admin Portal</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Staff Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ejust.edu.eg"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#8B2500]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#8B2500]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8B2500] hover:bg-[#6d1c00] disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In as Staff'}
          </button>
        </form>
      </div>
    </div>
  )
}
