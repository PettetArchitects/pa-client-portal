import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import { CheckSquare, FileText, MessageCircle, AlertCircle, ChevronRight, Check, Clock, Circle, CalendarDays, DollarSign, Shield } from 'lucide-react'

export default function Overview({ projectId }) {
  const { project, isArchitect } = useProject()
  const [stats, setStats] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const portalFeatures = project?.portal_features || { payments: true, decisions: true, documents: true, messages: true }
  const showPayments = portalFeatures.payments !== false && !project?.pro_bono

  useEffect(() => {
    if (!projectId) return
    loadDashboard()
  }, [projectId])

  async function loadDashboard() {
    const queries = [
      supabase.from('homeowner_selections_portal').select('approval_status, priority', { count: 'exact' }).eq('project_id', projectId).eq('active', true),
      supabase.from('homeowner_document_shares').select('id', { count: 'exact' }).eq('project_id', projectId).eq('active', true),
      supabase.from('homeowner_milestones').select('*').eq('project_id', projectId).eq('visible_to_homeowner', true).order('display_order'),
      supabase.from('homeowner_messages').select('id', { count: 'exact' }).eq('project_id', projectId),
    ]

    // Only fetch payments if enabled
    if (showPayments) {
      queries.push(
        supabase.from('progress_payment_schedule').select('*').eq('project_id', projectId).eq('visible_to_homeowner', true).order('stage_order')
      )
    }

    const results = await Promise.all(queries)
    const [selRes, docRes, mileRes, msgRes] = results

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
    if (results[4]) setPayments(results[4].data || [])
    setLoading(false)
  }

  if (loading) return <LoadingSkeleton />

  const completed = milestones.filter(m => m.milestone_status === 'complete').length
  const total = milestones.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  const currentMilestone = milestones.find(m => m.milestone_status === 'in_progress')

  // Payment summary
  const totalContract = payments.reduce((sum, p) => sum + (Number(p.amount_inc_gst) || 0), 0)
  const paidAmount = payments.filter(p => p.claim_status === 'paid').reduce((sum, p) => sum + (Number(p.amount_inc_gst) || 0), 0)
  const certifiedAmount = payments.filter(p => p.claim_status === 'certified' || p.claim_status === 'released').reduce((sum, p) => sum + (Number(p.certified_amount || p.amount_inc_gst) || 0), 0)
  const claimedAmount = payments.filter(p => p.claim_status === 'claimed').reduce((sum, p) => sum + (Number(p.claimed_amount || p.amount_inc_gst) || 0), 0)

  const quickLinks = [
    {
      to: '/selections',
      icon: CheckSquare,
      label: 'Selections',
      value: stats?.pendingApproval || 0,
      sub: stats?.pendingApproval ? `${stats.pendingApproval} awaiting input` : 'All confirmed',
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
      to: '/messages',
      icon: MessageCircle,
      label: 'Messages',
      value: stats?.messages || 0,
      sub: 'Conversation',
    },
  ]

  return (
    <div className="relative max-w-3xl">

      {/* Welcome + current stage */}
      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-tight mb-1">Welcome back</h1>
        {currentMilestone && (
          <p className="text-sm text-[var(--color-muted)] font-light">
            Currently: <span className="text-[var(--color-text)] font-medium">{currentMilestone.title}</span>
          </p>
        )}
      </div>

      {/* Urgent banner */}
      {stats?.urgentItems > 0 && (
        <Link
          to="/selections"
          className="flex items-center gap-3 p-4 mb-8 rounded-xl border border-[var(--color-urgent)]/30 backdrop-blur-xl bg-[var(--color-urgent)]/10 hover:bg-[var(--color-urgent)]/15 transition-colors"
        >
          <AlertCircle size={18} className="text-[var(--color-urgent)] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {stats.urgentItems} item{stats.urgentItems > 1 ? 's' : ''} need{stats.urgentItems === 1 ? 's' : ''} your attention
            </p>
          </div>
          <ChevronRight size={16} className="text-[var(--color-muted)]" />
        </Link>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {quickLinks.map(({ to, icon: Icon, label, value, sub, accent }) => (
          <Link
            key={to}
            to={to}
            className="group backdrop-blur-xl bg-white/20 rounded-xl border border-white/40 p-4 hover:bg-white/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center">
                <Icon size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
              </div>
              <ChevronRight size={12} className="text-[var(--color-border)] group-hover:text-[var(--color-muted)] transition-colors" />
            </div>
            <p className={`text-xl font-light ${accent ? 'text-[var(--color-pending)]' : ''}`}>{value}</p>
            <p className="text-[10px] font-medium tracking-[1.5px] uppercase text-[var(--color-muted)] mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Progress payments — only if enabled and not pro bono */}
      {showPayments && payments.length > 0 && (
        <div className="mb-10">
          <h2 className="text-base font-medium tracking-wide mb-4">Progress Payments</h2>

          {/* Summary bar */}
          <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/40 p-5 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--color-muted)]">Contract total</span>
              <span className="text-sm font-medium">${totalContract.toLocaleString()} inc GST</span>
            </div>
            <div className="h-3 bg-[var(--color-border)] rounded-full overflow-hidden flex">
              {paidAmount > 0 && (
                <div className="h-full bg-[var(--color-approved)]" style={{ width: `${(paidAmount / totalContract) * 100}%` }} title="Paid" />
              )}
              {certifiedAmount > 0 && (
                <div className="h-full bg-[var(--color-accent)]" style={{ width: `${(certifiedAmount / totalContract) * 100}%` }} title="Certified" />
              )}
              {claimedAmount > 0 && (
                <div className="h-full bg-[var(--color-pending)]" style={{ width: `${(claimedAmount / totalContract) * 100}%` }} title="Claimed" />
              )}
            </div>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)]">
                <span className="w-2 h-2 rounded-full bg-[var(--color-approved)]" /> Paid
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)]">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" /> Certified
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)]">
                <span className="w-2 h-2 rounded-full bg-[var(--color-pending)]" /> Claimed
              </span>
            </div>
          </div>

          {/* Payment stages */}
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className={`flex items-center justify-between px-4 py-3 rounded-xl backdrop-blur-xl bg-white/20 border ${
                p.claim_status === 'claimed' ? 'border-[var(--color-pending)]/40' :
                p.claim_status === 'certified' || p.claim_status === 'released' ? 'border-[var(--color-accent)]/40' :
                p.claim_status === 'paid' ? 'border-[var(--color-approved)]/30' :
                'border-[var(--color-border)]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    p.claim_status === 'paid' ? 'bg-[var(--color-approved)]' :
                    p.claim_status === 'certified' || p.claim_status === 'released' ? 'bg-[var(--color-accent)]' :
                    p.claim_status === 'claimed' ? 'bg-[var(--color-pending)]' :
                    'bg-[var(--color-border)]'
                  }`}>
                    {p.claim_status === 'paid' ? <Check size={12} className="text-white" /> :
                     p.claim_status === 'certified' || p.claim_status === 'released' ? <Shield size={12} className="text-white" /> :
                     p.claim_status === 'claimed' ? <Clock size={12} className="text-white" /> :
                     <Circle size={8} className="text-white" />}
                  </div>
                  <div>
                    <span className="text-sm font-light">{p.stage_name}</span>
                    <span className="text-[10px] text-[var(--color-muted)] ml-2">{p.percentage}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-light">${Number(p.amount_inc_gst).toLocaleString()}</span>
                  <span className={`block text-[10px] tracking-wide uppercase font-medium ${
                    p.claim_status === 'paid' ? 'text-[var(--color-approved)]' :
                    p.claim_status === 'certified' ? 'text-[var(--color-accent)]' :
                    p.claim_status === 'claimed' ? 'text-[var(--color-pending)]' :
                    'text-[var(--color-muted)]'
                  }`}>
                    {p.claim_status === 'not_claimed' ? 'Upcoming' : p.claim_status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {milestones.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-medium tracking-wide">Project Timeline</h2>
            <span className="text-xs text-[var(--color-muted)] font-light">
              {completed} of {total} complete
            </span>
          </div>

          <div className="mb-8">
            <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-[15px] top-3 bottom-3 w-px bg-[var(--color-border)]" />
            <div className="space-y-0">
              {milestones.map((m, i) => {
                const isCompleted = m.milestone_status === 'complete'
                const isActive = m.milestone_status === 'in_progress'

                return (
                  <div key={m.id} className="relative flex gap-5 py-3 group">
                    <div className="relative z-10 shrink-0">
                      {isCompleted ? (
                        <div className="w-[30px] h-[30px] rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                          <Check size={14} strokeWidth={2} className="text-white" />
                        </div>
                      ) : isActive ? (
                        <div className="w-[30px] h-[30px] rounded-full border-2 border-[var(--color-accent)] bg-white flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-[30px] h-[30px] rounded-full border border-[var(--color-border)] bg-white flex items-center justify-center">
                          <Circle size={8} className="text-[var(--color-border)]" />
                        </div>
                      )}
                    </div>
                    <div className={`flex-1 pb-3 ${i < milestones.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`text-sm ${isCompleted || isActive ? 'font-medium' : 'font-light text-[var(--color-muted)]'}`}>{m.title}</h3>
                          {m.description && <p className="text-xs text-[var(--color-muted)] font-light mt-0.5 leading-relaxed">{m.description}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          {m.milestone_date && (
                            <div className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                              <CalendarDays size={11} />
                              {new Date(m.milestone_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                          {isActive && (
                            <span className="inline-block mt-1 text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded bg-[var(--color-pending)]/10 text-[var(--color-pending)]">Current</span>
                          )}
                          {isCompleted && m.completed_at && (
                            <span className="text-[10px] text-[var(--color-muted)] font-light">
                              {new Date(m.completed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                      {m.stage && (
                        <span className="inline-block mt-1.5 text-[10px] tracking-[1px] uppercase text-[var(--color-muted)] font-light px-2 py-0.5 bg-white/50 rounded">{m.stage}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
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
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-xl border border-[var(--color-border)]" />)}
      </div>
      <div className="h-1.5 bg-[var(--color-border)] rounded-full mb-8" />
      {[1,2,3,4,5].map(i => (
        <div key={i} className="flex gap-4 py-3">
          <div className="w-[30px] h-[30px] rounded-full bg-[var(--color-border)]" />
          <div className="flex-1"><div className="h-4 w-48 bg-[var(--color-border)] rounded" /></div>
        </div>
      ))}
    </div>
  )
}
