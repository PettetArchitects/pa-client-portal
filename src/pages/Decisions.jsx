import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Check, ChevronDown, ChevronRight, MessageSquare, ArrowUpRight, ThumbsUp, Filter, Eye, EyeOff } from 'lucide-react'

export default function Decisions({ projectId }) {
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [showConfirmed, setShowConfirmed] = useState(false)

  useEffect(() => {
    if (!projectId) return
    seedAndLoad()
  }, [projectId])

  async function seedAndLoad() {
    // Auto-seed portal entries from project_selections (idempotent — skips existing)
    await supabase.rpc('sync_portal_selections', { p_project_id: projectId })

    // Load groups and portal items with correct FK join
    const [grpRes, selRes] = await Promise.all([
      supabase.from('schedule_groups').select('*').eq('project_id', projectId).eq('visible_to_homeowner', true).order('display_order'),
      supabase.from('homeowner_selections_portal').select(`
        *,
        project_selections:project_selection_id (
          title, selection_kind, manufacturer_name, supplier_name, model, spec_reference, notes, attributes
        )
      `).eq('project_id', projectId).eq('active', true),
    ])
    setGroups(grpRes.data || [])
    setItems(selRes.data || [])
    setLoading(false)

    // Auto-expand first group with pending items
    const pending = (selRes.data || []).filter(i => i.approval_status === 'pending')
    if (pending.length > 0 && grpRes.data) {
      const firstPendingGroup = grpRes.data.find(g =>
        pending.some(p => p.schedule_group === g.group_key)
      )
      if (firstPendingGroup) setExpandedGroup(firstPendingGroup.group_key)
    }
  }

  async function handleApproveGroup(groupKey) {
    const groupPending = items.filter(i => i.schedule_group === groupKey && i.approval_status === 'pending')
    for (const item of groupPending) {
      await supabase.from('homeowner_selections_portal')
        .update({ approval_status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', item.id)
    }
    setItems(prev => prev.map(i =>
      i.schedule_group === groupKey && i.approval_status === 'pending'
        ? { ...i, approval_status: 'approved' }
        : i
    ))
  }

  async function handleApproveItem(itemId) {
    await supabase.from('homeowner_selections_portal')
      .update({ approval_status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, approval_status: 'approved' } : i))
  }

  async function handleRequestChange(itemId) {
    const note = prompt('What would you like changed? Your note will be sent to Sean.')
    if (!note) return
    await supabase.from('homeowner_selections_portal')
      .update({ approval_status: 'change_requested', approval_note: note })
      .eq('id', itemId)
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, approval_status: 'change_requested', approval_note: note } : i
    ))
  }

  // Split items into decisions (pending/change_requested) and confirmed
  const pendingItems = items.filter(i => i.approval_status === 'pending' || i.approval_status === 'change_requested')
  const approvedItems = items.filter(i => i.approval_status === 'approved')
  const confirmedItems = items.filter(i => i.approval_status === 'not_applicable')

  // Group pending/approved by schedule_group
  const activeGroups = groups.map(g => {
    const gPending = pendingItems.filter(i => i.schedule_group === g.group_key)
    const gApproved = approvedItems.filter(i => i.schedule_group === g.group_key)
    return { ...g, pending: gPending, approved: gApproved, total: gPending.length + gApproved.length }
  }).filter(g => g.total > 0)

  const confirmedGroups = groups.map(g => {
    const gItems = confirmedItems.filter(i => i.schedule_group === g.group_key)
    return { ...g, items: gItems }
  }).filter(g => g.items.length > 0)

  const totalPending = pendingItems.length
  const totalApproved = approvedItems.length

  if (loading) return <div className="animate-pulse"><div className="h-8 w-48 bg-[var(--color-border)] rounded mb-8" /></div>

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-tight mb-1">Decisions</h1>
        <p className="text-sm text-[var(--color-muted)] font-light">
          {totalPending > 0
            ? `${totalPending} item${totalPending !== 1 ? 's' : ''} for your review — grouped by area`
            : totalApproved > 0
            ? `${totalApproved} approved — all looking good`
            : 'All selections confirmed'}
        </p>
      </div>

      {/* Active decision groups */}
      <div className="space-y-3 mb-10">
        {activeGroups.map(group => {
          const isExpanded = expandedGroup === group.group_key
          const hasPending = group.pending.length > 0
          const allApproved = group.pending.length === 0 && group.approved.length > 0

          return (
            <div key={group.group_key} className={`backdrop-blur-xl bg-white/40 rounded-xl border overflow-hidden transition-all ${
              hasPending ? 'border-[var(--color-pending)]/40' : 'border-white/40'
            }`}>
              {/* Group header — clickable */}
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.group_key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-sm font-medium">{group.group_name}</h2>
                    <p className="text-xs text-[var(--color-muted)] font-light mt-0.5">
                      {group.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {hasPending && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--color-pending)]/10 text-[var(--color-pending)]">
                      {group.pending.length} to review
                    </span>
                  )}
                  {allApproved && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--color-approved)]/10 text-[var(--color-approved)] flex items-center gap-1">
                      <Check size={10} /> Approved
                    </span>
                  )}
                  {isExpanded ? <ChevronDown size={14} className="text-[var(--color-muted)]" /> : <ChevronRight size={14} className="text-[var(--color-muted)]" />}
                </div>
              </button>

              {/* Expanded: show items + group approve */}
              {isExpanded && (
                <div className="border-t border-[var(--color-border)]">
                  {/* Summary of what Sean has selected for this group */}
                  <div className="px-5 py-3 bg-[#FAFAF8]">
                    <p className="text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] font-medium mb-2">
                      Sean's recommendations
                    </p>
                    <div className="space-y-2">
                      {[...group.pending, ...group.approved].map(item => {
                        const sel = item.project_selections || {}
                        const attrs = sel.attributes || {}
                        const isPending = item.approval_status === 'pending'
                        const isApproved = item.approval_status === 'approved'
                        const isChangeReq = item.approval_status === 'change_requested'
                        const productUrl = attrs.product_url || attrs.image_url

                        return (
                          <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg bg-white border ${
                            isChangeReq ? 'border-[var(--color-change)]/30' :
                            isPending ? 'border-[var(--color-border)]' :
                            'border-[var(--color-approved)]/20'
                          }`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-xs font-medium truncate">{sel.title || item.selection_title}</h3>
                                {isApproved && <Check size={12} className="text-[var(--color-approved)] shrink-0" />}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                                {sel.manufacturer_name && (
                                  <span className="text-[11px] text-[var(--color-muted)]">{sel.manufacturer_name}</span>
                                )}
                                {sel.model && (
                                  <span className="text-[11px] text-[var(--color-text)]">{sel.model}</span>
                                )}
                                {attrs.colour && !sel.model?.includes(attrs.colour) && (
                                  <span className="text-[11px] text-[var(--color-muted)]">{attrs.colour}</span>
                                )}
                              </div>
                              {sel.notes && (
                                <p className="text-[11px] text-[var(--color-muted)] font-light mt-1 italic">{sel.notes}</p>
                              )}
                              {isChangeReq && item.approval_note && (
                                <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-[var(--color-change)]">
                                  <MessageSquare size={10} className="mt-0.5 shrink-0" />
                                  {item.approval_note}
                                </div>
                              )}
                              {productUrl && (
                                <a href={productUrl} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-[var(--color-accent)] mt-1 hover:underline">
                                  View product <ArrowUpRight size={10} />
                                </a>
                              )}
                            </div>

                            {/* Per-item actions */}
                            {isPending && (
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => handleApproveItem(item.id)}
                                  className="w-7 h-7 rounded-lg border border-[var(--color-approved)]/30 flex items-center justify-center text-[var(--color-approved)] hover:bg-[var(--color-approved)]/10 transition-colors"
                                  title="Approve"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => handleRequestChange(item.id)}
                                  className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-change)] hover:border-[var(--color-change)]/30 transition-colors"
                                  title="Request change"
                                >
                                  <MessageSquare size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Approve all in group */}
                  {hasPending && (
                    <div className="px-5 py-3 border-t border-[var(--color-border)] bg-white">
                      <button
                        onClick={() => handleApproveGroup(group.group_key)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white text-xs rounded-lg hover:opacity-90 transition-opacity font-medium"
                      >
                        <ThumbsUp size={13} /> Approve all {group.pending.length} items
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Confirmed items — collapsed by default */}
      {confirmedItems.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowConfirmed(!showConfirmed)}
            className="flex items-center gap-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors mb-4"
          >
            {showConfirmed ? <EyeOff size={13} /> : <Eye size={13} />}
            {showConfirmed ? 'Hide' : 'Show'} {confirmedItems.length} confirmed selections
          </button>

          {showConfirmed && (
            <div className="space-y-3">
              {confirmedGroups.map(group => (
                <div key={group.group_key} className="backdrop-blur-xl bg-white/50 rounded-xl border border-white/40 px-5 py-4">
                  <h3 className="text-xs font-medium tracking-wide mb-2 text-[var(--color-muted)]">{group.group_name}</h3>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const sel = item.project_selections || {}
                      return (
                        <div key={item.id} className="flex justify-between text-[11px] py-1">
                          <span className="text-[var(--color-muted)] font-light">{sel.title || item.selection_title}</span>
                          <span className="text-[var(--color-text)]">{sel.model || sel.manufacturer_name || '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeGroups.length === 0 && confirmedItems.length === 0 && (
        <div className="text-center py-20">
          <Filter size={24} className="mx-auto text-[var(--color-border)] mb-3" />
          <p className="text-sm text-[var(--color-muted)] font-light">No decisions yet.</p>
        </div>
      )}
    </div>
  )
}
