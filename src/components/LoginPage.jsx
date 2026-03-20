import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { ArrowRight, Mail } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-16">
          <h1 className="text-[11px] font-medium tracking-[4px] uppercase text-[var(--color-text)]">
            Pettet Architects
          </h1>
          <div className="w-8 h-px bg-[var(--color-border)] mx-auto mt-4"></div>
          <p className="text-[11px] tracking-[2px] uppercase text-[var(--color-muted)] mt-4 font-light">
            Client Portal
          </p>
        </div>

        {sent ? (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-[#F0F0EE] flex items-center justify-center mx-auto mb-4">
              <Mail size={18} className="text-[var(--color-muted)]" />
            </div>
            <h2 className="text-base font-medium mb-2">Check your email</h2>
            <p className="text-sm text-[var(--color-muted)] font-light leading-relaxed">
              We've sent a sign-in link to <span className="font-normal text-[var(--color-text)]">{email}</span>.
              Click the link to access your project portal.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-8">
            <h2 className="text-base font-medium mb-1">Sign in</h2>
            <p className="text-sm text-[var(--color-muted)] font-light mb-6">
              Enter your email to receive a sign-in link.
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

            {error && (
              <p className="text-xs text-[var(--color-change)] mt-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-[var(--color-accent)] text-white py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Continue'}
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>
        )}

        <p className="text-center text-[10px] text-[var(--color-muted)] mt-8 tracking-wide">
          ABN 51 165 394 721 · studio@pettetarchitects.com
        </p>
      </div>
    </div>
  )
}
