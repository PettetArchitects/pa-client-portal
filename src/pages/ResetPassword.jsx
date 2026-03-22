import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowRight, Check } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Supabase sends the user here with a recovery token in the URL hash
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User has arrived via the reset link — show the form
      }
    })
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => navigate('/'), 2000)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-center mb-8">
            <h1 className="text-[11px] font-medium tracking-[4px] uppercase text-[var(--color-text)]">
              Pettet Architects
            </h1>
          </div>
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-8">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(45, 74, 38, 0.1)' }}>
              <Check size={18} style={{ color: 'var(--color-approved)' }} />
            </div>
            <p className="text-[13px] font-medium text-[var(--color-text)] mb-2">Password updated</p>
            <p className="text-[12px] text-[var(--color-muted)]">Redirecting to your portal...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-16">
          <h1 className="text-[11px] font-medium tracking-[4px] uppercase text-[var(--color-text)]">
            Pettet Architects
          </h1>
          <div className="w-8 h-px bg-[var(--color-border)] mx-auto mt-4"></div>
          <p className="text-[11px] tracking-[2px] uppercase text-[var(--color-muted)] mt-4 font-light">
            Client Portal
          </p>
        </div>

        <form onSubmit={handleReset} className="bg-white rounded-xl border border-[var(--color-border)] p-8">
          <h2 className="text-[15px] font-medium mb-1">Set new password</h2>
          <p className="text-[13px] text-[var(--color-muted)] font-light mb-6">
            Choose a password with at least 8 characters.
          </p>

          <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-2 font-medium">
            New password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[13px] font-light focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />

          <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-2 mt-4 font-medium">
            Confirm password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            required
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[13px] font-light focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />

          {error && (
            <p className="text-[12px] mt-3" style={{ color: 'var(--color-urgent)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-[var(--color-accent)] text-white py-3 rounded-lg text-[13px] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Set password'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>
      </div>
    </div>
  )
}
