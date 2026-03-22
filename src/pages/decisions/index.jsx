/* ── Decisions page: main orchestrator ── */
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useProject } from '../../hooks/useProject'
import { useToast } from '../../components/Toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
  Check, ChevronDown, ChevronRight, ThumbsUp,
  Package, FileDown, SlidersHorizontal, Search, Hash,
  List, Map, BarChart3, Layers, Grid3X3, Home,
} from 'lucide-react'
import { GROUP_ICONS } from '../../components/SketchIcons'
import { buildRoomGroups, buildComponentGroups } from './constants'
import { Stat } from './components'
import {
  ScheduleView, BoQView, PlanView, RoomGroupedView,
  ComponentGroupedView, CodeHierarchyView,
} from './views'

export default function Decisions({ projectId }) {
  const { isArchitect } = useProject()
  const { addToast } = useToast()
  const [changeModal, setChangeModal] = useState({ open: false, itemId: null })
  const [changeNote, setChangeNote] = useState('')
  const [confirmBulk, setConfirmBulk] = useState({ open: false, type: null, key: null, count: 0 })
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [roomMappings, setRoomMappings] = useState([])
  const [natspecMap, setNatspecMap] = useState({})
  const [subCriteriaMap, setSubCriteriaMap] = useState({})
  const [codeTitleMap, setCodeTitleMap] = useState({})
  const [selectionCodeMap, setSelectionCodeMap] = useState({})
  const [codeHierarchyMap, setCodeHierarchyMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [viewMode, setViewMode] = useState('schedule')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('group')
  const [showFilter, setShowFilter] = useState(false)

  async function loadData() {
    const [grpRes, selRes, roomRes, scRes, codeRes, linkRes] = await Promise.all([
      supabase.from('schedule_groups').select('*').eq('project_id', projectId).eq('visible_to_homeowner', true).order('display_order'),
      supabase.from('homeowner_selections_portal').select(`
        *,
        project_selections:project_selection_id (
          id, title, selection_kind, manufacturer_name, supplier_name, model, spec_reference, notes, attributes,
          is_component, parent_selection_id, component_role, component_order, element_type
        )
      `).eq('project_id', projectId).eq('active', true),
      supabase.from('portal_selection_rooms').select('*').eq('project_id', projectId),
      supabase.from('sub_criteria_definitions').select('*').order('display_order'),
      supabase.from('master_code_entries').select('id, canonical_code, title, component_role, parent_code_id').eq('status', 'active'),
      supabase.from('project_selection_code_links').select('project_selection_id, entry_id, is_primary'),
    ])

    setGroups(grpRes.data || [])
    setItems(selRes.data || [])
    setRoomMappings(roomRes.data || [])

    const codes = codeRes.data || []
    const ctMap = {}
    const codeIdToCode = {}
    codes.forEach(c => {
      ctMap[c.canonical_code] = c.title
      codeIdToCode[c.id] = c.canonical_code
    })
    setCodeTitleMap(ctMap)

    // Build selectionCodeMap preferring is_primary links, then falling back to any link
    const selCodeMap = {}
    const allLinks = linkRes.data || []
    // First pass: primary links only
    allLinks.forEach(link => {
      if (link.is_primary) {
        const canonical = codeIdToCode[link.entry_id]
        if (canonical) selCodeMap[link.project_selection_id] = canonical
      }
    })
    // Second pass: fill gaps for selections with no primary link
    allLinks.forEach(link => {
      if (!selCodeMap[link.project_selection_id]) {
        const canonical = codeIdToCode[link.entry_id]
        if (canonical) selCodeMap[link.project_selection_id] = canonical
      }
    })
    setSelectionCodeMap(selCodeMap)

    const hierarchyMap = {}
    codes.forEach(c => {
      hierarchyMap[c.canonical_code] = {
        role: c.component_role || 'product',
        parent_canonical_code: c.parent_code_id ? (codeIdToCode[c.parent_code_id] || null) : null,
        title: c.title,
      }
    })
    setCodeHierarchyMap(hierarchyMap)

    const scMap = {}
    ;(scRes.data || []).forEach(def => {
      if (!scMap[def.element_type]) scMap[def.element_type] = []
      scMap[def.element_type].push({
        key: def.field_key,
        label: def.field_label,
        type: def.field_type,
        unit: def.field_unit,
        required: def.is_required,
      })
    })
    setSubCriteriaMap(scMap)

    const selIds = (selRes.data || []).map(i => i.project_selection_id).filter(Boolean)
    const natspecRes = selIds.length > 0
      ? await supabase.from('project_selection_natspec_links')
          .select('project_selection_id, natspec_sections:section_id(section_ref, section_title)')
          .in('project_selection_id', selIds)
      : { data: [] }

    const nMap = {}
    ;(natspecRes.data || []).forEach(link => {
      const selId = link.project_selection_id
      const ns = link.natspec_sections
      if (!nMap[selId]) nMap[selId] = []
      if (ns?.section_ref) nMap[selId].push({ ref: ns.section_ref, title: ns.section_title })
    })
    setNatspecMap(nMap)
    setLoading(false)

    const pendingGroups = new Set()
    ;(selRes.data || []).forEach(i => {
      if (i.approval_status === 'pending' || i.approval_status === 'change_requested') {
        pendingGroups.add(i.schedule_group)
      }
    })
    if (pendingGroups.size > 0) setExpandedGroups(pendingGroups)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (projectId) loadData() }, [projectId])

  async function handleApproveItem(itemId) {
    await supabase.from('homeowner_selections_portal')
      .update({ approval_status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, approval_status: 'approved' } : i))
    addToast('Selection approved.', 'success')
  }

  async function handleApproveRoom(roomKey) {
    const roomSelIds = new Set(
      roomMappings.filter(m => m.room_key === roomKey).map(m => m.project_selection_id)
    )
    const pending = items.filter(i =>
      roomSelIds.has(i.project_selection_id) && i.approval_status === 'pending'
    )
    if (pending.length === 0) return
    setConfirmBulk({ open: true, type: 'room', key: roomKey, count: pending.length })
  }

  async function executeBulkApprove() {
    const { type, key } = confirmBulk
    let ids = []
    if (type === 'group') {
      ids = items.filter(i => i.schedule_group === key && i.approval_status === 'pending').map(i => i.id)
    } else if (type === 'room') {
      const roomSelIds = new Set(
        roomMappings.filter(m => m.room_key === key).map(m => m.project_selection_id)
      )
      ids = items.filter(i => roomSelIds.has(i.project_selection_id) && i.approval_status === 'pending').map(i => i.id)
    }
    if (ids.length === 0) return
    await supabase.from('homeowner_selections_portal')
      .update({ approval_status: 'approved', approved_at: new Date().toISOString() })
      .in('id', ids)
    setItems(prev => prev.map(i =>
      ids.includes(i.id) ? { ...i, approval_status: 'approved' } : i
    ))
    setConfirmBulk({ open: false, type: null, key: null, count: 0 })
    addToast(`${ids.length} selection${ids.length !== 1 ? 's' : ''} approved.`, 'success')
  }

  async function handleRequestChange(itemId) {
    setChangeModal({ open: true, itemId })
    setChangeNote('')
  }

  async function submitChangeRequest() {
    if (!changeNote.trim()) return
    const { itemId } = changeModal
    await supabase.from('homeowner_selections_portal')
      .update({ approval_status: 'change_requested', approval_note: changeNote.trim() })
      .eq('id', itemId)
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, approval_status: 'change_requested', approval_note: changeNote.trim() } : i
    ))
    setChangeModal({ open: false, itemId: null })
    setChangeNote('')
    addToast('Change request sent to your architect.', 'success')
  }

  function toggleGroup(key) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const filteredItems = items.filter(i => {
    if (filter === 'pending' && i.approval_status !== 'pending' && i.approval_status !== 'change_requested') return false
    if (filter === 'approved' && i.approval_status !== 'approved') return false
    if (filter === 'confirmed' && i.approval_status !== 'not_applicable') return false
    if (search) {
      const sel = i.project_selections || {}
      const text = [sel.title, sel.manufacturer_name, sel.model, i.schedule_group, sel.attributes?.colour].filter(Boolean).join(' ').toLowerCase()
      if (!text.includes(search.toLowerCase())) return false
    }
    return true
  })

  const groupedData = groups.map(g => {
    const gItems = filteredItems.filter(i => i.schedule_group === g.group_key)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    const allItems = items.filter(i => i.schedule_group === g.group_key)
    const pending = allItems.filter(i => i.approval_status === 'pending').length
    const approved = allItems.filter(i => i.approval_status === 'approved').length
    const confirmed = allItems.filter(i => i.approval_status === 'not_applicable').length
    const changeReq = allItems.filter(i => i.approval_status === 'change_requested').length
    return { ...g, items: gItems, pending, approved, confirmed, changeReq, total: allItems.length }
  }).filter(g => g.items.length > 0)

  const roomGroupedData = buildRoomGroups(filteredItems, items, roomMappings)
  const componentGroupedData = buildComponentGroups(filteredItems, items)

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
        <div className="h-3 w-48 bg-white/40 rounded mb-8" />
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/40 rounded-xl mb-3" />)}
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Progress bar */}
      <div className="glass rounded-xl border border-white/50 p-4 mb-6" role="region" aria-label="Selection progress">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] font-medium">
            Your selections
          </span>
          <span className="text-[13px] font-medium">{progressPct}%</span>
        </div>
        <p className="text-[11px] text-[var(--color-text)] font-light mb-3">
          {totalPending > 0
            ? `${totalPending} material and finish selection${totalPending !== 1 ? 's' : ''} need${totalPending === 1 ? 's' : ''} your review \u2014 approve each item or request a change.`
            : progressPct === 100
              ? 'All selections confirmed. Your project is ready to proceed.'
              : 'Review each material, finish and fitting below. Approve to confirm or request changes.'}
        </p>
        <div className="h-2 bg-white/50 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${progressPct}% of selections completed`}>
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

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 glass-s rounded-xl border border-white/40 px-2 py-1.5 relative z-30" role="toolbar" aria-label="View controls">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              const url = `https://mmfhjlpsumhyxjqhyirw.supabase.co/functions/v1/export-selections-pdf?project_id=${projectId}&print=1`
              window.open(url, '_blank')
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40 transition-colors"
            aria-label="Export selections to PDF"
          >
            <FileDown size={13} /> Export to PDF
          </button>
          <div className="flex items-center bg-white/30 rounded-lg p-0.5" role="group" aria-label="Sort mode">
            {[
              { key: 'group', label: 'Schedule', icon: Grid3X3 },
              { key: 'room', label: 'Room', icon: Home },
              { key: 'component', label: 'Component', icon: Layers },
              { key: 'boq', label: 'BoQ', icon: BarChart3 },
              { key: 'code', label: 'Code', icon: Hash },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
                aria-pressed={sortBy === s.key}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] transition-all ${
                  sortBy === s.key
                    ? 'bg-white/70 text-[var(--color-text)] font-medium shadow-sm'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <s.icon size={12} />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilter(f => !f)}
              aria-expanded={showFilter}
              aria-label="Filter selections"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                filter !== 'all' ? 'text-[var(--color-text)] bg-white/40' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40'
              }`}
            >
              <SlidersHorizontal size={13} />
            </button>
            {showFilter && (
              <div className="absolute top-full left-0 mt-1 glass rounded-lg border border-white/60 shadow-xl py-1 z-50 min-w-[140px]" role="menu">
                {[
                  { key: 'all', label: 'All items' },
                  { key: 'pending', label: `To review (${totalPending})` },
                  { key: 'approved', label: 'Approved' },
                  { key: 'confirmed', label: 'Confirmed' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setFilter(f.key); setShowFilter(false) }}
                    role="menuitem"
                    className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                      filter === f.key ? 'text-[var(--color-text)] font-medium bg-white/50' : 'text-[var(--color-muted)] hover:bg-white/30'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative ml-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
              aria-label="Search selections"
              className="pl-7 pr-3 py-1.5 rounded-lg bg-transparent text-[11px] font-light focus:outline-none focus:bg-white/40 transition-colors w-32 placeholder:text-[var(--color-muted)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-0.5 border-l border-white/30 pl-2 ml-2" role="group" aria-label="View mode">
          <button
            onClick={() => setViewMode('schedule')}
            aria-pressed={viewMode === 'schedule'}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'schedule' ? 'bg-white/30 text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40'
            }`}
            title="List view"
            aria-label="List view"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setViewMode('plan')}
            aria-pressed={viewMode === 'plan'}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'plan' ? 'bg-white/30 text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40'
            }`}
            title="Plan view"
            aria-label="Plan view"
          >
            <Map size={15} />
          </button>
        </div>
      </div>

      {/* Content by view mode + sort mode */}
      {viewMode === 'plan' ? (
        <PlanView
          items={items}
          filteredItems={filteredItems}
          roomMappings={roomMappings}
          isArchitect={isArchitect}
          onApproveItem={handleApproveItem}
          onRequestChange={handleRequestChange}
          codeTitleMap={codeTitleMap}
          selectionCodeMap={selectionCodeMap}
          codeHierarchyMap={codeHierarchyMap}
        />
      ) : sortBy === 'boq' ? (
        <BoQView groupedData={groupedData} natspecMap={natspecMap} codeTitleMap={codeTitleMap} />
      ) : sortBy === 'component' ? (
        <ComponentGroupedView
          components={componentGroupedData}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onApproveItem={handleApproveItem}
          onRequestChange={handleRequestChange}
          natspecMap={natspecMap}
          subCriteriaMap={subCriteriaMap}
          codeTitleMap={codeTitleMap}
          selectionCodeMap={selectionCodeMap}
          codeHierarchyMap={codeHierarchyMap}
        />
      ) : sortBy === 'room' ? (
        <RoomGroupedView
          rooms={roomGroupedData}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onApproveItem={handleApproveItem}
          onApproveRoom={handleApproveRoom}
          onRequestChange={handleRequestChange}
          natspecMap={natspecMap}
          codeTitleMap={codeTitleMap}
        />
      ) : sortBy === 'code' ? (
        <CodeHierarchyView
          items={filteredItems}
          codeHierarchyMap={codeHierarchyMap}
          codeTitleMap={codeTitleMap}
          selectionCodeMap={selectionCodeMap}
          natspecMap={natspecMap}
          onApproveItem={handleApproveItem}
          onRequestChange={handleRequestChange}
        />
      ) : (
        <div className="space-y-3">
          {groupedData.map(group => {
            const isExpanded = expandedGroups.has(group.group_key)
            const hasPending = group.pending > 0 || group.changeReq > 0

            return (
              <div key={group.group_key} className={`glass-s rounded-xl border overflow-hidden transition-all ${
                hasPending ? 'border-[var(--color-pending)]/30' : 'border-white/40'
              }`}>
                <button
                  onClick={() => toggleGroup(group.group_key)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
                      {(() => {
                        const GroupIcon = GROUP_ICONS[group.group_key]
                        return GroupIcon ? <GroupIcon size={32} className="text-[var(--color-muted)]" /> : null
                      })()}
                      <span className="text-[13px] font-semibold text-[var(--color-text)] bg-white/50 w-8 h-8 rounded-lg inline-flex items-center justify-center">
                        {group.items.length}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-[13px] font-medium mt-1">{group.group_name}</h2>
                      <p className="text-[11px] text-[var(--color-text)] font-light mt-0.5">{group.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.pending > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{
                        background: 'rgba(196,162,101,0.1)', color: 'var(--color-pending)'
                      }}>
                        {group.pending} to review
                      </span>
                    )}
                    {group.changeReq > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{
                        background: 'rgba(160,115,88,0.1)', color: 'var(--color-change)'
                      }}>
                        {group.changeReq} change{group.changeReq !== 1 ? 's' : ''}
                      </span>
                    )}
                    {group.pending === 0 && group.changeReq === 0 && (
                      <Check size={14} className="text-[var(--color-approved)]" />
                    )}
                    <div className="w-12 h-1 bg-white/40 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(((group.approved + group.confirmed) / group.total) * 100)} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-[var(--color-approved)]/60" style={{
                        width: `${((group.approved + group.confirmed) / group.total) * 100}%`
                      }} />
                    </div>
                    {isExpanded
                      ? <ChevronDown size={14} className="text-[var(--color-muted)]" />
                      : <ChevronRight size={14} className="text-[var(--color-muted)]" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/30">
                    <ScheduleView items={group.items} natspecMap={natspecMap} subCriteriaMap={subCriteriaMap} roomMappings={roomMappings} codeTitleMap={codeTitleMap} selectionCodeMap={selectionCodeMap} codeHierarchyMap={codeHierarchyMap} onApproveItem={handleApproveItem} onRequestChange={handleRequestChange} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {((sortBy === 'group' && groupedData.length === 0) || (sortBy === 'room' && roomGroupedData.length === 0) || (sortBy === 'component' && componentGroupedData.length === 0) || (sortBy === 'boq' && groupedData.length === 0) || (sortBy === 'code' && filteredItems.length === 0)) && (
        <div className="text-center py-20 glass-t rounded-xl border border-white/40">
          <Package size={24} className="mx-auto text-[var(--color-border)] mb-3" />
          <p className="text-[13px] text-[var(--color-text)] font-light">
            {filter !== 'all' ? 'No items match this filter.' : 'No selections yet.'}
          </p>
        </div>
      )}

      {/* Change Request Modal */}
      {changeModal.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
             role="dialog" aria-modal="true" aria-label="Request a change"
             onClick={() => setChangeModal({ open: false, itemId: null })}>
          <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />
          <div className="relative glass rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-[15px] font-medium mb-2" style={{ color: 'var(--color-text)' }}>Request a Change</h2>
            <p className="text-[13px] font-light mb-4" style={{ color: 'var(--color-muted)' }}>
              Describe what you'd like changed — your note will be sent to Sean.
            </p>
            <textarea
              value={changeNote}
              onChange={e => setChangeNote(e.target.value)}
              placeholder="e.g. I'd prefer a warmer colour for the kitchen splashback..."
              rows={4}
              className="w-full bg-white/40 border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] font-light focus:outline-none focus:border-[var(--color-accent)] resize-none"
              style={{ color: 'var(--color-text)' }}
              autoFocus
              aria-label="Change request note"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setChangeModal({ open: false, itemId: null })}
                className="text-[12px] font-medium px-4 py-2 rounded-lg" style={{ color: 'var(--color-muted)' }}>
                Cancel
              </button>
              <button onClick={submitChangeRequest} disabled={!changeNote.trim()}
                className="text-[12px] font-medium px-4 py-2 rounded-lg text-white disabled:opacity-40"
                style={{ background: 'var(--color-change)' }}>
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Approval Confirmation */}
      <ConfirmDialog
        open={confirmBulk.open}
        title={`Approve ${confirmBulk.count} selection${confirmBulk.count !== 1 ? 's' : ''}?`}
        message="This will mark all pending items in this group as approved. You can still request changes on individual items later."
        confirmLabel="Approve All"
        confirmColor="var(--color-approved)"
        onConfirm={executeBulkApprove}
        onCancel={() => setConfirmBulk({ open: false, type: null, key: null, count: 0 })}
      />
    </div>
  )
}
