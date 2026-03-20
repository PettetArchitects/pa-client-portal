import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import {
  Check, ChevronDown, ChevronRight, MessageSquare, ArrowUpRight,
  ThumbsUp, Eye, EyeOff, Package, Palette, Wrench, AlertCircle,
  Home, Grid3X3, FileDown, ArrowUpDown, SlidersHorizontal, Search,
  List, LayoutGrid, Map,
} from 'lucide-react'
import { GROUP_ICONS } from '../components/SketchIcons'
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
  pending: { bg: 'rgba(212,160,23,0.08)', border: 'rgba(212,160,23,0.3)', text: 'var(--color-pending)', label: 'Needs your input' },
  approved: { bg: 'rgba(61,139,64,0.06)', border: 'rgba(61,139,64,0.2)', text: 'var(--color-approved)', label: 'Approved' },
  change_requested: { bg: 'rgba(191,54,12,0.06)', border: 'rgba(191,54,12,0.25)', text: 'var(--color-change)', label: 'Change requested' },
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
  whole_house: { label: 'Whole House', order: 99, emoji: '' },
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
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [roomMappings, setRoomMappings] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [viewMode, setViewMode] = useState('schedule') // 'schedule', 'review', or 'rooms'
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'approved', 'confirmed'
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('group') // 'group', 'title', 'status'
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    if (!projectId) return
    loadData()
  }, [projectId])

  async function loadData() {
    const [grpRes, selRes, roomRes] = await Promise.all([
      supabase.from('schedule_groups').select('*').eq('project_id', projectId).eq('visible_to_homeowner', true).order('display_order'),
      supabase.from('homeowner_selections_portal').select(`
        *,
        project_selections:project_selection_id (
          title, selection_kind, manufacturer_name, supplier_name, model, spec_reference, notes, attributes
        )
      `).eq('project_id', projectId).eq('active', true),
      supabase.from('portal_selection_rooms').select('*').eq('project_id', projectId),
    ])
    setGroups(grpRes.data || [])
    setItems(selRes.data || [])
    setRoomMappings(roomRes.data || [])
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

  async function handleApproveRoom(roomKey) {
    // Find all pending items in this room
    const roomSelIds = new Set(
      roomMappings.filter(m => m.room_key === roomKey).map(m => m.project_selection_id)
    )
    const pending = items.filter(i =>
      roomSelIds.has(i.project_selection_id) && i.approval_status === 'pending'
    )
    const ids = pending.map(i => i.id)
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
    const allItems = items.filter(i => i.schedule_group === g.group_key)
    const pending = allItems.filter(i => i.approval_status === 'pending').length
    const approved = allItems.filter(i => i.approval_status === 'approved').length
    const confirmed = allItems.filter(i => i.approval_status === 'not_applicable').length
    const changeReq = allItems.filter(i => i.approval_status === 'change_requested').length
    return { ...g, items: gItems, pending, approved, confirmed, changeReq, total: allItems.length }
  }).filter(g => g.items.length > 0)

  // Build room-grouped data (for rooms mode)
  const roomGroupedData = buildRoomGroups(filteredItems, items, roomMappings)

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

  const viewTitle = viewMode === 'schedule' ? 'Selections' : viewMode === 'plan' ? 'Floor Plan' : viewMode === 'rooms' ? 'By Room' : 'Review'

  return (
    <div className="max-w-4xl">
      {/* Progress bar */}
      <div className="backdrop-blur-xl bg-white/60 rounded-xl border border-white/40 p-4 mb-6">
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

      {/* Toolbar — Programa style */}
      <div className="flex items-center justify-between mb-4 backdrop-blur-xl bg-white/40 rounded-xl border border-white/30 px-2 py-1.5 relative z-30">
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
          <button
            onClick={() => setSortBy(s => s === 'title' ? 'status' : s === 'status' ? 'group' : 'title')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40 transition-colors"
            title={`Sort by: ${sortBy}`}
          >
            <ArrowUpDown size={13} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowFilter(f => !f)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                filter !== 'all' ? 'text-[var(--color-text)] bg-white/40' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40'
              }`}
            >
              <SlidersHorizontal size={13} />
            </button>
            {showFilter && (
              <div className="absolute top-full left-0 mt-1 backdrop-blur-2xl bg-white/95 rounded-lg border border-white/60 shadow-xl py-1 z-50 min-w-[140px]">
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
            onClick={() => { setViewMode('schedule'); setFilter(filter) }}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'schedule' ? 'bg-white/30 text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40'
            }`}
            title="List view"
          >
            <List size={15} />
          </button>
          <button
            onClick={() => { setViewMode('review'); setFilter(filter) }}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'review' ? 'bg-white/30 text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40'
            }`}
            title="Card view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => { setViewMode('plan'); setFilter(filter) }}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'plan' ? 'bg-white/30 text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/40'
            }`}
            title="Plan view"
          >
            <Map size={15} />
          </button>
        </div>
      </div>

      {/* Content by view mode */}
      {viewMode === 'plan' ? (
        <PlanView
          items={items}
          filteredItems={filteredItems}
          roomMappings={roomMappings}
          isArchitect={isArchitect}
          onApproveItem={handleApproveItem}
          onRequestChange={handleRequestChange}
        />
      ) : viewMode === 'rooms' ? (
        <RoomGroupedView
          rooms={roomGroupedData}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          onApproveItem={handleApproveItem}
          onApproveRoom={handleApproveRoom}
          onRequestChange={handleRequestChange}
        />
      ) : (
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
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const GroupIcon = GROUP_ICONS[group.group_key]
                      return GroupIcon ? <GroupIcon size={32} className="text-[var(--color-muted)] shrink-0" /> : null
                    })()}
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-medium">{group.group_name}</h2>
                        <span className="text-[10px] text-[var(--color-muted)] bg-white/50 px-1.5 py-0.5 rounded">
                          {group.items.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-muted)] font-light mt-0.5">{group.description}</p>
                    </div>
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
                      <ScheduleView items={group.items} onApproveItem={handleApproveItem} onRequestChange={handleRequestChange} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {((viewMode !== 'rooms' && groupedData.length === 0) || (viewMode === 'rooms' && roomGroupedData.length === 0)) && (
        <div className="text-center py-20 backdrop-blur-xl bg-white/40 rounded-xl border border-white/40">
          <Package size={24} className="mx-auto text-[var(--color-border)] mb-3" />
          <p className="text-sm text-[var(--color-muted)] font-light">
            {filter !== 'all' ? 'No items match this filter.' : 'No selections yet.'}
          </p>
        </div>
      )}
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

