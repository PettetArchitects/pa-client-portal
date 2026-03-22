/* ── View components for Decisions page ── */
import { useState } from 'react'
import {
  Check, ChevronDown, ChevronRight, MessageSquare, ArrowUpRight,
  ThumbsUp, Package,
} from 'lucide-react'
import { ROOM_ICONS } from '../../components/SketchIcons'
import InteractivePlan from '../../components/InteractivePlan'
import {
  STATUS_STYLES, ROOM_CONFIG, HIERARCHY_ROLE_ORDER, ROLE_LABELS,
  getTopLevelAssemblyCode, parseCode, buildItemTree, getDominantElementType,
  formatK,
} from './constants'
import { SelectionCard, ColourDot, SpecCell } from './components'

/* ── Schedule view: tabular schedule with column headers ── */
export function ScheduleView({ items, natspecMap, subCriteriaMap, roomMappings, codeTitleMap, selectionCodeMap, codeHierarchyMap = {}, onApproveItem, onRequestChange }) {
  const tree = buildItemTree(items)
  const allItems = tree.flatMap(n => [n.item, ...n.children])
  const elementType = getDominantElementType(allItems)
  const specFields = (subCriteriaMap && subCriteriaMap[elementType]) || []
  const cols = specFields.slice(0, 5)

  const roomLookup = {}
  if (roomMappings) {
    roomMappings.forEach(m => {
      if (!roomLookup[m.project_selection_id]) roomLookup[m.project_selection_id] = []
      if (!roomLookup[m.project_selection_id].includes(m.room_key)) {
        roomLookup[m.project_selection_id].push(m.room_key)
      }
    })
  }

  const colTemplate = `56px 44px minmax(120px, 2fr) minmax(70px, 1fr) minmax(80px, 1.2fr) minmax(70px, 1fr) ${cols.map(() => 'minmax(70px, 1fr)').join(' ')} 76px`

  return (
    <div className="py-2 -mx-2 overflow-x-auto">
      <div className="min-w-[700px] px-2">
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

      {tree.map(node => {
        const sel = node.item.project_selections || {}
        const attrs = sel.attributes || {}
        const st = STATUS_STYLES[node.item.approval_status] || STATUS_STYLES.not_applicable
        const { code: rawCode, name } = parseCode(sel.title || node.item.selection_title, attrs)
        const code = rawCode || (selectionCodeMap && selectionCodeMap[node.item.project_selection_id]) || null
        const natspecCodes = (natspecMap && natspecMap[node.item.project_selection_id]) || []
        const isPending = node.item.approval_status === 'pending'
        const isChangeReq = node.item.approval_status === 'change_requested'
        const colValues = cols.map(col => attrs[col.key] || null)

        const itemRooms = roomLookup[node.item.project_selection_id] || []
        const roomLabels = itemRooms.map(k => ROOM_CONFIG[k]?.label || k.replace(/_/g, ' ')).join(', ')

        return (
          <div key={node.item.id}>
            <div className={`grid gap-2 px-3 py-2.5 items-center text-[11px] border-b border-white/15 hover:bg-white/30 transition-colors ${node.children.length > 0 ? 'font-medium' : ''}`}
              style={{ gridTemplateColumns: colTemplate }}>
              <div className="min-w-0">
                <span className="text-[9px] font-mono tracking-wider text-[var(--color-text)] uppercase font-medium block">{code || '\u2014'}</span>
                {code && codeTitleMap && codeTitleMap[code] && (
                  <span className="text-[7px] uppercase tracking-wider text-[var(--color-muted)] leading-tight block truncate">{codeTitleMap[code]}</span>
                )}
                {code && codeHierarchyMap[code]?.role && (
                  <span className="text-[6px] uppercase tracking-[0.8px] text-[var(--color-muted)] opacity-60 leading-tight block mt-0.5">{ROLE_LABELS[codeHierarchyMap[code].role] || codeHierarchyMap[code].role}</span>
                )}
              </div>
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
                    {natspecCodes.map(n => n.ref).join(' \u00b7 ')}
                  </span>
                )}
              </div>
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
                    <button onClick={() => onApproveItem(node.item.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-[rgba(91,138,101,0.1)]" style={{ border: '1px solid rgba(91,138,101,0.3)', color: 'var(--color-approved)' }} title="Approve" aria-label="Approve"><Check size={9} /></button>
                    <button onClick={() => onRequestChange(node.item.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-[rgba(160,115,88,0.08)]" style={{ border: '1px solid rgba(232,232,229,0.8)', color: 'var(--color-muted)' }} title="Request change" aria-label="Request change"><MessageSquare size={9} /></button>
                  </div>
                ) : (
                  <span className="text-[8px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{st.label}</span>
                )}
              </div>
            </div>

            {/* Children rows */}
            {node.children.map(child => {
              const cSel = child.project_selections || {}
              const cAttrs = cSel.attributes || {}
              const cSt = STATUS_STYLES[child.approval_status] || STATUS_STYLES.not_applicable
              const { code: cCodeRaw } = parseCode(cSel.title || child.selection_title, cAttrs)
              const cCode = cCodeRaw || (selectionCodeMap && selectionCodeMap[child.project_selection_id]) || null
              const cCodeRole = cCode ? codeHierarchyMap[cCode]?.role : null
              const cRole = ROLE_LABELS[cCodeRole || cSel.component_role] || (cCodeRole || cSel.component_role)?.replace(/_/g, ' ') || ''
              const cIsPending = child.approval_status === 'pending'
              const cIsChange = child.approval_status === 'change_requested'
              const cColValues = cols.map(col => cAttrs[col.key] || null)
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
                    {cCode && codeHierarchyMap[cCode]?.role && (
                      <span className="text-[6px] uppercase tracking-[0.8px] text-[var(--color-muted)] opacity-50 leading-tight block mt-0.5">{ROLE_LABELS[codeHierarchyMap[cCode].role] || codeHierarchyMap[cCode].role}</span>
                    )}
                  </div>
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
                      <button onClick={() => onApproveItem(child.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-[rgba(91,138,101,0.1)]" style={{ border: '1px solid rgba(91,138,101,0.3)', color: 'var(--color-approved)' }} title="Approve" aria-label="Approve"><Check size={9} /></button>
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

/* ── Review view: card-based with approve/change actions ── */
export function ReviewView({ items, groupKey, hasPending, pendingCount, onApproveItem, onApproveGroup, onRequestChange, codeTitleMap }) {
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
            aria-label={`Approve all ${pendingCount} items`}
          >
            <ThumbsUp size={13} /> Approve all {pendingCount} items
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Room-grouped view ── */
export function RoomGroupedView({ rooms, expandedGroups, toggleGroup, onApproveItem, onApproveRoom, onRequestChange, natspecMap, codeTitleMap }) {
  return (
    <div className="space-y-3">
      {rooms.map(room => {
        const isExpanded = expandedGroups.has(room.roomKey)
        const hasPending = room.pending > 0 || room.changeReq > 0

        return (
          <div key={room.roomKey} className={`glass-s rounded-xl border overflow-hidden transition-all ${
            hasPending ? 'border-[var(--color-pending)]/30' : 'border-white/40'
          }`}>
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
                    {room.elements.map(e => e.label).join(' \u00b7 ')}
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
                <div className="w-12 h-1 bg-white/40 rounded-full overflow-hidden" role="progressbar" aria-valuenow={room.total > 0 ? Math.round(((room.approved + room.confirmed) / room.total) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-[var(--color-approved)]/60" style={{
                    width: `${room.total > 0 ? ((room.approved + room.confirmed) / room.total) * 100 : 0}%`
                  }} />
                </div>
                {isExpanded
                  ? <ChevronDown size={14} className="text-[var(--color-muted)]" />
                  : <ChevronRight size={14} className="text-[var(--color-muted)]" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-white/30">
                {room.elements.map(el => (
                  <div key={el.type}>
                    <div className="px-5 py-2 bg-white/10 border-b border-white/20">
                      <span className="text-[10px] tracking-[1.5px] uppercase text-[var(--color-muted)] font-medium">
                        {el.label}
                      </span>
                      <span className="text-[9px] text-[var(--color-muted)] ml-2">
                        {el.items.length}
                      </span>
                    </div>
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

                {hasPending && room.pending > 0 && (
                  <div className="px-5 py-3 border-t border-white/30 bg-white/40">
                    <button
                      onClick={() => onApproveRoom(room.roomKey)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-white text-[12px] rounded-lg hover:opacity-90 transition-opacity font-medium"
                      aria-label={`Approve all ${room.pending} items in ${room.label}`}
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

/* ── Component-grouped view: by IFC family ── */
export function ComponentGroupedView({ components, expandedGroups, toggleGroup, onApproveItem, onRequestChange, natspecMap, subCriteriaMap, codeTitleMap, selectionCodeMap, codeHierarchyMap = {} }) {
  return (
    <div className="space-y-3">
      {components.map(comp => {
        const isExpanded = expandedGroups.has(comp.parentId)
        const hasPending = comp.pending > 0 || comp.changeReq > 0

        return (
          <div key={comp.parentId} className={`glass-s rounded-xl border overflow-hidden transition-all ${
            hasPending ? 'border-[var(--color-pending)]/30' : 'border-white/40'
          }`}>
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
                <div className="w-12 h-1 bg-white/40 rounded-full overflow-hidden" role="progressbar" aria-valuenow={comp.total > 0 ? Math.round(((comp.approved + comp.confirmed) / comp.total) * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-[var(--color-approved)]/60" style={{
                    width: `${comp.total > 0 ? ((comp.approved + comp.confirmed) / comp.total) * 100 : 0}%`
                  }} />
                </div>
                {isExpanded
                  ? <ChevronDown size={14} className="text-[var(--color-muted)]" />
                  : <ChevronRight size={14} className="text-[var(--color-muted)]" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-white/30">
                <ScheduleView items={comp.children} natspecMap={natspecMap} subCriteriaMap={subCriteriaMap} codeTitleMap={codeTitleMap} selectionCodeMap={selectionCodeMap} codeHierarchyMap={codeHierarchyMap} onApproveItem={onApproveItem} onRequestChange={onRequestChange} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Code hierarchy view: assemblies as section headers ── */
export function CodeHierarchyView({ items, codeHierarchyMap, codeTitleMap, selectionCodeMap, natspecMap, onApproveItem, onRequestChange }) {
  const resolveCode = (item) =>
    selectionCodeMap[item.project_selection_id] ||
    item.project_selections?.attributes?.code ||
    null

  const roleIndex = (code) => {
    const role = codeHierarchyMap[code]?.role || 'product'
    const i = HIERARCHY_ROLE_ORDER.indexOf(role)
    return i === -1 ? 99 : i
  }

  const assemblyMap = {}
  const generalItems = []

  items.forEach(item => {
    const code = resolveCode(item)
    if (!code) { generalItems.push(item); return }
    const topAssembly = getTopLevelAssemblyCode(code, codeHierarchyMap)
    if (!topAssembly) { generalItems.push(item); return }
    if (!assemblyMap[topAssembly]) {
      const info = codeHierarchyMap[topAssembly]
      assemblyMap[topAssembly] = { code: topAssembly, title: info?.title || topAssembly, items: [] }
    }
    assemblyMap[topAssembly].items.push({ item, code })
  })

  const assemblyGroups = Object.values(assemblyMap)
  assemblyGroups.forEach(g =>
    g.items.sort((a, b) => roleIndex(a.code) - roleIndex(b.code))
  )

  const hasContent = assemblyGroups.length > 0 || generalItems.length > 0

  return (
    <div className="space-y-6">
      {assemblyGroups.map(group => (
        <section key={group.code}>
          <div className="pt-2 border-t border-white/30 mb-4">
            <div className="flex items-baseline justify-between py-2 px-1">
              <div>
                <span className="text-[9px] font-mono tracking-[1.5px] text-[var(--color-muted)] uppercase block mb-0.5">
                  {group.code}
                  <span className="ml-2 text-[8px] tracking-wide opacity-50 normal-case font-sans">Assembly</span>
                </span>
                <h2 className="text-[13px] font-medium">{group.title}</h2>
              </div>
              <span className="text-[12px] text-[var(--color-muted)]">{group.items.length} items</span>
            </div>
          </div>
          <div className="space-y-2 px-1">
            {group.items.map(({ item }) => (
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
        </section>
      ))}

      {generalItems.length > 0 && (
        <section>
          <div className="pt-2 border-t border-white/30 mb-4">
            <div className="flex items-baseline justify-between py-2 px-1">
              <h2 className="text-[13px] font-normal text-[var(--color-muted)]">General</h2>
              <span className="text-[12px] text-[var(--color-muted)]">{generalItems.length} items</span>
            </div>
          </div>
          <div className="space-y-2 px-1">
            {generalItems.map(item => (
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
        </section>
      )}

      {!hasContent && (
        <div className="text-center py-20 glass-t rounded-xl border border-white/40">
          <Package size={24} className="mx-auto text-[var(--color-border)] mb-3" />
          <p className="text-[13px] text-[var(--color-text)] font-light">No items match this filter.</p>
        </div>
      )}
    </div>
  )
}

/* ── BoQ View ── */
export function BoQView({ groupedData, natspecMap, codeTitleMap }) {
  let grandLow = 0
  let grandHigh = 0

  return (
    <div className="space-y-3">
      <div className="glass p-5">
        <div className="flex justify-between items-baseline mb-3">
          <h2 className="text-[13px] font-medium">Bill of Quantities Summary</h2>
          <div className="text-right">
            <span className="text-[11px] text-[var(--color-muted)]">Estimated range</span>
          </div>
        </div>
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
                    ? `$${formatK(groupLow)} \u2013 $${formatK(groupHigh)}`
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
            ${formatK(grandLow)} \u2013 ${formatK(grandHigh)}
          </span>
        </div>
      </div>

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
                      ? `$${formatK(parseFloat(attrs.cost_low) || 0)} \u2013 $${formatK(parseFloat(attrs.cost_high) || 0)}`
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

/* ── Plan View ── */
export function PlanView({ items, filteredItems, roomMappings, isArchitect, onApproveItem, onRequestChange, codeTitleMap, selectionCodeMap, codeHierarchyMap = {} }) {
  const [selectedRoom, setSelectedRoom] = useState(null)

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

      {selectedRoom && roomItems.length > 0 && (
        <div className="mt-4">
          <ScheduleView items={roomItems} natspecMap={{}} subCriteriaMap={{}} codeTitleMap={codeTitleMap} selectionCodeMap={selectionCodeMap} codeHierarchyMap={codeHierarchyMap} onApproveItem={onApproveItem} onRequestChange={onRequestChange} />
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
