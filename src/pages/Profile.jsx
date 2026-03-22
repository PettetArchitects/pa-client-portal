import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../hooks/useProject'
import { Check, AlertCircle } from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()
  const { isArchitect } = useProject()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data } = await supabase
        .from('homeowner_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
      setLoading(false)
    }
    load()
  }, [user])

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('homeowner_profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        notification_email: profile.notification_email,
        notification_sms: profile.notification_sms,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Profile updated.' })
    }
    setSaving(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordSaving(false)
  }

  if (loading) {
    return <div className="text-[13px] text-[var(--color-muted)]">Loading...</div>
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-[18px] font-medium text-[var(--color-text)] mb-1">Profile</h1>
      <p className="text-[13px] text-[var(--color-muted)] font-light mb-8">
        Manage your account details and preferences.
      </p>

      {/* Profile details */}
      <form onSubmit={handleSaveProfile} className="mb-10">
        <h2 className="text-[11px] font-medium tracking-[2px] uppercase text-[var(--color-muted)] mb-4">
          Details
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[#F0F0EE] text-[13px] text-[var(--color-muted)] cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">
              Full name
            </label>
            <input
              type="text"
              value={profile?.full_name || ''}
              onChange={e => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[13px] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">
              Phone
            </label>
            <input
              type="tel"
              value={profile?.phone || ''}
              onChange={e => setProfile({ ...profile, phone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[13px] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile?.notification_email ?? true}
                onChange={e => setProfile({ ...profile, notification_email: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
              />
              <span className="text-[13px] text-[var(--color-text)]">Email notifications</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile?.notification_sms ?? false}
                onChange={e => setProfile({ ...profile, notification_sms: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-accent)]"
              />
              <span className="text-[13px] text-[var(--color-text)]">SMS notifications</span>
            </label>
          </div>
        </div>

        {message && (
          <div className="flex items-center gap-2 mt-4 text-[12px]" style={{ color: message.type === 'success' ? 'var(--color-approved)' : 'var(--color-urgent)' }}>
            {message.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-4 px-6 py-2.5 bg-[var(--color-text)] text-white text-[13px] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      {/* Password change */}
      <div className="border-t border-[var(--color-border)] pt-8">
        <h2 className="text-[11px] font-medium tracking-[2px] uppercase text-[var(--color-muted)] mb-4">
          Change password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[13px] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[13px] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          {passwordMsg && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: passwordMsg.type === 'success' ? 'var(--color-approved)' : 'var(--color-urgent)' }}>
              {passwordMsg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              {passwordMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordSaving}
            className="px-6 py-2.5 bg-[var(--color-text)] text-white text-[13px] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {passwordSaving ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>

      {/* Role badge */}
      <div className="border-t border-[var(--color-border)] pt-6 mt-8">
        <p className="text-[10px] text-[var(--color-muted)] tracking-wide uppercase">
          Account type: {isArchitect ? 'Architect (admin)' : 'Client'}
        </p>
      </div>
    </div>
  )
}