/* ── Room-grouped view ── */
function RoomGroupedView({ rooms, expandedGroups, toggleGroup, onApproveItem, onApproveRoom, onRequestChange }) {
  return (
    <div className="space-y-3">
      {rooms.map(room => {
        const isExpanded = expandedGroups.has(room.roomKey)
        const hasPending = room.pending > 0 || room.changeReq > 0

        return (
          <div key={room.roomKey} className={`backdrop-blur-xl bg-white/40 rounded-xl border overflow-hidden transition-all ${
            hasPending ? 'border-[var(--color-pending)]/30' : 'border-white/40'
          }`}>
            {/* Room header */}
            <button
              onClick={() => toggleGroup(room.roomKey)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center">
                  <Home size={14} className="text-[var(--color-muted)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-medium">{room.label}</h2>
                    <span className="text-[10px] text-[var(--color-muted)] bg-white/50 px-1.5 py-0.5 rounded">
                      {room.totalVisible}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted)] font-light mt-0.5">
                    {room.elements.map(e => e.label).join(' \u00b7 ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {room.pending > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{
                    background: 'rgba(212,160,23,0.1)', color: 'var(--color-pending)'
                  }}>
                    {room.pending} to review
                  </span>
                )}
                {room.changeReq > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{
                    background: 'rgba(191,54,12,0.1)', color: 'var(--color-change)'
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
                      className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white text-xs rounded-lg hover:opacity-90 transition-opacity font-medium"
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
        <div className="px-5 py-3 border-t border-white/30 bg-white/40">
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

/* ── Parse code from title: "MX1 — Shower mixer" → { code: "MX1", name: "Shower mixer" } ── */
function parseCode(title) {
  if (!title) return { code: null, name: title }
  // Match patterns: "CODE — Name" or "CODE - Name" where CODE is alphanumeric with dots
  const m = title.match(/^([A-Z][A-Z0-9]*(?:\.[0-9]+)?)\s*[—–\-]\s*(.+)$/i)
  if (m) return { code: m[1], name: m[2] }
  // Match "Joinery J01.1" style
  const j = title.match(/^Joinery\s+(J\d+(?:\.\d+)?)\s*$/i)
  if (j) return { code: j[1], name: 'Joinery' }
  return { code: null, name: title }
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

function groupItemsByKind(items) {
  const kindMap = {}
  items.forEach(item => {
    const sel = item.project_selections || {}
    // Components group under their parent kind label
    const kind = sel.is_component ? 'finish' : (sel.selection_kind || 'other')
    if (!kindMap[kind]) kindMap[kind] = []
    kindMap[kind].push(item)
  })
  return Object.entries(kindMap)
    .map(([kind, kindItems]) => ({
      kind,
      label: KIND_GROUP_LABELS[kind] || kind.replace(/_/g, ' '),
      order: KIND_GROUP_ORDER[kind] || 99,
      items: kindItems,
    }))
    .sort((a, b) => a.order - b.order)
}

/* ── Schedule view: clean tabular list with codes above items, sub-grouped by kind ── */
function ScheduleView({ items, onApproveItem, onRequestChange }) {
  const subGroups = groupItemsByKind(items)
  const needsSubHeaders = subGroups.length > 1

  return (
    <div className="px-4 py-3 space-y-1">
      {subGroups.map(sg => (
        <div key={sg.kind}>
          {needsSubHeaders && (
            <div className="px-1 pt-3 pb-1.5 first:pt-0">
              <span className="text-[9px] tracking-[1.5px] uppercase text-[var(--color-muted)] font-medium">
                {sg.label}
              </span>
              <span className="text-[9px] text-[var(--color-muted)] ml-1.5 font-light">{sg.items.length}</span>
            </div>
          )}
          <div className="space-y-2">
            {sg.items.map(item => {
              const sel = item.project_selections || {}
              const attrs = sel.attributes || {}
              const st = STATUS_STYLES[item.approval_status] || STATUS_STYLES.not_applicable
              const colourBg = getColourBackground(attrs.colour)
              const Icon = KIND_ICONS[sel.selection_kind] || Package
              const isPending = item.approval_status === 'pending'
              const isChangeReq = item.approval_status === 'change_requested'
              const { code, name } = parseCode(sel.title || item.selection_title)
              return (
                <div key={item.id} className="grid gap-3 px-4 py-3.5 text-[12px] rounded-lg border border-white/30 bg-white/10 hover:bg-white/40 transition-colors items-start"
                  style={{ gridTemplateColumns: '48px 2.5fr 3fr 1.5fr 100px' }}>
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
                      <div style={{
                        width: 48, height: 48, borderRadius: 8,
                        background: colourBg, border: '1px solid rgba(0,0,0,0.06)',
                      }} />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: 8,
                        background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={16} style={{ color: 'var(--color-border)' }} />
                      </div>
                    )}
                  </div>
                  <div>
                    {code && (
                      <span className="text-[9px] font-mono tracking-wider text-[var(--color-muted)] uppercase block mb-0.5">{code}</span>
                    )}
                    <div className="font-medium leading-snug text-[var(--color-text)]">{name}</div>
                    {!code && sel.selection_kind && (
                      <span className="text-[9px] text-[var(--color-muted)] mt-0.5 inline-block">{sel.selection_kind.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                  <div className="text-[11px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
                    {sel.manufacturer_name && <span className="font-medium text-[var(--color-text)]">{sel.manufacturer_name}</span>}
                    {sel.manufacturer_name && sel.model && <br />}
                    <span className="text-[var(--color-muted)]">{sel.model || (!sel.manufacturer_name && '\u2014')}</span>
                  </div>
                  <div className="text-[11px] text-[var(--color-text)] flex items-start gap-1.5" style={{ wordBreak: 'break-word' }}>
                    {attrs.colour && (
                      <>
                        <ColourDot colour={attrs.colour} />
                        <span className="leading-snug">{attrs.colour}</span>
                      </>
                    )}
                    {!attrs.colour && <span className="text-[var(--color-muted)]">{'\u2014'}</span>}
                  </div>
                  <div className="text-right flex items-start justify-end gap-1">
                    {(isPending || isChangeReq) && onApproveItem && (
                      <>
                        <button
                          onClick={() => onApproveItem(item.id)}
                          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(61,139,64,0.1)]"
                          style={{ border: '1px solid rgba(61,139,64,0.3)', color: 'var(--color-approved)' }}
                          title="Approve"
                        >
                          <Check size={11} />
                        </button>
                        <button
                          onClick={() => onRequestChange(item.id)}
                          className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(191,54,12,0.08)]"
                          style={{ border: '1px solid rgba(232,232,229,0.8)', color: 'var(--color-muted)' }}
                          title="Request change"
                        >
                          <MessageSquare size={10} />
                        </button>
                      </>
                    )}
                    {!isPending && !isChangeReq && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap" style={{
                        background: st.bg, color: st.text, border: `1px solid ${st.border}`
                      }}>
                        {st.label}
                      </span>
                    )}
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

/* ── Selection card: Programa-style visual item with product image ── */
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
        {(() => { const { code, name } = parseCode(sel.title || item.selection_title); return (<>
          {code && (
            <span className="text-[9px] font-mono tracking-wider text-[var(--color-muted)] uppercase block mb-0.5">{code}</span>
          )}
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-medium leading-snug">{name}</h3>
            {isApproved && <Check size={12} className="text-[var(--color-approved)] shrink-0" />}
          </div>
        </>)})()}

        {/* Product details */}
        <div className="mt-1" style={{ wordBreak: 'break-word' }}>
          {sel.manufacturer_name && (
            <span className="text-[11px] text-[var(--color-muted)]">{sel.manufacturer_name}</span>
          )}
          {sel.model && (
            <p className="text-[11px] text-[var(--color-text)] leading-relaxed mt-0.5">{sel.model}</p>
          )}
        </div>

        {/* Colour chip — only if no colour swatch thumbnail */}
        {attrs.colour && !colourBg && (
          <div className="flex items-start gap-1.5 mt-1.5">
            <ColourDot colour={attrs.colour} />
            <span className="text-[10px] text-[var(--color-muted)] leading-snug">{attrs.colour}</span>
          </div>
        )}

        {/* Notes */}
        {sel.notes && (
          <p className="text-[10px] text-[var(--color-muted)] font-light mt-1.5 italic leading-relaxed">{sel.notes}</p>
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

/* ── Plan View ── */
function PlanView({ items, filteredItems, roomMappings, isArchitect, onApproveItem, onRequestChange }) {
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
          <ScheduleView items={roomItems} onApproveItem={onApproveItem} onRequestChange={onRequestChange} />
        </div>
      )}

      {selectedRoom && roomItems.length === 0 && (
        <div className="mt-4 text-center py-8 glass-t">
          <p className="text-sm text-[var(--color-muted)] font-light">No selections mapped to this room yet.</p>
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
