import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import {
  CheckSquare, FileText, MessageCircle, AlertCircle, ChevronRight,
  Check, Clock, Circle, CalendarDays, DollarSign, Shield, ArrowRight,
  Home, Package, Layers
} from 'lucide-react'

const GROUP_LABELS = {
  bathrooms: 'Bathrooms',
  doors_hardware: 'Doors & Hardware',
  exterior: 'Exterior',
  flooring: 'Flooring',
  internal_finishes: 'Internal Finishes',
  joinery: 'Joinery',
  kitchen: 'Kitchen',
  lighting_electrical: 'Lighting & Electrical',
  mechanical: 'Mechanical',
  services_infra: 'Services & Infrastructure',
  thermal_envelope: 'Thermal Envelope',
}

export default function Overview({ projectId }) {
  const { project, isArchitect } = useProject()
  const [stats, setStats] = useState(null)
  const [groups, setGroups] = useState([])
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
      supabase.from('homeowner_selections_portal').select('approval_status, priority, schedule_group, portal_image_url').eq('project_id', projectId).eq('active', true),
      supabase.from('homeowner_document_shares').select('id', { count: 'exact' }).eq('project_id', projectId).eq('active', true),
      supabase.from('homeowner_milestones').select('*').eq('project_id', projectId).eq('visible_to_homeowner', true).order('display_order'),
      supabase.from('homeowner_messages').select('id', { count: 'exact' }).eq('project_id', projectId),
    ]

    if (showPayments) {
      queries.push(
        supabase.from('progress_payment_schedule').select('*').eq('project_id', projectId).eq('visible_to_homeowner', true).order('stage_order')
      )
    }

    const results = await Promise.all(queries)
    const [selRes, docRes, mileRes, msgRes] = results

    const selections = selRes.data || []
    const pending = selections.filter(s => s.approval_status === 'pending').length
    const approved = selections.filter(s => s.approval_status === 'approved').length
    const urgent = selections.filter(s => s.priority === 'urgent').length

    // Build schedule group breakdown
    const groupMap = {}
    selections.forEach(s => {
      const g = s.schedule_group || 'other'
      if (!groupMap[g]) groupMap[g] = { total: 0, approved: 0, pending: 0 }
      groupMap[g].total++
      if (s.approval_status === 'approved') groupMap[g].approved++
      if (s.approval_status === 'pending') groupMap[g].pending++
    })
    const groupList = Object.entries(groupMap)
      .map(([key, val]) => ({ key, label: GROUP_LABELS[key] || key.replace(/_/g, ' '), ...val }))
      .sort((a, b) => b.pending - a.pending)

    setStats({
      totalSelections: selections.length,
      approvedSelections: approved,
      pendingApproval: pending,
      urgentItems: urgent,
      documents: docRes.count || 0,
      messages: msgRes.count || 0,
    })
    setGroups(groupList)
    setMilestones(mileRes.data || [])
    if (results[4]) setPayments(results[4].data || [])
    setLoading(false)
  }

  if (loading) return <LoadingSkeleton />

  const completed = milestones.filter(m => m.milestone_status === 'complete').length
  const total = milestones.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  const currentMilestone = milestones.find(m => m.milestone_status === 'in_progress')
  const nextMilestones = milestones.filter(m => m.milestone_status === 'upcoming').slice(0, 3)

  const totalContract = payments.reduce((sum, p) => sum + (Number(p.amount_inc_gst) || 0), 0)
  const paidAmount = payments.filter(p => p.claim_status === 'paid').reduce((sum, p) => sum + (Number(p.amount_inc_gst) || 0), 0)
  const certifiedAmount = payments.filter(p => p.claim_status === 'certified' || p.claim_status === 'released').reduce((sum, p) => sum + (Number(p.certified_amount || p.amount_inc_gst) || 0), 0)
  const claimedAmount = payments.filter(p => p.claim_status === 'claimed').reduce((sum, p) => sum + (Number(p.claimed_amount || p.amount_inc_gst) || 0), 0)

  const selectionPct = stats.totalSelections > 0 ? Math.round((stats.approvedSelections / stats.totalSelections) * 100) : 0

  return (
    <div className="relative max-w-3xl space-y-6">

      {/* Project Status Hero */}
      <div className="backdrop-blur-xl bg-white/60 rounded-xl border border-white/40 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-light tracking-tight mb-1">{project?.name || 'Your Project'}</h1>
            {currentMilestone && (
              <p className="text-sm text-[var(--color-muted)] font-light">
                Currently: <span className="text-[var(--color-text)] font-medium">{currentMilestone.title}</span>
              </p>
            )}
          </div>
          {project?.stage && (
            <span className="shrink-0 text-[10px] font-medium tracking-[1px] uppercase px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20">
              {project.stage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-[var(--color-muted)] font-medium shrink-0">{progress}%</span>
        </div>
        <p className="text-[10px] text-[var(--color-muted)] mt-1.5">{completed} of {total} milestones complete</p>
      </div>

      {stats?.urgentItems > 0 && (
        <Link to="/selections" className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-urgent)]/30 backdrop-blur-xl bg-[var(--color-urgent)]/10 hover:bg-[var(--color-urgent)]/15 transition-colors">
          <AlertCircle size={18} className="text-[var(--color-urgent)] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{stats.urgentItems} item{stats.urgentItems > 1 ? 's' : ''} need{stats.urgentItems === 1 ? 's' : ''} your attention</p>
          </div>
          <ChevronRight size={16} className="text-[var(--color-muted)]" />
        </Link>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Link to="/selections" className="group backdrop-blur-xl bg-white/40 rounded-xl border border-white/40 p-4 hover:bg-white/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center"><CheckSquare size={13} strokeWidth={1.5} className="text-[var(--color-muted)]" /></div>
            <ChevronRight size={12} className="text-[var(--color-border)] group-hover:text-[var(--color-muted)] transition-colors" />
          </div>
          <p className="text-2xl font-light">{stats.pendingApproval}</p>
          <p className="text-[10px] font-medium tracking-[1px] uppercase text-[var(--color-muted)] mt-0.5">Pending Decisions</p>
          <p className="text-[10px] text-[var(--color-muted)] font-light mt-1">{stats.approvedSelections} of {stats.totalSelections} confirmed</p>
        </Link>
        <Link to="/documents" className="group backdrop-blur-xl bg-white/40 rounded-xl border border-white/40 p-4 hover:bg-white/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center"><FileText size={13} strokeWidth={1.5} className="text-[var(--color-muted)]" /></div>
            <ChevronRight size={12} className="text-[var(--color-border)] group-hover:text-[var(--color-muted)] transition-colors" />
          </div>
          <p className="text-2xl font-light">{stats.documents}</p>
          <p className="text-[10px] font-medium tracking-[1px] uppercase text-[var(--color-muted)] mt-0.5">Documents</p>
          <p className="text-[10px] text-[var(--color-muted)] font-light mt-1">Shared with you</p>
        </Link>
        <Link to="/messages" className="group backdrop-blur-xl bg-white/40 rounded-xl border border-white/40 p-4 hover:bg-white/50 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center"><MessageCircle size={13} strokeWidth={1.5} className="text-[var(--color-muted)]" /></div>
            <ChevronRight size={12} className="text-[var(--color-border)] group-hover:text-[var(--color-muted)] transition-colors" />
          </div>
          <p className="text-2xl font-light">{stats.messages}</p>
          <p className="text-[10px] font-medium tracking-[1px] uppercase text-[var(--color-muted)] mt-0.5">Messages</p>
          <p className="text-[10px] text-[var(--color-muted)] font-light mt-1">Conversations</p>
        </Link>
      </div>

      {groups.length > 0 && (
        <div className="backdrop-blur-xl bg-white/40 rounded-xl border border-white/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium tracking-wide">Selection Progress</h2>
            <Link to="/selections" className="text-[10px] font-medium tracking-[1px] uppercase text-[var(--color-accent)] hover:underline flex items-center gap-1">View all <ArrowRight size={10} /></Link>
          </div>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[var(--color-muted)]">{stats.approvedSelections} confirmed of {stats.totalSelections}</span>
              <span className="text-xs font-medium text-[var(--color-accent)]">{selectionPct}%</span>
            </div>
            <div className="h-2.5 bg-white/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${selectionPct}%`, background: selectionPct > 50 ? 'var(--color-approved)' : 'var(--color-accent)' }} />
            </div>
          </div>
          <div className="space-y-2.5">
            {groups.map(g => {
              const pct = g.total > 0 ? Math.round((g.approved / g.total) * 100) : 0
              return (
                <div key={g.key} className="flex items-center gap-3">
                  <span className="text-xs font-light w-36 shrink-0 truncate capitalize">{g.label}</span>
                  <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-[var(--color-muted)] w-14 text-right shrink-0">{g.approved}/{g.total}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showPayments && payments.length > 0 && (
        <div className="backdrop-blur-xl bg-white/40 rounded-xl border border-white/40 p-5">
          <h2 className="text-sm font-medium tracking-wide mb-4">Progress Payments</h2>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[var(--color-muted)]">Contract total</span>
            <span className="text-sm font-medium">${totalContract.toLocaleString()} inc GST</span>
          </div>
          <div className="h-3 bg-white/50 rounded-full overflow-hidden flex mb-2">
            {paidAmount > 0 && (<div className="h-full bg-[var(--color-approved)]" style={{ width: `${(paidAmount / totalContract) * 100}%` }} title="Paid" />)}
            {certifiedAmount > 0 && (<div className="h-full bg-[var(--color-accent)]" style={{ width: `${(certifiedAmount / totalContract) * 100}%` }} title="Certified" />)}
            {claimedAmount > 0 && (<div className="h-full bg-[var(--color-pending)]" style={{ width: `${(claimedAmount / totalContract) * 100}%` }} title="Claimed" />)}
          </div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)]"><span className="w-2 h-2 rounded-full bg-[var(--color-approved)]" /> Paid</span>
            <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)]"><span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" /> Certified</span>
            <span className="flex items-center gap-1.5 text-[10px] text-[var(--color-muted)]"><span className="w-2 h-2 rounded-full bg-[var(--color-pending)]" /> Claimed</span>
          </div>
          <div className="mt-4 space-y-1.5">
            {payments.map(p => (
              <div key={p.id} className={`flex items-center justify-between px-3 py-2 rounded-lg bg-white/30 border ${
                p.claim_status === 'claimed' ? 'border-[var(--color-pending)]/30' :
                p.claim_status === 'certified' || p.claim_status === 'released' ? 'border-[var(--color-accent)]/30' :
                p.claim_status === 'paid' ? 'border-[var(--color-approved)]/20' : 'border-[var(--color-border)]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    p.claim_status === 'paid' ? 'bg-[var(--color-approved)]' :
                    p.claim_status === 'certified' || p.claim_status === 'released' ? 'bg-[var(--color-accent)]' :
                    p.claim_status === 'claimed' ? 'bg-[var(--color-pending)]' : 'bg-[var(--color-border)]'
                  }`}>
                    {p.claim_status === 'paid' ? <Check size={10} className="text-white" /> :
                     p.claim_status === 'certified' || p.claim_status === 'released' ? <Shield size={10} className="text-white" /> :
                     p.claim_status === 'claimed' ? <Clock size={10} className="text-white" /> :
                     <Circle size={6} className="text-white" />}
                  </div>
                  <span className="text-xs font-light">{p.stage_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-light">${Number(p.amount_inc_gst).toLocaleString()}</span>
                  <span className={`block text-[9px] tracking-wide uppercase font-medium ${
                    p.claim_status === 'paid' ? 'text-[var(--color-approved)]' :
                    p.claim_status === 'certified' ? 'text-[var(--color-accent)]' :
                    p.claim_status === 'claimed' ? 'text-[var(--color-pending)]' : 'text-[var(--color-muted)]'
                  }`}>{p.claim_status === 'not_claimed' ? 'Upcoming' : p.claim_status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {milestones.length > 0 && (
        <div className="backdrop-blur-xl bg-white/40 rounded-xl border border-white/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium tracking-wide">Timeline</h2>
            <Link to="/timeline" className="text-[10px] font-medium tracking-[1px] uppercase text-[var(--color-accent)] hover:underline flex items-center gap-1">Full timeline <ArrowRight size={10} /></Link>
          </div>
          {currentMilestone && (
            <div className="flex items-start gap-3 p-3 mb-4 rounded-lg bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/15">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] bg-white flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{currentMilestone.title}</p>
                {currentMilestone.description && (
                  <p className="text-xs text-[var(--color-muted)] font-light mt-0.5 leading-relaxed">{currentMilestone.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] tracking-[1px] uppercase px-2 py-0.5 rounded bg-[var(--color-pending)]/10 text-[var(--color-pending)] font-medium">In Progress</span>
                  {currentMilestone.stage && (
                    <span className="text-[10px] tracking-[1px] uppercase text-[var(--color-muted)] font-light px-2 py-0.5 bg-white/50 rounded">{currentMilestone.stage}</span>
                  )}
                  {currentMilestone.milestone_date && (
                    <span className="flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
                      <CalendarDays size={10} />
                      {new Date(currentMilestone.milestone_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {nextMilestones.length > 0 && (
            <div>
              <p className="text-[10px] font-medium tracking-[1.5px] uppercase text-[var(--color-muted)] mb-2">Coming Up</p>
              <div className="space-y-1">
                {nextMilestones.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/30">
                    <div className="w-5 h-5 rounded-full border border-[var(--color-border)] bg-white flex items-center justify-center shrink-0">
                      <Circle size={6} className="text-[var(--color-border)]" />
                    </div>
                    <span className="text-xs font-light flex-1">{m.title}</span>
                    {m.stage && (<span className="text-[9px] tracking-[1px] uppercase text-[var(--color-muted)] font-light">{m.stage}</span>)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {completed > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
              <p className="text-[10px] font-medium tracking-[1.5px] uppercase text-[var(--color-muted)] mb-2">Completed</p>
              <div className="flex flex-wrap gap-1.5">
                {milestones.filter(m => m.milestone_status === 'complete').map(m => (
                  <span key={m.id} className="inline-flex items-center gap-1 text-[10px] font-light text-[var(--color-muted)] px-2 py-1 rounded bg-white/40">
                    <Check size={10} className="text-[var(--color-approved)]" />
                    {m.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl animate-pulse space-y-6">
      <div className="h-24 bg-white/40 rounded-xl border border-white/40" />
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="h-28 bg-white/40 rounded-xl border border-white/40" />)}
      </div>
      <div className="h-48 bg-white/40 rounded-xl border border-white/40" />
      <div className="h-40 bg-white/40 rounded-xl border border-white/40" />
    </div>
  )
}
