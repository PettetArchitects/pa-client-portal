import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  Check, ChevronDown, ChevronRight, MessageSquare, ArrowUpRight,
  ThumbsUp, Eye, EyeOff, Package, Palette, Wrench, AlertCircle,
  Home, Grid3X3, FileDown, SlidersHorizontal, Search,
  List, Map, BarChart3, Layers,
} from 'lucide-react'
import { GROUP_ICONS, ROOM_ICONS } from '../components/SketchIcons'
import InteractivePlan from '../components/InteractivePlan'

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
  pending: { bg: 'rgba(196,162,101,0.08)', border: 'rgba(196,162,101,0.3)', text: 'var(--color-pending)', label: 'Needs your input' },
  approved: { bg: 'rgba(91,138,101,0.06)', border: 'rgba(91,138,101,0.2)', text: 'var(--color-approved)', label: 'Approved' },
  change_requested: { bg: 'rgba(160,115,88,0.06)', border: 'rgba(160,115,88,0.25)', text: 'var(--color-change)', label: 'Change requested' },
  not_applicable: { bg: 'rgba(255,255,255,0.3)', border: 'rgba(232,232,229,0.6)', text: 'var(--color-muted)', label: 'Confirmed' },
}

/* Room display config: order and labels */
const ROOM_CONFIG = {
  kitchen:     { label: 'Kitchen',     order: 1, emoji: '' },
  living:      { label: 'Living',      order: 2, emoji: '' },
  dining:      { label: 'Dining',      order: 3, emoji: '' },
  bedroom_01:  { label: 'Main Bedroom', order: 4, emoji: '' },
  bedroom_02:  { label: 'Bedroom 2',   order: 5, emoji: '' },
  study:       { label: 'Study / Guest', order: 6, emoji: '' },
  bathroom:    { label: 'Bathroom',    order: 7, emoji: '' },
  ensuite:     { label: 'Ensuite',     order: 8, emoji: '' },
  laundry:     { label: 'Laundry',     order: 9, emoji: '' },
  entry:       { label: 'Entry',       order: 10, emoji: '' },
  pantry:      { label: 'Pantry',      order: 11, emoji: '' },
  linen:       { label: 'Linen',       order: 12, emoji: '' },
  alfresco:    { label: 'Alfresco',    order: 13, emoji: '' },
  garage:      { label: 'Garage',      order: 14, emoji: '' },
  exterior:    { label: 'Exterior',    order: 20, emoji: '' },
  building:    { label: 'Building',   order: 90, emoji: '' },
}

const ELEMENT_ORDER = {
  floor: 1, wall: 2, ceiling: 3, joinery: 4, sanitary: 5,
  tapware: 6, fixture: 7, fitting: 8, hardware: 9, door: 10,
  window: 11, product: 12, finish: 13, trim: 14, services: 15,
  mechanical: 16, exterior: 17, general: 18, other: 19,
}

