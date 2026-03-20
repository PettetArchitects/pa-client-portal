import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import {
  Check, ChevronDown, ChevronRight, MessageSquare, ArrowUpRight,
  ThumbsUp, Eye, EyeOff, Package, Palette, Wrench, AlertCircle,
  Home, Grid3X3,
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
  const [viewMode, setViewMode] = useState('review') // 'review', 'schedule', or 'rooms'
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'approved', 'confirmed'

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

  // Filter items
  const filteredItems = items.filter(i => {
    if (filter === 'all') return true
    if (filter === 'pending') return i.approval_status === 'pending' || i.approval_status === 'change_requested'
    if (filter === 'approved') return i.approval_status === 'approved'
    if (filter === 'confirmed') return i.approval_status === 'not_applicable'
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
        <div className="h-3 w-48 bg-white/30 rounded mb-8" />
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/30 rounded-xl mb-3" />)}
      </div>
    )
  }

  const viewTitle = viewMode === 'review' ? 'Decisions' : viewMode === 'rooms' ? 'By Room' : 'Finishes Schedule'

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-light tracking-tight mb-1">{viewTitle}</h1>
        <p className="text-sm text-[var(--color-muted)] font-light">
          {totalPending > 0
            ? `${totalPending} item${totalPending !== 1 ? 's' : ''} need your review`
            : totalApproved > 0
            ? 'All looking good \u2014 thank you'
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1 backdrop-blur-xl bg-white/30 rounded-lg p-0.5 border border-white/40">
          {[
            { key: 'review', label: 'Review' },
            { key: 'rooms', label: 'By Room', icon: Home },
            { key: 'schedule', label: 'Full schedule', icon: Grid3X3 },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => { setViewMode(m.key); setFilter('all') }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                viewMode === m.key
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {m.icon && <m.icon size={11} />}
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

      {/* Content by view mode */}
      {viewMode === 'rooms' ? (
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
      )}

      {((viewMode !== 'rooms' && groupedData.length === 0) || (viewMode === 'rooms' && roomGroupedData.length === 0)) && (
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
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/30 transition-colors"
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
                  <div className="px-5 py-3 border-t border-white/30 bg-white/20">
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
              {[sel.manufacturer_name, sel.model].filter(Boolean).join(' \u2014 ') || '\u2014'}
            </div>
            <div className="col-span-2 text-[var(--color-muted)] truncate flex items-center gap-1.5">
              {attrs.colour && (
                <>
                  <ColourDot colour={attrs.colour} />
                  {attrs.colour}
                </>
              )}
              {!attrs.colour && '\u2014'}
            </div>
            <div className="col-span-1">
              <span className="text-[9px] text-[var(--color-muted)] bg-white/40 px-1.5 py-0.5 rounded">
                {sel.selection_kind || '\u2014'}
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
