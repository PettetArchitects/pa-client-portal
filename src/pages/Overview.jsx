import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckSquare, FileText, Clock, MessageCircle, AlertCircle, ChevronRight } from 'lucide-react'

export default function Overview({ projectId }) {
  const [stats, setStats] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    loadDashboard()
  }, [projectId])

  async function loadDashboard() {
    const [selRes, docRes, mileRes, msgRes] = await Promise.all([
      supabase.from('homeowner_selections_portal').select('approval_status, priority', { count: 'exact' }).eq('project_id', projectId).eq('active', true),
      supabase.from('homeowner_document_shares').select('id', { count: 'exact' }).eq('project_id', projectId).eq('active', true),
      supabase.from('homeowner_milestones').select('*').eq('project_id', projectId).eq('visible_to_homeowner', true).order('display_order'),
      supabase.from('homeowner_messages').select('id', { count: 'exact' }).eq('project_id', projectId),
    ])

    const selections = selRes.data || []
    const pending = selections.filter(s => s.approval_status === 'pending').length
    const urgent = selections.filter(s => s.priority === 'urgent').length

    setStats({
      totalSelections: selections.length,
      pendingApproval: pending,
      urgentItems: urgent,
      documents: docRes.count || 0,
      messages: msgRes.count || 0,
    })
    setMilestones(mileRes.data || [])
    setLoading(false)
  }

  if (loading) return <LoadingSkeleton />

  const cards = [
    {
      to: '/selections',
      icon: CheckSquare,
      label: 'Selections',
      value: stats?.totalSelections || 0,
      sub: stats?.pendingApproval ? `${stats.pendingApproval} awaiting your approval` : 'All confirmed',
      accent: stats?.pendingApproval > 0,
    },
    {
      to: '/documents',
      icon: FileText,
      label: 'Documents',
      value: stats?.documents || 0,
      sub: 'Shared with you',
    },
    {
      to: '/timeline',
      icon: Clock,
      label: 'Milestones',
      value: milestones.length,
      sub: `${milestones.filter(m => m.milestone_status === 'completed').length} completed`,
    },
    {
      to: '/messages',
      icon: MessageCircle,
      label: 'Messages',
      value: stats?.messages || 0,
      sub: 'Conversation history',
    },
  ]

  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <h1 className="text-2xl font-light tracking-tight mb-1">Welcome back</h1>
        <p className="text-sm text-[var(--color-muted)] font-light">
          Here's the latest on your project.
        </p>
      </div>

      {/* Urgent banner */}
      {stats?.urgentItems > 0 && (
        <Link
          to="/selections"
          className="flex items-center gap-3 p-4 mb-8 rounded-xl border border-[var(--color-urgent)]/30 bg-[var(--color-urgent)]/5 hover:bg-[var(--color-urgent)]/10 transition-colors"
        >
          <AlertCircle size={18} className="text-[var(--color-urgent)] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {stats.urgentItems} item{stats.urgentItems > 1 ? 's' : ''} need{stats.urgentItems === 1 ? 's' : ''} your attention
            </p>
            <p className="text-xs text-[var(--color-muted)] font-light">
              Please review and approve to keep the project on track.
            </p>
          </div>
          <ChevronRight size={16} className="text-[var(--color-muted)]" />
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {cards.map(({ to, icon: Icon, label, value, sub, accent }) => (
          <Link
            key={to}
            to={to}
            className="group bg-white rounded-xl border border-[var(--color-border)] p-5 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-9 h-9 rounded-lg bg-[#F4F4F2] flex items-center justify-center">
                <Icon size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
              </div>
              <ChevronRight size={14} className="text-[var(--color-border)] group-hover:text-[var(--color-muted)] transition-colors mt-1" />
            </div>
            <p className={`text-2xl font-light ${accent ? 'text-[var(--color-pending)]' : ''}`}>
              {value}
            </p>
            <p className="text-xs font-medium tracking-wide uppercase text-[var(--color-muted)] mt-1">
              {label}
            </p>
            <p className="text-xs text-[var(--color-muted)] font-light mt-1">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Recent milestones */}
      {milestones.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium tracking-wide">Timeline</h2>
            <Link to="/timeline" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
              View all →
            </Link>
          </div>
          <div className="space-y-0">
            {milestones.slice(0, 5).map((m, i) => (
              <div key={m.id} className="flex items-start gap-4 py-3 border-b border-[var(--color-border)] last:border-0">
                <div className="flex flex-col items-center mt-0.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    m.milestone_status === 'completed' ? 'bg-[var(--color-approved)]' :
                    m.milestone_status === 'in_progress' ? 'bg-[var(--color-pending)]' :
                    'bg-[var(--color-border)]'
                  }`} />
                  {i < Math.min(milestones.length, 5) - 1 && (
                    <div className="w-px h-6 bg-[var(--color-border)] mt-1" />
                  )}
                </div>
                <div className="flex-1 -mt-0.5">
                  <p className="text-sm font-light">{m.title}</p>
                  {m.description && (
                    <p className="text-xs text-[var(--color-muted)] font-light mt-0.5">{m.description}</p>
                  )}
                </div>
                <span className={`text-[10px] tracking-wide uppercase font-medium px-2 py-0.5 rounded ${
                  m.milestone_status === 'completed' ? 'bg-[var(--color-approved)]/10 text-[var(--color-approved)]' :
                  m.milestone_status === 'in_progress' ? 'bg-[var(--color-pending)]/10 text-[var(--color-pending)]' :
                  'bg-[var(--color-border)] text-[var(--color-muted)]'
                }`}>
                  {m.milestone_status?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="h-8 w-48 bg-[var(--color-border)] rounded mb-2" />
      <div className="h-4 w-64 bg-[var(--color-border)] rounded mb-10" />
      <div className="grid grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-36 bg-white rounded-xl border border-[var(--color-border)]" />
        ))}
      </div>
    </div>
  )
}
