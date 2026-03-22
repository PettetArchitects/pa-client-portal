import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Check, ArrowUpRight, MessageSquare, Filter } from 'lucide-react'

const FILTERS = ['all', 'pending', 'approved', 'confirmed']

const ROLE_ORDER = ['finish', 'colour', 'hardware', 'accessory', 'product']

const ROLE_LABELS = {
  assembly:  'Assembly',
  finish:    'Finish',
  colour:    'Colour',
  hardware:  'Hardware',
  accessory: 'Accessory',
  product:   'Product',
}

export default function Selections({ projectId }) {
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [codeTitleMap, setCodeTitleMap] = useState({})
  const [codeHierarchyMap, setCodeHierarchyMap] = useState({})
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('group') // 'group' | 'code'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    loadSelections()
  }, [projectId])

  async function loadSelections() {
    const [grpRes, selRes, codeRes] = await Promise.all([
      supabase.from('schedule_groups').select('*').eq('project_id', projectId).order('display_order'),
      supabase.from('v_client_selection_schedule').select('*').eq('project_id', projectId),
      supabase.from('master_code_entries')
        .select('id, canonical_code, title, component_role, parent_code_id')
        .eq('status', 'active'),
    ])
    setGroups(grpRes.data || [])
    setItems(selRes.data || [])

    const codes = codeRes.data || []

    // canonical_code → title (backward-compat flat map — unchanged)
    const ctMap = {}
    codes.forEach(c => { ctMap[c.canonical_code] = c.title })
    setCodeTitleMap(ctMap)

    // id → canonical_code lookup
    const codeIdToCode = {}
    codes.forEach(c => { codeIdToCode[c.id] = c.canonical_code })

    // canonical_code → { role, parent_canonical_code, title }
    const hierarchyMap = {}
    codes.forEach(c => {
      hierarchyMap[c.canonical_code] = {
        role: c.component_role || 'product',
        parent_canonical_code: c.parent_code_id ? codeIdToCode[c.parent_code_id] : null,
        title: c.title,
      }
    })
    setCodeHierarchyMap(hierarchyMap)

    setLoading(false)
  }

  async function handleApprove(portalEntryId) {
    await supabase.from('homeowner_selections_portal')
      .update({ approval_status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', portalEntryId)
    setItems(prev => prev.map(i =>
      i.portal_entry_id === portalEntryId ? { ...i, approval_status: 'approved' } : i
    ))
  }

  async function handleRequestChange(portalEntryId) {
    const note = prompt('What change would you like? Your note will be sent to Sean.')
    if (!note) return
    await supabase.from('homeowner_selections_portal')
      .update({ approval_status: 'change_requested', approval_note: note })
      .eq('id', portalEntryId)
    setItems(prev => prev.map(i =>
      i.portal_entry_id === portalEntryId ? { ...i, approval_status: 'change_requested', approval_note: note } : i
    ))
  }

  const filtered = items.filter(item => {
    if (filter === 'all') return true
    if (filter === 'pending') return item.approval_status === 'pending'
    if (filter === 'approved') return item.approval_status === 'approved'
    if (filter === 'confirmed') return item.approval_status === 'not_applicable'
    return true
  })

  const groupedItems = groups.map(g => ({
    ...g,
    items: filtered.filter(i => i.schedule_group === g.group_key),
  })).filter(g => g.items.length > 0)

  const counts = {
    all: items.length,
    pending: items.filter(i => i.approval_status === 'pending').length,
    approved: items.filter(i => i.approval_status === 'approved').length,
    confirmed: items.filter(i => i.approval_status === 'not_applicable').length,
  }

  if (loading) return <div className="animate-pulse"><div className="h-8 w-48 bg-[var(--color-border)] rounded mb-8" /></div>

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[18px] font-light tracking-tight mb-1">Selections</h1>
          <p className="text-[13px] text-[var(--color-muted)] font-light">
            {counts.pending > 0
              ? `${counts.pending} item${counts.pending > 1 ? 's' : ''} awaiting your approval`
              : 'All selections confirmed'}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-0.5 self-start mt-1">
          <button
            onClick={() => setViewMode('group')}
            className={`px-3 py-1 rounded-md text-[11px] tracking-wide transition-all ${
              viewMode === 'group'
                ? 'bg-white text-[var(--color-text)] shadow-sm font-medium'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            By Group
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`px-3 py-1 rounded-md text-[11px] tracking-wide transition-all ${
              viewMode === 'code'
                ? 'bg-white text-[var(--color-text)] shadow-sm font-medium'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            By Code
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-[12px] tracking-wide transition-all ${
              filter === f
                ? 'bg-[var(--color-accent)] text-white font-medium'
                : 'bg-white border border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]'
            }`}
          >
            {f === 'all' ? 'All' : f === 'confirmed' ? 'Confirmed' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 opacity-60">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Views */}
      {viewMode === 'group' ? (
        <>
          <div className="space-y-10">
            {groupedItems.map(group => (
              <section key={group.id}>
                <div className="flex items-baseline justify-between pb-3 border-b border-[var(--color-accent)] mb-5">
                  <h2 className="text-[15px] font-normal tracking-wide">{group.group_name}</h2>
                  <span className="text-[12px] text-[var(--color-muted)]">{group.items.length} items</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map(item => (
                    <SelectionCard
                      key={item.portal_entry_id}
                      item={item}
                      codeTitleMap={codeTitleMap}
                      onApprove={() => handleApprove(item.portal_entry_id)}
                      onRequestChange={() => handleRequestChange(item.portal_entry_id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {groupedItems.length === 0 && (
            <div className="text-center py-20">
              <Filter size={24} className="mx-auto text-[var(--color-border)] mb-3" />
              <p className="text-[13px] text-[var(--color-muted)] font-light">No items match this filter.</p>
            </div>
          )}
        </>
      ) : (
        <CodeHierarchyView
          items={filtered}
          codeHierarchyMap={codeHierarchyMap}
          codeTitleMap={codeTitleMap}
          onApprove={handleApprove}
          onRequestChange={handleRequestChange}
        />
      )}
    </div>
  )
}

/* ── Code Hierarchy View ──────────────────────────────────────────────────── */

function CodeHierarchyView({ items, codeHierarchyMap, codeTitleMap, onApprove, onRequestChange }) {
  // Sort items within a group by role order (finish → colour → hardware → accessory → product)
  const sortByRole = (a, b) => {
    const aRole = codeHierarchyMap[a.attributes?.code]?.role || 'product'
    const bRole = codeHierarchyMap[b.attributes?.code]?.role || 'product'
    const ai = ROLE_ORDER.indexOf(aRole)
    const bi = ROLE_ORDER.indexOf(bRole)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  }

  // Build assembly groups keyed by assembly canonical_code
  const assemblyMap = {}
  const generalItems = []

  items.forEach(item => {
    const code = item.attributes?.code || null
    if (!code) {
      generalItems.push(item)
      return
    }
    const codeInfo = codeHierarchyMap[code]
    if (!codeInfo) {
      generalItems.push(item)
      return
    }

    if (codeInfo.role === 'assembly' && !codeInfo.parent_canonical_code) {
      // Item is directly coded as an assembly
      if (!assemblyMap[code]) {
        assemblyMap[code] = { code, title: codeInfo.title || code, items: [] }
      }
      assemblyMap[code].items.push(item)
    } else if (codeInfo.parent_canonical_code) {
      const parentCode = codeInfo.parent_canonical_code
      if (!assemblyMap[parentCode]) {
        const parentInfo = codeHierarchyMap[parentCode]
        assemblyMap[parentCode] = { code: parentCode, title: parentInfo?.title || parentCode, items: [] }
      }
      assemblyMap[parentCode].items.push(item)
    } else {
      // Non-assembly, no parent → General
      generalItems.push(item)
    }
  })

  const assemblyGroups = Object.values(assemblyMap)
  assemblyGroups.forEach(g => g.items.sort(sortByRole))

  const hasContent = assemblyGroups.length > 0 || generalItems.length > 0

  return (
    <div className="space-y-10">
      {assemblyGroups.map(group => (
        <section key={group.code}>
          {/* Assembly header — hairline separator above, bolder title */}
          <div className="pt-2 border-t border-[var(--color-border)] mb-5">
            <div className="flex items-baseline justify-between pb-3">
              <div>
                <span className="text-[9px] font-mono tracking-[1.5px] text-[var(--color-muted)] uppercase block mb-0.5">
                  {group.code}
                  <span className="ml-2 text-[8px] tracking-wide opacity-50 normal-case font-sans">Assembly</span>
                </span>
                <h2 className="text-[14px] font-medium tracking-wide">{group.title}</h2>
              </div>
              <span className="text-[12px] text-[var(--color-muted)]">{group.items.length} items</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.items.map(item => (
              <SelectionCard
                key={item.portal_entry_id}
                item={item}
                codeTitleMap={codeTitleMap}
                codeHierarchyMap={codeHierarchyMap}
                onApprove={() => onApprove(item.portal_entry_id)}
                onRequestChange={() => onRequestChange(item.portal_entry_id)}
              />
            ))}
          </div>
        </section>
      ))}

      {generalItems.length > 0 && (
        <section>
          <div className="pt-2 border-t border-[var(--color-border)] mb-5">
            <div className="flex items-baseline justify-between pb-3">
              <h2 className="text-[14px] font-normal tracking-wide text-[var(--color-muted)]">General</h2>
              <span className="text-[12px] text-[var(--color-muted)]">{generalItems.length} items</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {generalItems.map(item => (
              <SelectionCard
                key={item.portal_entry_id}
                item={item}
                codeTitleMap={codeTitleMap}
                codeHierarchyMap={codeHierarchyMap}
                onApprove={() => onApprove(item.portal_entry_id)}
                onRequestChange={() => onRequestChange(item.portal_entry_id)}
              />
            ))}
          </div>
        </section>
      )}

      {!hasContent && (
        <div className="text-center py-20">
          <Filter size={24} className="mx-auto text-[var(--color-border)] mb-3" />
          <p className="text-[13px] text-[var(--color-muted)] font-light">No items match this filter.</p>
        </div>
      )}
    </div>
  )
}

/* ── Selection Card ───────────────────────────────────────────────────────── */

function SelectionCard({ item, codeTitleMap, codeHierarchyMap, onApprove, onRequestChange }) {
  const isPending = item.approval_status === 'pending'
  const isApproved = item.approval_status === 'approved'
  const isChangeReq = item.approval_status === 'change_requested'
  const isUrgent = item.priority === 'urgent'

  const attrs = item.attributes || {}
  const productUrl = attrs.product_url || attrs.image_url
  const code = attrs.code || null
  const codeTitle = code && codeTitleMap ? codeTitleMap[code] : null

  // Role label — only present when codeHierarchyMap is provided (code view); null in flat group view
  const codeInfo = code && codeHierarchyMap ? codeHierarchyMap[code] : null
  const roleLabel = codeInfo?.role ? (ROLE_LABELS[codeInfo.role] || codeInfo.role) : null

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all hover:shadow-sm ${
      isUrgent ? 'border-[var(--color-urgent)]/40 border-l-[3px]' :
      isPending ? 'border-[var(--color-pending)]/40 border-l-[3px]' :
      isApproved ? 'border-[var(--color-approved)]/30' :
      isChangeReq ? 'border-[var(--color-change)]/30' :
      'border-[var(--color-border)]'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {code && (
              <span className="text-[9px] font-mono tracking-wider text-[var(--color-muted)] uppercase block mb-0.5">
                {code}
                {codeTitle && <span className="text-[8px] font-normal tracking-wider ml-1.5 opacity-70">{codeTitle}</span>}
                {roleLabel && (
                  <span className="text-[8px] font-sans normal-case tracking-wide ml-2 opacity-50 text-[var(--color-muted)]">
                    · {roleLabel}
                  </span>
                )}
              </span>
            )}
            <h3 className="text-[13px] font-medium leading-snug truncate">{item.selection_title}</h3>
            <span className="text-[10px] tracking-[1px] uppercase text-[var(--color-muted)] font-light">
              {item.selection_kind?.replace('_', ' ')}
            </span>
          </div>
          <StatusBadge status={item.approval_status} priority={item.priority} />
        </div>

        {/* Details */}
        <div className="space-y-1.5">
          {item.manufacturer_name && <Detail label="Manufacturer" value={item.manufacturer_name} />}
          {item.supplier_name && <Detail label="Supplier" value={item.supplier_name} />}
          {item.model && <Detail label="Model" value={item.model} />}
          {attrs.colour && <Detail label="Colour" value={attrs.colour} />}
          {attrs.finish && <Detail label="Finish" value={attrs.finish} />}
          {item.spec_reference && <Detail label="Spec" value={item.spec_reference} />}
        </div>

        {/* Notes */}
        {item.selection_notes && (
          <p className="text-[12px] text-[var(--color-muted)] font-light mt-3 px-3 py-2 bg-[var(--color-bg)] rounded-lg italic">
            {item.selection_notes}
          </p>
        )}

        {/* Product link */}
        {productUrl && (
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text)] mt-3 hover:underline"
          >
            View product <ArrowUpRight size={12} />
          </a>
        )}

        {/* Change request note */}
        {isChangeReq && item.approval_note && (
          <div className="flex items-start gap-2 mt-3 p-3 bg-[var(--color-change)]/5 rounded-lg">
            <MessageSquare size={12} className="text-[var(--color-change)] mt-0.5 shrink-0" />
            <p className="text-[12px] text-[var(--color-change)] font-light">{item.approval_note}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex border-t border-[var(--color-border)]">
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-medium text-[var(--color-approved)] hover:bg-[var(--color-approved)]/5 transition-colors"
          >
            <Check size={14} /> Approve
          </button>
          <div className="w-px bg-[var(--color-border)]" />
          <button
            onClick={onRequestChange}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-light text-[var(--color-muted)] hover:text-[var(--color-change)] hover:bg-[var(--color-change)]/5 transition-colors"
          >
            Request change
          </button>
        </div>
      )}

      {isApproved && (
        <div className="flex items-center justify-center gap-2 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-approved)]/5">
          <Check size={12} className="text-[var(--color-approved)]" />
          <span className="text-[12px] text-[var(--color-approved)] font-medium">Approved</span>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-[var(--color-muted)] font-light">{label}</span>
      <span className="font-normal text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}

function StatusBadge({ status, priority }) {
  if (priority === 'urgent') return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--color-urgent)]/10 text-[var(--color-urgent)]">
      Action Required
    </span>
  )
  const styles = {
    pending: 'bg-[var(--color-pending)]/10 text-[var(--color-pending)]',
    approved: 'bg-[var(--color-approved)]/10 text-[var(--color-approved)]',
    change_requested: 'bg-[var(--color-change)]/10 text-[var(--color-change)]',
    not_applicable: 'bg-[var(--color-border)] text-[var(--color-muted)]',
    deferred: 'bg-purple-50 text-purple-700',
  }
  const labels = {
    pending: 'Awaiting Approval',
    approved: 'Approved',
    change_requested: 'Change Requested',
    not_applicable: 'Confirmed',
    deferred: 'Deferred',
  }
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${styles[status] || ''}`}>
      {labels[status] || status}
    </span>
  )
}