const ELEMENT_LABELS = {
  floor: 'Floor', wall: 'Wall', ceiling: 'Ceiling', joinery: 'Joinery',
  sanitary: 'Sanitary', tapware: 'Tapware', fixture: 'Fixtures', fitting: 'Fittings',
  hardware: 'Hardware', door: 'Doors', window: 'Windows', product: 'Products',
  finish: 'Finishes', trim: 'Trim', services: 'Services', mechanical: 'Mechanical',
  exterior: 'Exterior', general: 'General', other: 'Other',
}

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
  const [subCriteriaMap, setSubCriteriaMap] = useState({}) // element_type → [{field_key, field_label, field_type, field_unit, display_order}]
  const [codeTitleMap, setCodeTitleMap] = useState({}) // canonical_code → title (e.g. "LT1" → "Light Type 01")
  const [selectionCodeMap, setSelectionCodeMap] = useState({}) // project_selection_id → canonical_code (from link table)
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [viewMode, setViewMode] = useState('schedule') // 'schedule', 'plan'
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'approved', 'confirmed'
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('group') // 'group', 'room', 'boq'
  const [showFilter, setShowFilter] = useState(false)
  // showSort removed — inline segmented buttons now

  useEffect(() => {
    if (!projectId) return
    loadData()
  }, [projectId])

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
      supabase.from('master_code_entries').select('id, canonical_code, title').eq('status', 'active'),
      supabase.from('project_selection_code_links').select('project_selection_id, entry_id'),
    ])

    setGroups(grpRes.data || [])
    setItems(selRes.data || [])
    setRoomMappings(roomRes.data || [])

    // Build code title lookup: canonical_code → title (e.g. "LT1" → "Light Type 01")
    const ctMap = {}
    const codeIdToCode = {}
    ;(codeRes.data || []).forEach(e => {
      ctMap[e.canonical_code] = e.title
      codeIdToCode[e.id] = e.canonical_code
    })
    setCodeTitleMap(ctMap)

    // Build selection_id → canonical_code from link table (covers child-coded items
    // whose code is not in attributes.code — e.g. FT1-ACC, ROF1-DP, etc.)
    const scMap = {}
    ;(linkRes.data || []).forEach(link => {
      if (!scMap[link.project_selection_id]) {
        const canonical = codeIdToCode[link.entry_id]
        if (canonical) scMap[link.project_selection_id] = canonical
      }
    })
    setSelectionCodeMap(scMap)

    // Build sub-criteria lookup: element_type → sorted fields array
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

    // Fetch NATSPEC links
    const selIds = (selRes.data || []).map(i => i.project_selection_id).filter(Boolean)
    const natspecRes = selIds.length > 0
      ? await supabase.from('project_selection_natspec_links')
          .select('project_selection_id, natspec_sections:section_id(section_ref, section_title)')
          .in('project_selection_id', selIds)
      : { data: [] }

    // Build NATSPEC lookup: project_selection_id → array of { ref, title }
    const nMap = {}
    ;(natspecRes.data || []).forEach(link => {
      const selId = link.project_selection_id
      const ns = link.natspec_sections
      if (!nMap[selId]) nMap[selId] = []
      if (ns?.section_ref) nMap[selId].push({ ref: ns.section_ref, title: ns.section_title })
    })
    setNatspecMap(nMap)
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
    addToast('Selection approved.', 'success')
  }

  async function handleApproveGroup(groupKey) {
    const groupPending = items.filter(i => i.schedule_group === groupKey && i.approval_status === 'pending')
    if (groupPending.length === 0) return
    setConfirmBulk({ open: true, type: 'group', key: groupKey, count: groupPending.length })
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

  // Filter items by status + search
  const filteredItems = items.filter(i => {
    // Status filter
    if (filter === 'pending' && i.approval_status !== 'pending' && i.approval_status !== 'change_requested') return false
    if (filter === 'approved' && i.approval_status !== 'approved') return false
    if (filter === 'confirmed' && i.approval_status !== 'not_applicable') return false
    // Search filter
    if (search) {
      const sel = i.project_selections || {}
      const text = [sel.title, sel.manufacturer_name, sel.model, i.schedule_group, sel.attributes?.colour].filter(Boolean).join(' ').toLowerCase()
      if (!text.includes(search.toLowerCase())) return false
    }
    return true
  })

  // Build grouped data (for review + schedule modes)
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

  // Build room-grouped data (for rooms mode)
  const roomGroupedData = buildRoomGroups(filteredItems, items, roomMappings)

  // Build component-grouped data (by parent assembly)
  const componentGroupedData = buildComponentGroups(filteredItems, items)

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
        <div className="h-3 w-48 bg-white/40 rounded mb-8" />
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/40 rounded-xl mb-3" />)}
      </div>
    )
  }

  const viewTitle = viewMode === 'plan' ? 'Floor Plan' : sortBy === 'boq' ? 'Bill of Quantities' : sortBy === 'room' ? 'By Room' : sortBy === 'component' ? 'By Component' : 'Selections'

  return (
    <div className="max-w-4xl">
      {/* Progress bar */}
      <div className="glass rounded-xl border border-white/50 p-4 mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] font-medium">
            Your selections
          </span>
          <span className="text-[13px] font-medium">{progressPct}%</span>
        </div>
        <p className="text-[11px] text-[var(--color-text)] font-light mb-3">
          {totalPending > 0
            ? `${totalPending} material and finish selection${totalPending !== 1 ? 's' : ''} need${totalPending === 1 ? 's' : ''} your review — approve each item or request a change.`
            : progressPct === 100
              ? 'All selections confirmed. Your project is ready to proceed.'
              : 'Review each material, finish and fitting below. Approve to confirm or request changes.'}
        </p>
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

      {/* Toolbar — Programa style */}
      <div className="flex items-center justify-between mb-4 glass-s rounded-xl border border-white/40 px-2 py-1.5 relative z-30">
        {/* Left: actions */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => {
              const url = `https://mmfhjlpsumhyxjqhyirw.supabase.co/functions/v1/export-selections-pdf?project_id=${projectId}&print=1`
              window.open(url, '_blank')
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40 transition-colors"
          >
            <FileDown size={13} /> Export to PDF
          </button>
          <div className="flex items-center bg-white/30 rounded-lg p-0.5">
            {[
              { key: 'group', label: 'Schedule', icon: Grid3X3 },
              { key: 'room', label: 'Room', icon: Home },
              { key: 'component', label: 'Component', icon: Layers },
              { key: 'boq', label: 'BoQ', icon: BarChart3 },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key)}
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
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                filter !== 'all' ? 'text-[var(--color-text)] bg-white/40' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40'
              }`}
            >
              <SlidersHorizontal size={13} />
            </button>
            {showFilter && (
              <div className="absolute top-full left-0 mt-1 glass rounded-lg border border-white/60 shadow-xl py-1 z-50 min-w-[140px]">
                {[
                  { key: 'all', label: 'All items' },
                  { key: 'pending', label: `To review (${totalPending})` },
                  { key: 'approved', label: 'Approved' },
                  { key: 'confirmed', label: 'Confirmed' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setFilter(f.key); setShowFilter(false) }}
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
              className="pl-7 pr-3 py-1.5 rounded-lg bg-transparent text-[11px] font-light focus:outline-none focus:bg-white/40 transition-colors w-32 placeholder:text-[var(--color-muted)]"
            />
          </div>
        </div>

        {/* Right: view toggles */}
        <div className="flex items-center gap-0.5 border-l border-white/30 pl-2 ml-2">
          <button
            onClick={() => setViewMode('schedule')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'schedule' ? 'bg-white/30 text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40'
            }`}
            title="List view"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => setViewMode('plan')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'plan' ? 'bg-white/30 text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40'
            }`}
            title="Plan view"
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
      ) : (
        <div className="space-y-3">
          {groupedData.map(group => {
            const isExpanded = expandedGroups.has(group.group_key)
            const hasPending = group.pending > 0 || group.changeReq > 0

            return (
              <div key={group.group_key} className={`glass-s rounded-xl border overflow-hidden transition-all ${
                hasPending ? 'border-[var(--color-pending)]/30' : 'border-white/40'
              }`}>
                {/* Group header */}
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
                    <ScheduleView items={group.items} natspecMap={natspecMap} subCriteriaMap={subCriteriaMap} roomMappings={roomMappings} codeTitleMap={codeTitleMap} selectionCodeMap={selectionCodeMap} onApproveItem={handleApproveItem} onRequestChange={handleRequestChange} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {((sortBy === 'group' && groupedData.length === 0) || (sortBy === 'room' && roomGroupedData.length === 0) || (sortBy === 'component' && componentGroupedData.length === 0) || (sortBy === 'boq' && groupedData.length === 0)) && (
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

/* ── Build room-grouped data structure ── */
function buildRoomGroups(filteredItems, allItems, roomMappings) {
  // Build lookup: project_selection_id → portal item
  const itemBySelId = {}
  allItems.forEach(i => { itemBySelId[i.project_selection_id] = i })

  const filteredIds = new Set(filteredItems.map(i => i.project_selection_id))

  // Group mappings by room_key
  const roomMap = {}
  roomMappings.forEach(m => {
    if (!roomMap[m.room_key]) roomMap[m.room_key] = []
    roomMap[m.room_key].push(m)
  })

  // Build room groups
  const rooms = Object.entries(roomMap).map(([roomKey, mappings]) => {
    const config = ROOM_CONFIG[roomKey] || { label: roomKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), order: 50 }

    // Build element sub-groups
    const elementMap = {}
    mappings.forEach(m => {
      const item = itemBySelId[m.project_selection_id]
      if (!item) return
      if (!filteredIds.has(m.project_selection_id)) return
      const elType = m.element_type || 'other'
      if (!elementMap[elType]) elementMap[elType] = []
      // Avoid duplicates within same element group
      if (!elementMap[elType].find(i => i.id === item.id)) {
        elementMap[elType].push(item)
      }
    })

    const elements = Object.entries(elementMap)
      .map(([elType, elItems]) => ({
        type: elType,
        label: ELEMENT_LABELS[elType] || elType,
        order: ELEMENT_ORDER[elType] || 99,
        items: elItems,
      }))
      .sort((a, b) => a.order - b.order)

    // Stats from all items in this room (not filtered)
    const allRoomSelIds = new Set(mappings.map(m => m.project_selection_id))
    const allRoomItems = allItems.filter(i => allRoomSelIds.has(i.project_selection_id))
    const pending = allRoomItems.filter(i => i.approval_status === 'pending').length
    const approved = allRoomItems.filter(i => i.approval_status === 'approved').length
    const confirmed = allRoomItems.filter(i => i.approval_status === 'not_applicable').length
    const changeReq = allRoomItems.filter(i => i.approval_status === 'change_requested').length
    const totalVisible = elements.reduce((sum, el) => sum + el.items.length, 0)

    return {
      roomKey,
      label: config.label,
      order: config.order,
      elements,
      pending, approved, confirmed, changeReq,
      total: allRoomItems.length,
      totalVisible,
    }
  })
    .filter(r => r.totalVisible > 0)
    .sort((a, b) => a.order - b.order)

  return rooms
}

/* ── Build component-grouped data: group by parent assembly ── */
/* ── IFC family derivation — automatic from selection data ── */
const IFC_FAMILIES = {
  IfcRoof:                   { label: 'Roofing',              order: 1 },
  IfcWall:                   { label: 'Walls & Facade',       order: 2 },
  IfcSlab:                   { label: 'Floors & Slabs',       order: 3 },
  IfcCovering:               { label: 'Coverings & Finishes', order: 4 },
  IfcDoor:                   { label: 'Doors',                order: 5 },
  IfcWindow:                 { label: 'Windows & Glazing',    order: 6 },
  IfcFurniture:              { label: 'Joinery & Furniture',  order: 7 },
  IfcSanitaryTerminal:       { label: 'Sanitary Fixtures',    order: 8 },
  IfcFlowTerminal:           { label: 'Tapware & Ventilation',order: 9 },
  IfcLightFixture:           { label: 'Lighting',             order: 10 },
  IfcEnergyConversionDevice: { label: 'Energy Systems',       order: 11 },
  IfcFlowStorageDevice:      { label: 'Water & Storage',      order: 12 },
  IfcShadingDevice:          { label: 'Shading & Screens',    order: 13 },
  IfcBuildingElementProxy:   { label: 'General Elements',     order: 99 },
}

function deriveIfcFamily(item) {
  const sel = item.project_selections || {}
  const attrs = sel.attributes || {}
  const title = (sel.title || '').toLowerCase()
  const kind = sel.selection_kind || ''
  const role = sel.component_role || ''
  const group = item.schedule_group || ''

  // Explicit attribute takes priority
  if (attrs.ifc_class && IFC_FAMILIES[attrs.ifc_class]) return attrs.ifc_class

  // Derive from selection_kind
  if (kind === 'door_type') return 'IfcDoor'
  if (kind === 'window_type') return 'IfcWindow'
  if (kind === 'facade_system') return 'IfcWall'
  if (kind === 'joinery_item') return 'IfcFurniture'

  // Derive from title keywords
  if (title.includes('roof')) return 'IfcRoof'
  if (title.includes('slab') || title.match(/\bcon\d/)) return 'IfcSlab'
  if (title.includes('carpet') || title.match(/\bca\d/)) return 'IfcCovering'
  if (title.includes('wall') && (title.includes('cladding') || title.includes('facade'))) return 'IfcWall'
  if (title.includes('insulation') || title.includes('membrane') || title.includes('air barrier')) return 'IfcCovering'
  if (title.includes('tile') || title.includes('paint') || title.includes('grout') || title.includes('silicone')) return 'IfcCovering'
  if (title.includes('colour') && kind === 'finish') return 'IfcCovering'
  if (title.includes('skirting') || title.includes('architrave') || title.includes('cornice')) return 'IfcCovering'
  if (title.includes('ceiling') || title.includes('plasterboard')) return 'IfcCovering'
  if (title.includes('basin') || title.includes('toilet') || title.includes('bath') || title.includes('wc')) return 'IfcSanitaryTerminal'
  if (title.includes('shower') || title.includes('mixer') || title.includes('towel') || title.includes('tapware') || title.includes('rangehood') || title.includes('exhaust')) return 'IfcFlowTerminal'
  if (title.includes('light') || title.match(/\blt\d/)) return 'IfcLightFixture'
  if (title.includes('solar') || title.includes('battery') || title.includes('inverter')) return 'IfcEnergyConversionDevice'
  if (title.includes('rainwater') || title.includes('hot water') || title.includes('tank')) return 'IfcFlowStorageDevice'
  if (title.includes('screen') || title.includes('blind') || title.includes('shade')) return 'IfcShadingDevice'
  if (title.includes('door')) return 'IfcDoor'
  if (title.includes('window')) return 'IfcWindow'

  // Derive from component_role
  if (role === 'insulation' || role === 'membrane' || role === 'lining' || role === 'substrate') return 'IfcCovering'
  if (role === 'finish_internal' || role === 'finish_external' || role === 'accent') return 'IfcCovering'
  if (role === 'hardware' || role === 'hinge' || role === 'closer') return 'IfcBuildingElementProxy'

  // Derive from schedule_group
  if (group === 'exterior') return 'IfcWall'
  if (group === 'flooring') return 'IfcCovering'
  if (group === 'internal_finishes') return 'IfcCovering'
  if (group === 'thermal_envelope') return 'IfcCovering'
  if (group === 'mechanical') return 'IfcFlowTerminal'
  if (group === 'lighting_electrical') return 'IfcLightFixture'
  if (group === 'services_infra') return 'IfcFlowStorageDevice'

  if (kind === 'finish') return 'IfcCovering'
  if (kind === 'hardware_set') return 'IfcBuildingElementProxy'

  return 'IfcBuildingElementProxy'
}

function buildComponentGroups(filteredItems, allItems) {
  const filteredIds = new Set(filteredItems.map(i => i.project_selection_id))

  // Derive IFC family for every item and group
  const familyGroups = {}
  filteredItems.forEach(item => {
    const family = deriveIfcFamily(item)
    if (!familyGroups[family]) familyGroups[family] = { items: [], allItems: [] }
    familyGroups[family].items.push(item)
  })
  // Also count all items (for stats)
  allItems.forEach(item => {
    const family = deriveIfcFamily(item)
    if (!familyGroups[family]) familyGroups[family] = { items: [], allItems: [] }
    familyGroups[family].allItems.push(item)
  })

  return Object.entries(familyGroups)
    .map(([family, data]) => {
      const meta = IFC_FAMILIES[family] || IFC_FAMILIES.IfcBuildingElementProxy
      const all = data.allItems
      return {
        parentId: family,
        parent: null,
        code: family.replace('Ifc', ''),
        label: meta.label,
        children: data.items.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
        pending: all.filter(i => i.approval_status === 'pending').length,
        approved: all.filter(i => i.approval_status === 'approved').length,
        confirmed: all.filter(i => i.approval_status === 'not_applicable').length,
        changeReq: all.filter(i => i.approval_status === 'change_requested').length,
        total: all.length,
        totalVisible: data.items.length,
        order: meta.order,
        ifcClass: family,
      }
    })
    .filter(g => g.totalVisible > 0)
    .sort((a, b) => a.order - b.order)
}

/* ── Room-grouped view ── */
function RoomGroupedView({ rooms, expandedGroups, toggleGroup, onApproveItem, onApproveRoom, onRequestChange, natspecMap, codeTitleMap }) {
  return (
    <div className="space-y-3">
      {rooms.map(room => {
        const isExpanded = expandedGroups.has(room.roomKey)
        const hasPending = room.pending > 0 || room.changeReq > 0

        return (
          <div key={room.roomKey} className={`glass-s rounded-xl border overflow-hidden transition-all ${
            hasPending ? 'border-[var(--color-pending)]/30' : 'border-white/40'
          }`}>
            {/* Room header */}
            <button
              onClick={() => toggleGroup(room.roomKey)}
              aria-expanded={isExpanded}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
                  {(() => {
                    const RoomIcon = ROOM_ICONS[room.roomKey] || ROOM_ICONS.whole_house
                    return <RoomIcon size={32} className="text-[var(--color-muted)]" />
                  })()}
                  <span className="text-[13px] font-semibold text-[var(--color-text)] bg-white/50 w-8 h-8 rounded-lg inline-flex items-center justify-center">
                    {room.totalVisible}
                  </span>
                </div>
                <div>
                  <h2 className="text-[13px] font-medium mt-1">{room.label}</h2>
                  <p className="text-[10px] text-[var(--color-text)] font-light mt-0.5">
                    {room.elements.map(e => e.label).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {room.pending > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{
                    background: 'rgba(196,162,101,0.1)', color: 'var(--color-pending)'
                  }}>
                    {room.pending} to review
                  </span>
                )}
                {room.changeReq > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{
                    background: 'rgba(160,115,88,0.1)', color: 'var(--color-change)'
                  }}>
                    {room.changeReq} change{room.changeReq !== 1 ? 's' : ''}
                  </span>
                )}
                {room.pending === 0 && room.changeReq === 0 && (
                  <Check size={14} className="text-[var(--color-approved)]" />
                )}
                <div className="w-12 h-1 bg-white/40 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--color-approved)]/60" style={{
                    width: `${room.total > 0 ? ((room.approved + room.confirmed) / room.total) * 100 : 0}%`
                  }} />
                </div>
                {isExpanded
                  ? <ChevronDown size={14} className="text-[var(--color-muted)]" />
                  : <ChevronRight size={14} className="text-[var(--color-muted)]" />}
              </div>
            </button>

            {/* Expanded: element sub-groups */}
            {isExpanded && (
              <div className="border-t border-white/30">
                {room.elements.map(el => (
                  <div key={el.type}>
                    {/* Element type sub-header */}
                    <div className="px-5 py-2 bg-white/10 border-b border-white/20">
                      <span className="text-[10px] tracking-[1.5px] uppercase text-[var(--color-muted)] font-medium">
                        {el.label}
                      </span>
                      <span className="text-[9px] text-[var(--color-muted)] ml-2">
                        {el.items.length}
                      </span>
                    </div>
                    {/* Items within this element type */}
                    <div className="p-4 pt-2 space-y-2">
                      {el.items.map(item => (
                        <SelectionCard
                          key={item.id}
                          item={item}
                          natspecMap={natspecMap}
                          codeTitleMap={codeTitleMap}
                          onApprove={() => onApproveItem(item.id)}
                          onRequestChange={() => onRequestChange(item.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Approve all for room */}
                {hasPending && room.pending > 0 && (
                  <div className="px-5 py-3 border-t border-white/30 bg-white/40">
                    <button
                      onClick={() => onApproveRoom(room.roomKey)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white text-[12px] rounded-lg hover:opacity-90 transition-opacity font-medium"
                    >
                      <ThumbsUp size={13} /> Approve all {room.pending} in {room.label}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Component-grouped view: by parent assembly ── */
function ComponentGroupedView({ components, expandedGroups, toggleGroup, onApproveItem, onRequestChange, natspecMap, subCriteriaMap, codeTitleMap, selectionCodeMap }) {
  return (
    <div className="space-y-3">
      {components.map(comp => {
        const isExpanded = expandedGroups.has(comp.parentId)
        const hasPending = comp.pending > 0 || comp.changeReq > 0

        return (
          <div key={comp.parentId} className={`glass-s rounded-xl border overflow-hidden transition-all ${
            hasPending ? 'border-[var(--color-pending)]/30' : 'border-white/40'
          }`}>
            {/* IFC family header */}
            <button
              onClick={() => toggleGroup(comp.parentId)}
              aria-expanded={isExpanded}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
                  <span className="text-[13px] font-semibold text-[var(--color-text)] bg-white/50 w-8 h-8 rounded-lg inline-flex items-center justify-center">
                    {comp.totalVisible}
                  </span>
                </div>
                <div>
                  <h2 className="text-[13px] font-medium mt-0.5">{comp.label}</h2>
                  <p className="text-[9px] text-[var(--color-muted)] font-mono tracking-wider mt-0.5">
                    {comp.ifcClass}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {comp.pending > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{
                    background: 'rgba(196,162,101,0.1)', color: 'var(--color-pending)'
                  }}>{comp.pending} to review</span>
                )}
                {comp.pending === 0 && comp.changeReq === 0 && (
                  <Check size={14} className="text-[var(--color-approved)]" />
                )}
                <div className="w-12 h-1 bg-white/40 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--color-approved)]/60" style={{
                    width: `${comp.total > 0 ? ((comp.approved + comp.confirmed) / comp.total) * 100 : 0}%`
                  }} />
                </div>
                {isExpanded
                  ? <ChevronDown size={14} className="text-[var(--color-muted)]" />
                  : <ChevronRight size={14} className="text-[var(--color-muted)]" />}
              </div>
            </button>

            {/* Expanded: all items in this IFC family */}
            {isExpanded && (
              <div className="border-t border-white/30">
                <ScheduleView items={comp.children} natspecMap={natspecMap} subCriteriaMap={subCriteriaMap} codeTitleMap={codeTitleMap} selectionCodeMap={selectionCodeMap} onApproveItem={onApproveItem} onRequestChange={onRequestChange} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Review view: card-based with approve/change actions ── */
function ReviewView({ items, groupKey, hasPending, pendingCount, onApproveItem, onApproveGroup, onRequestChange, codeTitleMap }) {
  return (
    <div>
      <div className="p-4 space-y-2">
        {items.map(item => (
          <SelectionCard
            key={item.id}
            item={item}
            codeTitleMap={codeTitleMap}
            onApprove={() => onApproveItem(item.id)}
            onRequestChange={() => onRequestChange(item.id)}
          />
        ))}
      </div>
      {hasPending && pendingCount > 0 && (
        <div className="px-5 py-3 border-t border-white/30 bg-white/40">
          <button
            onClick={() => onApproveGroup(groupKey)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white text-[12px] rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            <ThumbsUp size={13} /> Approve all {pendingCount} items
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Parse code from title: "MX1 — Shower mixer" → { code: "MX1", name: "Shower mixer" } ── */
function parseCode(title, attrs) {
  const sysCode = attrs?.code || null
  if (!title) return { code: sysCode, name: title }
  // Match patterns: "CODE — Name" or "CODE - Name" where CODE is alphanumeric with dots
  const m = title.match(/^([A-Z][A-Z0-9]*(?:\.[0-9]+)?)\s*[—–\-]\s*(.+)$/i)
  if (m) return { code: sysCode || m[1], name: m[2] }
  // Match "Joinery J01.1" style
  const j = title.match(/^Joinery\s+(J\d+(?:\.\d+)?)\s*$/i)
  if (j) return { code: sysCode || j[1], name: 'Joinery' }
  return { code: sysCode, name: title }
}

/* ── Sub-group items by selection_kind within a schedule group ── */
const KIND_GROUP_ORDER = {
  joinery_item: 1, door_type: 2, window_type: 3, facade_system: 4,
  product: 5, hardware_set: 6, material: 7, finish: 8, other: 9,
}
const KIND_GROUP_LABELS = {
  joinery_item: 'Joinery Items', door_type: 'Doors', window_type: 'Windows',
  facade_system: 'Facade', product: 'Products', hardware_set: 'Hardware',
  material: 'Materials', finish: 'Finishes', other: 'Other',
}

/* ── Build parent→children tree from flat items list ── */
function buildItemTree(items) {
  // Index: project_selection_id → portal item
  const bySelId = {}
  items.forEach(i => { if (i.project_selections?.id) bySelId[i.project_selections.id] = i })

  // Separate parents and components
  const parents = []
  const orphanComponents = [] // components whose parent isn't in this group
  const childMap = {} // parent_selection_id → [children]

  items.forEach(item => {
    const sel = item.project_selections || {}
    if (sel.is_component && sel.parent_selection_id) {
      if (!childMap[sel.parent_selection_id]) childMap[sel.parent_selection_id] = []
      childMap[sel.parent_selection_id].push(item)
    } else {
      parents.push(item)
    }
  })

  // Sort children by component_order
  Object.values(childMap).forEach(children => {
    children.sort((a, b) => (a.project_selections?.component_order || 99) - (b.project_selections?.component_order || 99))
  })

  // Attach children to parents, collect orphans
  const tree = parents.map(p => ({
    item: p,
    children: childMap[p.project_selections?.id] || [],
  }))

  // Any children whose parent isn't in this items list → show as standalone
  Object.entries(childMap).forEach(([parentId, children]) => {
    if (!bySelId[parentId]) {
      children.forEach(c => tree.push({ item: c, children: [] }))
    }
  })

  return tree
}

/* ── Sub-group tree nodes by parent selection_kind ── */
function groupTreeByKind(tree) {
  const kindMap = {}
  tree.forEach(node => {
    const sel = node.item.project_selections || {}
    const kind = sel.selection_kind || 'other'
    if (!kindMap[kind]) kindMap[kind] = []
    kindMap[kind].push(node)
  })
  return Object.entries(kindMap)
    .map(([kind, nodes]) => ({
      kind,
      label: KIND_GROUP_LABELS[kind] || kind.replace(/_/g, ' '),
      order: KIND_GROUP_ORDER[kind] || 99,
      nodes: nodes.sort((a, b) => (a.item.display_order || 0) - (b.item.display_order || 0)),
    }))
    .sort((a, b) => a.order - b.order)
}

const ROLE_LABELS = {
  hardware: 'Hardware', hinge: 'Hinge', finish_internal: 'Finish', finish_external: 'Finish',
  closer: 'Lock / Closer', threshold: 'Threshold', accessory: 'Accessory', carcass: 'Carcass',
  door_front: 'Door Front', drawer_front: 'Drawer', benchtop: 'Benchtop', edge_band: 'Edge Band',
  shelf: 'Shelf', frame: 'Frame', glazing: 'Glazing', other: 'Other',
}

/* ── Derive the dominant element_type for a list of items ── */
function getDominantElementType(items) {
  const counts = {}
  items.forEach(i => {
    const et = i.project_selections?.element_type || 'other'
    counts[et] = (counts[et] || 0) + 1
  })
  // Find the most common element type (excluding 'other')
  let best = 'other', bestCount = 0
  Object.entries(counts).forEach(([k, v]) => {
    if (k !== 'other' && v > bestCount) { best = k; bestCount = v }
  })
  return best
}

/* ── Schedule view: proper tabular schedule with column headers ── */
function ScheduleView({ items, natspecMap, subCriteriaMap, roomMappings, codeTitleMap, selectionCodeMap, onApproveItem, onRequestChange }) {
  const tree = buildItemTree(items)
  const allItems = tree.flatMap(n => [n.item, ...n.children])
  const elementType = getDominantElementType(allItems)
  const specFields = (subCriteriaMap && subCriteriaMap[elementType]) || []
  // Show up to 5 spec columns
  const cols = specFields.slice(0, 5)

  // Build room lookup: project_selection_id → [room_key, ...]
  const roomLookup = {}
  if (roomMappings) {
    roomMappings.forEach(m => {
      if (!roomLookup[m.project_selection_id]) roomLookup[m.project_selection_id] = []
      if (!roomLookup[m.project_selection_id].includes(m.room_key)) {
        roomLookup[m.project_selection_id].push(m.room_key)
      }
    })
  }

  // Column widths: Code | Image | Item | Location | Product | Brand | spec cols... | Status
  const colTemplate = `56px 44px minmax(120px, 2fr) minmax(70px, 1fr) minmax(80px, 1.2fr) minmax(70px, 1fr) ${cols.map(() => 'minmax(70px, 1fr)').join(' ')} 76px`

  return (
    <div className="py-2 -mx-2 overflow-x-auto">
      <div className="min-w-[700px] px-2">
      {/* Column headers */}
      <div className="grid gap-2 px-3 py-2 text-[8px] tracking-[0.8px] uppercase text-[var(--color-muted)] font-medium border-b border-white/30"
        style={{ gridTemplateColumns: colTemplate }}>
        <span>Code</span>
        <span></span>
        <span>Item</span>
        <span>Location</span>
        <span>Product</span>
        <span>Brand</span>
        {cols.map(f => <span key={f.key}>{f.label}</span>)}
        <span className="text-right">Status</span>
      </div>

      {/* Table rows */}
      {tree.map(node => {
        const sel = node.item.project_selections || {}
        const attrs = sel.attributes || {}
        const st = STATUS_STYLES[node.item.approval_status] || STATUS_STYLES.not_applicable
        const { code: rawCode, name } = parseCode(sel.title || node.item.selection_title, attrs)
        const code = rawCode || (selectionCodeMap && selectionCodeMap[node.item.project_selection_id]) || null
        const natspecCodes = (natspecMap && natspecMap[node.item.project_selection_id]) || []
        const isPending = node.item.approval_status === 'pending'
        const isChangeReq = node.item.approval_status === 'change_requested'
        // Use item's own element_type for spec field values
        const itemET = sel.element_type || elementType
        const itemSpecFields = (subCriteriaMap && subCriteriaMap[itemET]) || []
        // Map group-level column keys to this item's values
        const colValues = cols.map(col => {
          // Try exact match from item's attributes first
          return attrs[col.key] || null
        })

        const itemRooms = roomLookup[node.item.project_selection_id] || []
        const roomLabels = itemRooms.map(k => ROOM_CONFIG[k]?.label || k.replace(/_/g, ' ')).join(', ')

        return (
          <div key={node.item.id}>
            {/* Parent row */}
            <div className={`grid gap-2 px-3 py-2.5 items-center text-[11px] border-b border-white/15 hover:bg-white/30 transition-colors ${node.children.length > 0 ? 'font-medium' : ''}`}
              style={{ gridTemplateColumns: colTemplate }}>
              {/* Code — leading column */}
              <div className="min-w-0">
                <span className="text-[9px] font-mono tracking-wider text-[var(--color-text)] uppercase font-medium block">{code || '\u2014'}</span>
                {code && codeTitleMap && codeTitleMap[code] && (
                  <span className="text-[7px] uppercase tracking-wider text-[var(--color-muted)] leading-tight block truncate">{codeTitleMap[code]}</span>
                )}
              </div>
              {/* Thumbnail */}
              <div>
                {node.item.portal_image_url ? (
                  <img src={node.item.portal_image_url} alt="" loading="lazy" style={{
                    width: 36, height: 36, borderRadius: 6, objectFit: 'cover',
                    border: '1px solid rgba(0,0,0,0.06)',
                  }} onError={e => { e.target.style.display = 'none' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(0,0,0,0.04)' }} />
                )}
              </div>
              <div className="min-w-0">
                <div className="break-words text-[var(--color-text)]">
                  {name}
                  {(attrs.product_url || attrs.image_url) && (
                    <a href={attrs.product_url || attrs.image_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex ml-1 text-[var(--color-accent)] hover:text-[var(--color-text)] align-middle"
                      title="View product" onClick={e => e.stopPropagation()}>
                      <ArrowUpRight size={10} />
                    </a>
                  )}
                </div>
                {natspecCodes.length > 0 && (
                  <span className="text-[7px] font-mono tracking-wider text-[var(--color-muted)] opacity-70 block">
                    {natspecCodes.map(n => n.ref).join(' · ')}
                  </span>
                )}
              </div>
              {/* Location */}
              <span className="text-[10px] text-[var(--color-muted)] break-words capitalize">{roomLabels || '\u2014'}</span>
              <span className="text-[var(--color-text)] break-words">{sel.model || '\u2014'}</span>
              <span className="text-[var(--color-muted)] break-words">{sel.manufacturer_name || '\u2014'}</span>
              {colValues.map((val, i) => (
                <span key={i} className="break-words" style={{ color: val ? 'var(--color-text)' : 'var(--color-muted)' }}>
                  {cols[i].type === 'colour' && val ? (
                    <span className="flex items-center gap-1"><ColourDot colour={val} />{val}</span>
                  ) : (val || '\u2014')}
                </span>
              ))}
              <div className="text-right">
                {(isPending || isChangeReq) && onApproveItem ? (
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onApproveItem(node.item.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-[rgba(91,138,101,0.1)]" style={{ border: '1px solid rgba(91,138,101,0.3)', color: 'var(--color-approved)' }} title="Approve"><Check size={9} /></button>
                    <button onClick={() => onRequestChange(node.item.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-[rgba(160,115,88,0.08)]" style={{ border: '1px solid rgba(232,232,229,0.8)', color: 'var(--color-muted)' }} title="Request change"><MessageSquare size={9} /></button>
                  </div>
                ) : (
                  <span className="text-[8px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{st.label}</span>
                )}
              </div>
            </div>

            {/* Children rows — indented, lighter */}
            {node.children.map(child => {
              const cSel = child.project_selections || {}
              const cAttrs = cSel.attributes || {}
              const cSt = STATUS_STYLES[child.approval_status] || STATUS_STYLES.not_applicable
              const cRole = ROLE_LABELS[cSel.component_role] || cSel.component_role?.replace(/_/g, ' ') || ''
              const cIsPending = child.approval_status === 'pending'
              const cIsChange = child.approval_status === 'change_requested'
              const cColValues = cols.map(col => cAttrs[col.key] || null)
              const { code: cCodeRaw } = parseCode(cSel.title || child.selection_title, cAttrs)
              const cCode = cCodeRaw || (selectionCodeMap && selectionCodeMap[child.project_selection_id]) || null
              // Child room: own mapping first, fall back to parent's rooms
              const cRooms = roomLookup[child.project_selection_id] || itemRooms
              const cRoomLabels = cRooms.map(k => ROOM_CONFIG[k]?.label || k.replace(/_/g, ' ')).join(', ')

              return (
                <div key={child.id} className="grid gap-2 px-3 py-1.5 items-center text-[10px] border-b border-white/10 hover:bg-white/20 transition-colors bg-white/5"
                  style={{ gridTemplateColumns: colTemplate }}>
                  <div className="min-w-0">
                    <span className="text-[8px] font-mono tracking-wider text-[var(--color-muted)] uppercase block">{cCode || ''}</span>
                    {cCode && codeTitleMap && codeTitleMap[cCode] && (
                      <span className="text-[6px] uppercase tracking-wider text-[var(--color-muted)] opacity-70 leading-tight block truncate">{codeTitleMap[cCode]}</span>
                    )}
                  </div>
                  {/* Child thumbnail */}
                  <div>
                    {child.portal_image_url ? (
                      <img src={child.portal_image_url} alt="" loading="lazy" style={{
                        width: 28, height: 28, borderRadius: 4, objectFit: 'cover',
                        border: '1px solid rgba(0,0,0,0.06)',
                      }} onError={e => { e.target.style.display = 'none' }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(0,0,0,0.04)' }} />
                    )}
                  </div>
                  <div className="min-w-0 pl-4 border-l-2 border-white/25">
                    <span className="text-[7px] tracking-[0.8px] uppercase text-[var(--color-muted)] font-medium block">{cRole}</span>
                    <div className="break-words text-[var(--color-text)]">{cSel.title || child.selection_title}</div>
                  </div>
                  <span className="text-[10px] text-[var(--color-muted)] capitalize">{cRoomLabels || '\u2014'}</span>
                  <span className="text-[var(--color-text)] break-words">{cSel.model || '\u2014'}</span>
                  <span className="text-[var(--color-muted)] break-words">{cSel.manufacturer_name || '\u2014'}</span>
                  {cColValues.map((val, i) => (
                    <span key={i} className="break-words" style={{ color: val ? 'var(--color-text)' : 'var(--color-muted)' }}>
                      {cols[i].type === 'colour' && val ? (
                        <span className="flex items-center gap-1"><ColourDot colour={val} />{val}</span>
                      ) : (val || '\u2014')}
                    </span>
                  ))}
                  <div className="text-right">
                    {(cIsPending || cIsChange) && onApproveItem ? (
                      <button onClick={() => onApproveItem(child.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-[rgba(91,138,101,0.1)]" style={{ border: '1px solid rgba(91,138,101,0.3)', color: 'var(--color-approved)' }} title="Approve"><Check size={9} /></button>
                    ) : (
                      <span className="text-[7px] font-medium px-1 py-0.5 rounded whitespace-nowrap" style={{ background: cSt.bg, color: cSt.text, border: `1px solid ${cSt.border}` }}>{cSt.label}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
    </div>
  )
}

/* ── Parent item row (full-size) ── */
/* ── Spec cell: always shows label + value or dash ── */
function SpecCell({ label, value, unit, children }) {
  return (
    <div className="min-w-0">
      {children || (
        <span className="text-[11px] text-[var(--color-text)] leading-snug block break-words">
          {value || '\u2014'}
        </span>
      )}
      <span className="text-[8px] tracking-[0.5px] uppercase text-[var(--color-muted)] font-medium leading-none">
        {label}{unit ? ` (${unit})` : ''}
      </span>
    </div>
  )
}

function ItemRow({ item, natspecMap, subCriteriaMap, onApproveItem, onRequestChange }) {
  const sel = item.project_selections || {}
  const attrs = sel.attributes || {}
  const st = STATUS_STYLES[item.approval_status] || STATUS_STYLES.not_applicable
  const colourBg = getColourBackground(attrs.colour)
  const Icon = KIND_ICONS[sel.selection_kind] || Package
  const isPending = item.approval_status === 'pending'
  const isChangeReq = item.approval_status === 'change_requested'
  const { code, name } = parseCode(sel.title || item.selection_title, attrs)
  const natspecCodes = (natspecMap && natspecMap[item.project_selection_id]) || []
  const elementType = sel.element_type || 'other'
  const specFields = (subCriteriaMap && subCriteriaMap[elementType]) || []

  return (
    <div className="rounded-lg border border-white/30 bg-white/10 hover:bg-white/40 transition-colors overflow-hidden">
      <div className="grid gap-3 px-4 py-3 items-start"
        style={{ gridTemplateColumns: '20px 48px minmax(120px, 1.5fr) minmax(80px, 1fr) 1fr 1fr 1fr 1fr auto' }}>
        {/* # */}
        <span className="text-[9px] font-mono text-[var(--color-muted)] pt-3 text-right tabular-nums">{item.display_order || ''}</span>
        {/* Thumbnail */}
        <div>
          {item.portal_image_url ? (
            <img src={item.portal_image_url} alt="" style={{
              width: 48, height: 48, borderRadius: 8, objectFit: 'cover',
              border: '1px solid rgba(0,0,0,0.06)',
            }} loading="lazy"
            onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div style="width:48px;height:48px;border-radius:8px;background:rgba(255,255,255,0.5);border:1px solid rgba(0,0,0,0.04)"></div>' }}
            />
          ) : colourBg ? (
            <div style={{ width: 48, height: 48, borderRadius: 8, background: colourBg, border: '1px solid rgba(0,0,0,0.06)' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} style={{ color: 'var(--color-border)' }} />
            </div>
          )}
        </div>
        {/* Identity: name + code + natspec */}
        <div className="min-w-0">
          <div className="font-medium leading-snug text-[var(--color-text)] text-[12px]">
            {name}
            {(attrs.product_url || attrs.image_url) && (
              <a href={attrs.product_url || attrs.image_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex ml-1 text-[var(--color-accent)] hover:text-[var(--color-text)] align-middle"
                title="View product" onClick={e => e.stopPropagation()}>
                <ArrowUpRight size={11} />
              </a>
            )}
          </div>
          {natspecCodes.length > 0 && (
            <span className="text-[8px] font-mono tracking-wider text-[var(--color-muted)] opacity-70 block">
              {natspecCodes.map(n => n.ref).join(' · ')}
            </span>
          )}
          {code && <span className="text-[9px] font-mono tracking-wider text-[var(--color-muted)] uppercase block mt-0.5">{code}</span>}
        </div>
        {/* Product name */}
        <SpecCell label="Product" value={sel.model} />
        {/* Element-specific spec fields — show first 4 from definitions */}
        {specFields.slice(0, 4).map(f => (
          <SpecCell key={f.key} label={f.label} unit={f.unit} value={attrs[f.key]}>
            {f.type === 'colour' && attrs[f.key] ? (
              <span className="text-[11px] text-[var(--color-text)] leading-snug flex items-center gap-1 break-words">
                <ColourDot colour={attrs[f.key]} />{attrs[f.key]}
              </span>
            ) : undefined}
          </SpecCell>
        ))}
        {/* Pad remaining columns if fewer than 4 spec fields */}
        {specFields.length < 4 && Array.from({ length: 4 - specFields.length }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {/* Status / actions */}
        <div className="flex items-start justify-end gap-1 pt-1">
          {(isPending || isChangeReq) && onApproveItem && (<>
            <button onClick={() => onApproveItem(item.id)} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(91,138,101,0.1)]" style={{ border: '1px solid rgba(91,138,101,0.3)', color: 'var(--color-approved)' }} title="Approve"><Check size={11} /></button>
            <button onClick={() => onRequestChange(item.id)} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(160,115,88,0.08)]" style={{ border: '1px solid rgba(232,232,229,0.8)', color: 'var(--color-muted)' }} title="Request change"><MessageSquare size={10} /></button>
          </>)}
          {!isPending && !isChangeReq && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{st.label}</span>
          )}
        </div>
      </div>
      {/* Second row: Brand + remaining spec fields */}
      <div className="grid gap-3 px-4 pb-2.5 items-start"
        style={{ gridTemplateColumns: '20px 48px minmax(120px, 1.5fr) minmax(80px, 1fr) 1fr 1fr 1fr 1fr auto' }}>
        <div /><div />
        <div />
        <SpecCell label="Brand" value={sel.manufacturer_name} />
        {specFields.slice(4, 8).map(f => (
          <SpecCell key={f.key} label={f.label} unit={f.unit} value={attrs[f.key]}>
            {f.type === 'colour' && attrs[f.key] ? (
              <span className="text-[11px] text-[var(--color-text)] leading-snug flex items-center gap-1 break-words">
                <ColourDot colour={attrs[f.key]} />{attrs[f.key]}
              </span>
            ) : undefined}
          </SpecCell>
        ))}
        {specFields.slice(4).length < 4 && Array.from({ length: 4 - Math.min(specFields.slice(4).length, 4) }).map((_, i) => (
          <div key={`pad2-${i}`} />
        ))}
        <div />
      </div>
    </div>
  )
}

/* ── Compact child/component row — same grid logic, indented ── */
function CompactChildRow({ item, natspecMap, subCriteriaMap, codeTitleMap, onApproveItem, onRequestChange }) {
  const sel = item.project_selections || {}
  const attrs = sel.attributes || {}
  const st = STATUS_STYLES[item.approval_status] || STATUS_STYLES.not_applicable
  const colourBg = getColourBackground(attrs.colour)
  const isPending = item.approval_status === 'pending'
  const isChangeReq = item.approval_status === 'change_requested'
  const roleLabel = ROLE_LABELS[sel.component_role] || sel.component_role?.replace(/_/g, ' ') || ''
  const { code } = parseCode(sel.title || item.selection_title, attrs)
  const elementType = sel.element_type || 'other'
  const specFields = (subCriteriaMap && subCriteriaMap[elementType]) || []

  return (
    <div className="rounded-md border border-white/20 bg-white/5 hover:bg-white/30 transition-colors overflow-hidden">
      <div className="grid gap-2 px-3 py-2 items-start text-[11px]"
        style={{ gridTemplateColumns: '28px minmax(100px, 1.2fr) minmax(60px, 0.8fr) 1fr 1fr 1fr 1fr auto' }}>
        {/* Thumbnail */}
        <div>
          {colourBg ? (
            <div style={{ width: 28, height: 28, borderRadius: 6, background: colourBg, border: '1px solid rgba(0,0,0,0.06)' }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={11} style={{ color: 'var(--color-border)' }} />
            </div>
          )}
        </div>
        {/* Identity */}
        <div className="min-w-0">
          <span className="text-[8px] tracking-[1px] uppercase text-[var(--color-muted)] font-medium block">{roleLabel}</span>
          <div className="font-medium leading-snug text-[var(--color-text)] text-[11px] break-words">{sel.title || item.selection_title}</div>
          {code && <span className="text-[8px] font-mono tracking-wider text-[var(--color-muted)] block">{code}{codeTitleMap && codeTitleMap[code] ? ` — ${codeTitleMap[code]}` : ''}</span>}
        </div>
        {/* Product */}
        <SpecCell label="Product" value={sel.model} />
        {/* First 4 spec fields from element type */}
        {specFields.slice(0, 4).map(f => (
          <SpecCell key={f.key} label={f.label} unit={f.unit} value={attrs[f.key]}>
            {f.type === 'colour' && attrs[f.key] ? (
              <span className="text-[10px] text-[var(--color-text)] leading-snug flex items-center gap-1 break-words">
                <ColourDot colour={attrs[f.key]} />{attrs[f.key]}
              </span>
            ) : undefined}
          </SpecCell>
        ))}
        {specFields.length < 4 && Array.from({ length: 4 - specFields.length }).map((_, i) => <div key={`cp-${i}`} />)}
        {/* Status */}
        <div className="flex items-center justify-end gap-1">
          {(isPending || isChangeReq) && onApproveItem && (
            <button onClick={() => onApproveItem(item.id)} className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[rgba(91,138,101,0.1)]" style={{ border: '1px solid rgba(91,138,101,0.3)', color: 'var(--color-approved)' }} title="Approve"><Check size={9} /></button>
          )}
          {!isPending && !isChangeReq && (
            <span className="text-[8px] font-medium px-1 py-0.5 rounded whitespace-nowrap" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{st.label}</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Selection card: Programa-style visual item with product image ── */
function SelectionCard({ item, natspecMap, codeTitleMap, onApprove, onRequestChange }) {
  const sel = item.project_selections || {}
  const attrs = sel.attributes || {}
  const isPending = item.approval_status === 'pending'
  const isApproved = item.approval_status === 'approved'
  const isChangeReq = item.approval_status === 'change_requested'
  const isConfirmed = item.approval_status === 'not_applicable'
  const st = STATUS_STYLES[item.approval_status] || STATUS_STYLES.not_applicable
  const productUrl = attrs.product_url || attrs.image_url
  const Icon = KIND_ICONS[sel.selection_kind] || Package
  const natspecCodes = (natspecMap && natspecMap[item.project_selection_id]) || []

  // Image pipeline: portal_image_url > colour swatch > kind icon
  const imageUrl = item.portal_image_url
  const colourBg = getColourBackground(attrs.colour)
  const hasVisual = imageUrl || colourBg

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl transition-all" style={{
      background: st.bg, border: `1px solid ${st.border}`,
    }}>
      {/* Visual thumbnail */}
      <div className="shrink-0" style={{ width: 72, height: 72 }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={sel.title || ''}
            style={{
              width: 72, height: 72, borderRadius: 10,
              objectFit: 'cover',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
            loading="lazy"
            onError={e => {
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML = colourBg
                ? `<div style="width:72px;height:72px;border-radius:10px;background:${colourBg};border:1px solid rgba(0,0,0,0.06)"></div>`
                : `<div style="width:72px;height:72px;border-radius:10px;background:rgba(255,255,255,0.6);border:1px solid rgba(0,0,0,0.04);display:flex;align-items:center;justify-content:center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div>`
            }}
          />
        ) : colourBg ? (
          <div style={{
            width: 72, height: 72, borderRadius: 10,
            background: colourBg,
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
            padding: 5,
          }}>
            <span style={{
              fontSize: 8, color: 'rgba(0,0,0,0.3)', fontWeight: 500,
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              {attrs.colour?.split(' ').slice(0, 2).join(' ')}
            </span>
          </div>
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: 10,
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} style={{ color: 'var(--color-border)' }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        {(() => { const { code, name } = parseCode(sel.title || item.selection_title, attrs); return (<>
          {code && (
            <span className="text-[9px] font-mono tracking-wider text-[var(--color-muted)] uppercase block mb-0.5">{code}
              {codeTitleMap && codeTitleMap[code] && (
                <span className="text-[8px] font-normal tracking-wider ml-1.5 opacity-70">{codeTitleMap[code]}</span>
              )}
            </span>
          )}
          {natspecCodes.length > 0 && (
            <span className="text-[8px] font-mono tracking-wider text-[var(--color-muted)] opacity-70 block mb-0.5">
              {natspecCodes.map(n => n.ref).join(' · ')}
            </span>
          )}
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-medium leading-snug">{name}</h3>
            {isApproved && <Check size={12} className="text-[var(--color-approved)] shrink-0" />}
          </div>
        </>)})()}

        {/* Sub-criteria fields */}
        {(() => { const dims = formatDimensions(attrs); return (
          <div className="grid gap-x-3 gap-y-1 mt-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))' }}>
            <SubField label="Product" value={sel.model || null} />
            <SubField label="Brand" value={sel.manufacturer_name || null} />
            {attrs.colour && (
              <SubField label="Colour">
                <span className="text-[11px] text-[var(--color-text)] leading-snug flex items-center gap-1">
                  <ColourDot colour={attrs.colour} />{attrs.colour}
                </span>
              </SubField>
            )}
            {(attrs.finish || attrs.sheen) && <SubField label="Finish" value={attrs.finish || attrs.sheen} />}
            {attrs.material && <SubField label="Material" value={attrs.material} />}
            {dims && <SubField label="Size" value={dims} />}
            {(attrs.qty || attrs.qty_est) && <SubField label="Qty" value={attrs.qty || attrs.qty_est} />}
          </div>
        )})()}

        {/* Notes */}
        {sel.notes && (
          <p className="text-[10px] text-[var(--color-text)] font-light mt-1.5 italic leading-relaxed">{sel.notes}</p>
        )}

        {/* Change request note */}
        {isChangeReq && item.approval_note && (
          <div className="flex items-start gap-1.5 mt-1.5 text-[11px]" style={{ color: 'var(--color-change)' }}>
            <AlertCircle size={11} className="mt-0.5 shrink-0" />
            <span>{item.approval_note}</span>
          </div>
        )}

        {/* Product link + confirmed label inline */}
        <div className="flex items-center gap-3 mt-1">
          {productUrl && (
            <a href={productUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-[var(--color-accent)] hover:underline">
              View product <ArrowUpRight size={9} />
            </a>
          )}
          {isConfirmed && (
            <span className="text-[10px] text-[var(--color-muted)]">Confirmed by architect</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={onApprove}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ border: '1px solid rgba(91,138,101,0.3)', color: 'var(--color-approved)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,138,101,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Approve"
          >
            <Check size={12} />
          </button>
          <button
            onClick={onRequestChange}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ border: '1px solid rgba(232,232,229,0.8)', color: 'var(--color-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-change)'; e.currentTarget.style.borderColor = 'rgba(160,115,88,0.3)' }}
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

/* ── Get a background colour/gradient for colour swatch thumbnail ── */
function getColourBackground(colour) {
  if (!colour) return null
  const c = colour.toLowerCase()
  // Return a CSS background for known colours — acts as visual swatch
  if (c.includes('natural white') || c === 'white') return 'linear-gradient(135deg, #F5F2EE 0%, #EDE9E3 100%)'
  if (c.includes('woodland grey')) return 'linear-gradient(135deg, #4A4B45 0%, #5A5B55 100%)'
  if (c.includes('southerly')) return 'linear-gradient(135deg, #8B9181 0%, #9AA18F 100%)'
  if (c.includes('satin chrome')) return 'linear-gradient(135deg, #C0C0C0 0%, #D5D5D0 100%)'
  if (c.includes('brushed nickel')) return 'linear-gradient(135deg, #B8B8B0 0%, #CDCDC5 100%)'
  if (c.includes('aged brass')) return 'linear-gradient(135deg, #B08D57 0%, #C9A76C 100%)'
  if (c.includes('warm grey') || c.includes('concrete') || c.includes('salt')) return 'linear-gradient(135deg, #A09E98 0%, #B5B3AD 100%)'
  if (c.includes('grey') || c.includes('gray')) return 'linear-gradient(135deg, #8A8A86 0%, #9E9E9A 100%)'
  if (c.includes('black')) return 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)'
  if (c.includes('clear') || c.includes('anodised')) return 'linear-gradient(135deg, #D4D4D0 0%, #E2E2DE 100%)'
  if (c.includes('neutral')) return 'linear-gradient(135deg, #E8E4DE 0%, #F0EDE7 100%)'
  if (c.includes('calacatta') || c.includes('white veined')) return 'linear-gradient(135deg, #F0EDE8 0%, #E8E4DD 50%, #F2EFEA 100%)'
  if (c.includes('polar white') || c.includes('laminex')) return 'linear-gradient(135deg, #FAFAFA 0%, #F0F0EE 100%)'
  return null
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

/* ── BoQ View ── */
function BoQView({ groupedData, natspecMap, codeTitleMap }) {
  // Calculate totals
  let grandLow = 0
  let grandHigh = 0

  return (
    <div className="space-y-3">
      {/* Summary card */}
      <div className="glass p-5">
        <div className="flex justify-between items-baseline mb-3">
          <h2 className="text-[13px] font-medium">Bill of Quantities Summary</h2>
          <div className="text-right">
            <span className="text-[11px] text-[var(--color-muted)]">Estimated range</span>
          </div>
        </div>
        {/* Per-group rows */}
        <div className="space-y-1">
          {groupedData.map(group => {
            let groupLow = 0
            let groupHigh = 0
            group.items.forEach(item => {
              const attrs = item.project_selections?.attributes || {}
              groupLow += parseFloat(attrs.cost_low) || 0
              groupHigh += parseFloat(attrs.cost_high) || 0
            })
            grandLow += groupLow
            grandHigh += groupHigh
            return (
              <div key={group.group_key} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-white/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tracking-[1px] uppercase text-[var(--color-muted)] w-6 text-center font-mono">
                    {group.items.length}
                  </span>
                  <span className="text-[12px] text-[var(--color-text)]">{group.group_name}</span>
                </div>
                <div className="text-[11px] text-[var(--color-text)] font-mono">
                  {groupLow > 0 || groupHigh > 0
                    ? `$${formatK(groupLow)} – $${formatK(groupHigh)}`
                    : <span className="text-[var(--color-muted)]">TBC</span>
                  }
                </div>
              </div>
            )
          })}
        </div>
        <div className="border-t border-[var(--color-border)] mt-3 pt-3 flex justify-between items-baseline">
          <span className="text-[12px] font-medium">Total estimated range</span>
          <span className="text-[14px] font-medium font-mono">
            ${formatK(grandLow)} – ${formatK(grandHigh)}
          </span>
        </div>
      </div>

      {/* Detailed items by group */}
      {groupedData.map(group => (
        <div key={group.group_key} className="glass-s overflow-hidden">
          <div className="px-4 py-3 border-b border-white/30">
            <h3 className="text-[12px] font-medium">{group.group_name}</h3>
          </div>
          <div className="divide-y divide-white/20">
            {group.items.map(item => {
              const sel = item.project_selections || {}
              const attrs = sel.attributes || {}
              const { code, name } = parseCode(sel.title, attrs)
              const nsCodes = natspecMap[item.project_selection_id] || []
              return (
                <div key={item.id} className="grid gap-2 px-4 py-2.5 text-[11px] items-center"
                  style={{ gridTemplateColumns: '60px 1fr 120px 100px' }}>
                  <div>
                    {code && <span className="font-mono text-[9px] text-[var(--color-muted)] block">{code}</span>}
                    {code && codeTitleMap && codeTitleMap[code] && (
                      <span className="text-[7px] uppercase tracking-wider text-[var(--color-muted)] opacity-70 block truncate">{codeTitleMap[code]}</span>
                    )}
                    {nsCodes.length > 0 && <span className="font-mono text-[8px] text-[var(--color-muted)] block opacity-70">{nsCodes[0]?.ref}</span>}
                  </div>
                  <div>
                    <span className="text-[var(--color-text)]">{name || sel.title}</span>
                    {attrs.size && <span className="text-[10px] text-[var(--color-muted)] ml-2">{attrs.size}</span>}
                  </div>
                  <div className="text-[10px] text-[var(--color-muted)]">
                    {attrs.quantity && attrs.unit ? `${attrs.quantity} ${attrs.unit}` : ''}
                  </div>
                  <div className="text-right font-mono text-[10px]">
                    {(attrs.cost_low || attrs.cost_high)
                      ? `$${formatK(parseFloat(attrs.cost_low) || 0)} – $${formatK(parseFloat(attrs.cost_high) || 0)}`
                      : <span className="text-[var(--color-muted)]">PS</span>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatK(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return n.toFixed(0)
}

/* ── Plan View ── */
function PlanView({ items, filteredItems, roomMappings, isArchitect, onApproveItem, onRequestChange, codeTitleMap, selectionCodeMap }) {
  const [selectedRoom, setSelectedRoom] = useState(null)

  // Filter items by selected room
  const roomItems = selectedRoom
    ? filteredItems.filter(item => {
        return roomMappings.some(m => m.project_selection_id === item.project_selection_id && m.room_key === selectedRoom)
      })
    : []

  return (
    <div>
      <InteractivePlan
        roomMappings={roomMappings}
        items={items}
        onSelectRoom={setSelectedRoom}
        selectedRoom={selectedRoom}
        isArchitect={isArchitect}
      />

      {/* Room selection list */}
      {selectedRoom && roomItems.length > 0 && (
        <div className="mt-4">
          <ScheduleView items={roomItems} natspecMap={{}} subCriteriaMap={{}} codeTitleMap={codeTitleMap} selectionCodeMap={selectionCodeMap} onApproveItem={onApproveItem} onRequestChange={onRequestChange} />
        </div>
      )}

      {selectedRoom && roomItems.length === 0 && (
        <div className="mt-4 text-center py-8 glass-t">
          <p className="text-[13px] text-[var(--color-text)] font-light">No selections mapped to this room yet.</p>
        </div>
      )}
    </div>
  )
}

/* ── Stat pill ── */
function Stat({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span className="text-[10px] text-[var(--color-text)] font-medium">{value} {label}</span>
    </div>
  )
}
