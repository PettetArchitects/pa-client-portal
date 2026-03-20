import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import {
  Check, ChevronDown, ChevronRight, MessageSquare, ArrowUpRight,
  ThumbsUp, Eye, EyeOff, Package, Palette, Wrench, AlertCircle,
} from 'lucide-react'

const KIND_ICONS = {
  product: Package,
  finish: Palette,
  material: Palette,
  hardware_set: Wrench,
  joinery_item: Package,
  door_type: Package,
  facade_system: Palette,
  window_type: Package,
  other: Package,
}

const STATUS_STYLES = {
  pending: { bg: 'rgba(212,160,23,0.08)', border: 'rgba(212,160,23,0.3)', text: 'var(--color-pending)', label: 'Needs your input' },
  approved: { bg: 'rgba(61,139,64,0.06)', border: 'rgba(61,139,64,0.2)', text: 'var(--color-approved)', label: 'Approved' },
  change_requested: { bg: 'rgba(191,54,12,0.06)', border: 'rgba(191,54,12,0.25)', text: 'var(--color-change)', label: 'Change requested' },
  not_applicable: { bg: 'rgba(255,255,255,0.3)', border: 'rgba(232,232,229,0.6)', text: 'var(--color-muted)', label: 'Confirmed' },
}

export default function Decisions({ projectId }) {
  const { isArchitect } = useProject()
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [viewMode, setViewMode] = useState('review') // 'review' or 'schedule'
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'approved', 'confirmed'

  useEffect(() => {
    if (!projectId) return
    loadData()
  }, [projectId])

  async function loadData() {
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

    // Auto-expand groups with pending items
    const pendingGroups = new Set()
    ;(selRes.data || []).forEach(i => {
      if (i.approval_status === 'pending' || i.approval_status === 'change_requested') {
        pendingGroups.add(i.schedule_group)
      }
    })
    if (pendingGroups.size > 0) setExpandedGroups(pendingGroups)
  }

  async function handleApproveItem(itemId) {
    await supabase.from('homeowner_selections_portal')
      .update({ approval_status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, approval_status: 'approved' } : i))
  }

  async function handleApproveGroup(groupKey) {
    const groupPending = items.filter(i => i.schedule_group === groupKey && i.approval_status === 'pending')
    const ids = groupPending.map(i => i.id)
    if (ids.length === 0) return
    await supabase.from('homeowner_selections_portal')
      .update({ approval_status: 'approved', approved_at: new Date().toISOString() })
      .in('id', ids)
    setItems(prev => prev.map(i =>
      ids.includes(i.id) ? { ...i, approval_status: 'approved' } : i
    ))
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

  function toggleGroup(key) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Filter items
  const filteredItems = items.filter(i => {
    if (filter === 'all') return true
    if (filter === 'pending') return i.approval_status === 'pending' || i.approval_status === 'change_requested'
    if (filter === 'approved') return i.approval_status === 'approved'
    if (filter === 'confirmed') return i.approval_status === 'not_applicable'
    return true
  })

  // Build grouped data
  const groupedData = groups.map(g => {
    const gItems = filteredItems.filter(i => i.schedule_group === g.group_key)
    const allItems = items.filter(i => i.schedule_group === g.group_key)
    const pending = allItems.filter(i => i.approval_status === 'pending').length
    const approved = allItems.filter(i => i.approval_status === 'approved').length
    const confirmed = allItems.filter(i => i.approval_status === 'not_applicable').length
    const changeReq = allItems.filter(i => i.approval_status === 'change_requested').length
    return { ...g, items: gItems, pending, approved, confirmed, changeReq, total: allItems.length }
  }).filter(g => g.items.length > 0)

  // Summary stats
  const totalItems = items.length
  const totalPending = items.filter(i => i.approval_status === 'pending').length
  const totalApproved = items.filter(i => i.approval_status === 'approved').length
  const totalConfirmed = items.filter(i => i.approval_status === 'not_applicable').length
  const totalChangeReq = items.filter(i => i.approval_status === 'change_requested').length
  const progressPct = totalItems > 0 ? Math.round(((totalApproved + totalConfirmed) / totalItems) * 100) : 0

  if (loading) {
    return (
      <div className="max-w-4xl animate-pulse">
        <div className="h-8 w-64 bg-white/40 rounded mb-4" />
        <div className="h-3 w-48 bg-white/30 rounded mb-8" />
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/30 rounded-xl mb-3" />)}
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-light tracking-tight mb-1">
          {viewMode === 'review' ? 'Decisions' : 'Finishes Schedule'}
        </h1>
        <p className="text-sm text-[var(--color-muted)] font-light">
          {totalPending > 0
            ? `${totalPending} item${totalPending !== 1 ? 's' : ''} need your review`
            : totalApproved > 0
            ? 'All looking good — thank you'
            : `${totalConfirmed} selections confirmed`}
        </p>
      </div>

      {/* Progress bar */}
      <div className="backdrop-blur-xl bg-white/40 rounded-xl border border-white/40 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] font-medium">
            Selection progress
          </span>
          <span className="text-sm font-medium">{progressPct}%</span>
        </div>
        <div className="h-2 bg-white/50 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
            width: `${progressPct}%`,
            background: progressPct === 100
              ? 'var(--color-approved)'
              : 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-muted) 100%)',
          }} />
        </div>
        <div className="flex gap-4 mt-3">
          <Stat label="Confirmed" value={totalConfirmed} color="var(--color-muted)" />
          <Stat label="Approved" value={totalApproved} color="var(--color-approved)" />
          <Stat label="To review" value={totalPending} color="var(--color-pending)" />
          {totalChangeReq > 0 && <Stat label="Changes" value={totalChangeReq} color="var(--color-change)" />}
        </div>
      </div>

      {/* View mode + filter controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 backdrop-blur-xl bg-white/30 rounded-lg p-0.5 border border-white/40">
          {[
            { key: 'review', label: 'Review' },
            { key: 'schedule', label: 'Full schedule' },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => { setViewMode(m.key); setFilter(m.key === 'review' ? 'all' : 'all') }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                viewMode === m.key
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: `To review (${totalPending})` },
            { key: 'approved', label: 'Approved' },
            { key: 'confirmed', label: 'Confirmed' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                filter === f.key
                  ? 'bg-white/60 text-[var(--color-text)] border border-white/60'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {groupedData.map(group => {
          const isExpanded = expandedGroups.has(group.group_key)
          const hasPending = group.pending > 0 || group.changeReq > 0

          return (
            <div key={group.group_key} className={`backdrop-blur-xl bg-white/40 rounded-xl border overflow-hidden transition-all ${
              hasPending ? 'border-[var(--color-pending)]/30' : 'border-white/40'
            }`}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.group_key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium">{group.group_name}</h2>
                    <span className="text-[10px] text-[var(--color-muted)] bg-white/50 px-1.5 py-0.5 rounded">
                      {group.items.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)] font-light mt-0.5">{group.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {group.pending > 0 && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{
                      background: 'rgba(212,160,23,0.1)', color: 'var(--color-pending)'
                    }}>
                      {group.pending} to review
                    </span>
                  )}
                  {group.changeReq > 0 && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{
                      background: 'rgba(191,54,12,0.1)', color: 'var(--color-change)'
                    }}>
                      {group.changeReq} change{group.changeReq !== 1 ? 's' : ''}
                    </span>
                  )}
                  {group.pending === 0 && group.changeReq === 0 && (
                    <Check size={14} className="text-[var(--color-approved)]" />
                  )}
                  {/* Mini progress */}
                  <div className="w-12 h-1 bg-white/40 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--color-approved)]/60" style={{
                      width: `${((group.approved + group.confirmed) / group.total) * 100}%`
                    }} />
                  </div>
                  {isExpanded
                    ? <ChevronDown size={14} className="text-[var(--color-muted)]" />
                    : <ChevronRight size={14} className="text-[var(--color-muted)]" />}
                </div>
              </button>

              {/* Expanded items */}
              {isExpanded && (
                <div className="border-t border-white/30">
                  {viewMode === 'review' ? (
                    <ReviewView
                      items={group.items}
                      groupKey={group.group_key}
                      hasPending={hasPending}
                      pendingCount={group.pending}
                      onApproveItem={handleApproveItem}
                      onApproveGroup={handleApproveGroup}
                      onRequestChange={handleRequestChange}
                    />
                  ) : (
                    <ScheduleView items={group.items} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {groupedData.length === 0 && (
        <div className="text-center py-20 backdrop-blur-xl bg-white/30 rounded-xl border border-white/40">
          <Package size={24} className="mx-auto text-[var(--color-border)] mb-3" />
          <p className="text-sm text-[var(--color-muted)] font-light">
            {filter !== 'all' ? 'No items match this filter.' : 'No selections yet.'}
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Review view: card-based with approve/change actions ── */
function ReviewView({ items, groupKey, hasPending, pendingCount, onApproveItem, onApproveGroup, onRequestChange }) {
  return (
    <div>
      <div className="p-4 space-y-2">
        {items.map(item => (
          <SelectionCard
            key={item.id}
            item={item}
            onApprove={() => onApproveItem(item.id)}
            onRequestChange={() => onRequestChange(item.id)}
          />
        ))}
      </div>
      {hasPending && pendingCount > 0 && (
        <div className="px-5 py-3 border-t border-white/30 bg-white/20">
          <button
            onClick={() => onApproveGroup(groupKey)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white text-xs rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            <ThumbsUp size={13} /> Approve all {pendingCount} items
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Schedule view: clean tabular list ── */
function ScheduleView({ items }) {
  return (
    <div className="divide-y divide-white/20">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] tracking-[1px] uppercase text-[var(--color-muted)] font-medium">
        <div className="col-span-4">Item</div>
        <div className="col-span-3">Product / Finish</div>
        <div className="col-span-2">Colour</div>
        <div className="col-span-1">Kind</div>
        <div className="col-span-2 text-right">Status</div>
      </div>
      {items.map(item => {
        const sel = item.project_selections || {}
        const attrs = sel.attributes || {}
        const st = STATUS_STYLES[item.approval_status] || STATUS_STYLES.not_applicable
        return (
          <div key={item.id} className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[11px] hover:bg-white/20 transition-colors items-center">
            <div className="col-span-4 font-medium truncate">{sel.title || item.selection_title}</div>
            <div className="col-span-3 text-[var(--color-muted)] truncate">
              {[sel.manufacturer_name, sel.model].filter(Boolean).join(' — ') || '—'}
            </div>
            <div className="col-span-2 text-[var(--color-muted)] truncate flex items-center gap-1.5">
              {attrs.colour && (
                <>
                  <ColourDot colour={attrs.colour} />
                  {attrs.colour}
                </>
              )}
              {!attrs.colour && '—'}
            </div>
            <div className="col-span-1">
              <span className="text-[9px] text-[var(--color-muted)] bg-white/40 px-1.5 py-0.5 rounded">
                {sel.selection_kind || '—'}
              </span>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{
                background: st.bg, color: st.text, border: `1px solid ${st.border}`
              }}>
                {st.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Selection card: visual item with actions ── */
function SelectionCard({ item, onApprove, onRequestChange }) {
  const sel = item.project_selections || {}
  const attrs = sel.attributes || {}
  const isPending = item.approval_status === 'pending'
  const isApproved = item.approval_status === 'approved'
  const isChangeReq = item.approval_status === 'change_requested'
  const isConfirmed = item.approval_status === 'not_applicable'
  const st = STATUS_STYLES[item.approval_status] || STATUS_STYLES.not_applicable
  const productUrl = attrs.product_url || attrs.image_url
  const Icon = KIND_ICONS[sel.selection_kind] || Package

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl transition-all" style={{
      background: st.bg, border: `1px solid ${st.border}`,
    }}>
      {/* Kind icon */}
      <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-[var(--color-muted)]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium truncate">{sel.title || item.selection_title}</h3>
          {isApproved && <Check size={12} className="text-[var(--color-approved)] shrink-0" />}
        </div>

        {/* Product details */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {sel.manufacturer_name && (
            <span className="text-[11px] text-[var(--color-muted)]">{sel.manufacturer_name}</span>
          )}
          {sel.model && (
            <span className="text-[11px] text-[var(--color-text)]">{sel.model}</span>
          )}
        </div>

        {/* Colour chip */}
        {attrs.colour && (
          <div className="flex items-center gap-1.5 mt-1">
            <ColourDot colour={attrs.colour} />
            <span className="text-[10px] text-[var(--color-muted)]">{attrs.colour}</span>
          </div>
        )}

        {/* Notes */}
        {sel.notes && (
          <p className="text-[10px] text-[var(--color-muted)] font-light mt-1.5 italic leading-relaxed">{sel.notes}</p>
        )}

        {/* Change request note */}
        {isChangeReq && item.approval_note && (
          <div className="flex items-start gap-1.5 mt-2 text-[11px]" style={{ color: 'var(--color-change)' }}>
            <AlertCircle size={11} className="mt-0.5 shrink-0" />
            <span>{item.approval_note}</span>
          </div>
        )}

        {/* Product link */}
        {productUrl && (
          <a href={productUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-[var(--color-accent)] mt-1.5 hover:underline">
            View product <ArrowUpRight size={9} />
          </a>
        )}

        {/* Confirmed label */}
        {isConfirmed && (
          <span className="text-[10px] text-[var(--color-muted)] mt-1 block">Confirmed by architect</span>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onApprove}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ border: '1px solid rgba(61,139,64,0.3)', color: 'var(--color-approved)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(61,139,64,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Approve"
          >
            <Check size={12} />
          </button>
          <button
            onClick={onRequestChange}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ border: '1px solid rgba(232,232,229,0.8)', color: 'var(--color-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-change)'; e.currentTarget.style.borderColor = 'rgba(191,54,12,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.borderColor = 'rgba(232,232,229,0.8)' }}
            title="Request change"
          >
            <MessageSquare size={11} />
          </button>
        </div>
      )}
      {isChangeReq && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onApprove}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-[var(--color-muted)]"
            style={{ border: '1px solid rgba(232,232,229,0.8)' }}
            title="Approve instead"
          >
            <Check size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Colour dot: tries to guess a CSS colour from the name ── */
function ColourDot({ colour }) {
  const c = colour?.toLowerCase() || ''
  let bg = '#ccc'
  if (c.includes('white') || c.includes('natural white')) bg = '#F5F2EE'
  else if (c.includes('woodland grey')) bg = '#4A4B45'
  else if (c.includes('southerly')) bg = '#8B9181'
  else if (c.includes('satin chrome') || c.includes('brushed nickel')) bg = '#C0C0C0'
  else if (c.includes('aged brass')) bg = '#B08D57'
  else if (c.includes('warm grey') || c.includes('concrete')) bg = '#A09E98'
  else if (c.includes('grey') || c.includes('gray')) bg = '#8A8A86'
  else if (c.includes('black')) bg = '#1A1A1A'
  else if (c.includes('clear') || c.includes('anodised')) bg = '#D4D4D0'
  else if (c.includes('neutral')) bg = '#E8E4DE'

  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: bg, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0,
    }} />
  )
}

/* ── Stat pill ── */
function Stat({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span className="text-[10px] text-[var(--color-muted)]">{value} {label}</span>
    </div>
  )
}
