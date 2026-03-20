import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePractice } from '../hooks/usePractice'
import { ArrowRight, Mail } from 'lucide-react'

export default function LoginPage() {
  const { practice } = usePractice()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // login | forgot | check_email
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const practiceName = practice?.practice_name || 'Pettet Architects'
  const logoUrl = practice?.logo_url
  const accreditations = practice?.accreditations || {}
  const practiceEmail = practice?.email || 'studio@pettetarchitects.com'
  const abn = accreditations.abn || '51 165 394 721'

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Invalid email or password.'
        : error.message)
    }
    setLoading(false)
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMode('check_email')
    }
    setLoading(false)
  }

  if (mode === 'check_email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-16">
            {logoUrl && <img src={logoUrl} alt={practiceName} className="h-12 w-12 mx-auto mb-4 object-contain" />}
            <h1 className="text-[11px] font-medium tracking-[4px] uppercase text-[var(--color-text)]">
              {practiceName}
            </h1>
            <div className="w-8 h-px bg-[var(--color-border)] mx-auto mt-4"></div>
          </div>
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-[#F0F0EE] flex items-center justify-center mx-auto mb-4">
              <Mail size={18} className="text-[var(--color-muted)]" />
            </div>
            <h2 className="text-base font-medium mb-2">Check your email</h2>
            <p className="text-sm text-[var(--color-muted)] font-light leading-relaxed mb-4">
              We've sent a password reset link to <span className="font-normal text-[var(--color-text)]">{email}</span>.
            </p>
            <button
              onClick={() => { setMode('login'); setError('') }}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo + brand */}
        <div className="text-center mb-16">
          {logoUrl && <img src={logoUrl} alt={practiceName} className="h-12 w-12 mx-auto mb-4 object-contain" />}
          <h1 className="text-[11px] font-medium tracking-[4px] uppercase text-[var(--color-text)]">
            {practiceName}
          </h1>
          <div className="w-8 h-px bg-[var(--color-border)] mx-auto mt-4"></div>
          <p className="text-[11px] tracking-[2px] uppercase text-[var(--color-muted)] mt-4 font-light">
            Client Portal
          </p>
        </div>

        <form onSubmit={mode === 'forgot' ? handleForgotPassword : handleLogin} className="bg-white rounded-xl border border-[var(--color-border)] p-8">
          <h2 className="text-base font-medium mb-1">
            {mode === 'forgot' ? 'Reset password' : 'Sign in'}
          </h2>
          <p className="text-sm text-[var(--color-muted)] font-light mb-6">
            {mode === 'forgot'
              ? 'Enter your email and we\'ll send a reset link.'
              : 'Sign in with the details provided by your architect.'}
          </p>

          <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-2 font-medium">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm font-light focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />

          {mode === 'login' && (
            <>
              <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-2 mt-4 font-medium">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm font-light focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 mt-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-[var(--color-accent)] text-white py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
            {!loading && <ArrowRight size={14} />}
          </button>

          <div className="text-center mt-4">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => { setMode('forgot'); setError('') }}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Forgot your password?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Back to sign in
              </button>
            )}
          </div>
        </form>

        <p className="text-center text-[10px] text-[var(--color-muted)] mt-8 tracking-wide">
          ABN {abn} · {practiceEmail}
        </p>
      </div>
    </div>
  )
}
