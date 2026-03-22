/* ── Decisions constants and pure helper functions ── */

export const STATUS_STYLES = {
  pending: { bg: 'rgba(196,162,101,0.08)', border: 'rgba(196,162,101,0.3)', text: 'var(--color-pending)', label: 'Needs your input' },
  approved: { bg: 'rgba(91,138,101,0.06)', border: 'rgba(91,138,101,0.2)', text: 'var(--color-approved)', label: 'Approved' },
  change_requested: { bg: 'rgba(160,115,88,0.06)', border: 'rgba(160,115,88,0.25)', text: 'var(--color-change)', label: 'Change requested' },
  not_applicable: { bg: 'rgba(255,255,255,0.3)', border: 'rgba(232,232,229,0.6)', text: 'var(--color-muted)', label: 'Confirmed' },
}

export const ROOM_CONFIG = {
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

export const ELEMENT_ORDER = {
  floor: 1, wall: 2, ceiling: 3, joinery: 4, sanitary: 5,
  tapware: 6, fixture: 7, fitting: 8, hardware: 9, door: 10,
  window: 11, product: 12, finish: 13, trim: 14, services: 15,
  mechanical: 16, exterior: 17, general: 18, other: 19,
}

export const ELEMENT_LABELS = {
  floor: 'Floor', wall: 'Wall', ceiling: 'Ceiling', joinery: 'Joinery',
  sanitary: 'Sanitary', tapware: 'Tapware', fixture: 'Fixtures', fitting: 'Fittings',
  hardware: 'Hardware', door: 'Doors', window: 'Windows', product: 'Products',
  finish: 'Finishes', trim: 'Trim', services: 'Services', mechanical: 'Mechanical',
  exterior: 'Exterior', general: 'General', other: 'Other',
}

export const HIERARCHY_ROLE_ORDER = ['finish', 'colour', 'hardware', 'accessory', 'product']

export const IFC_FAMILIES = {
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

export const KIND_GROUP_ORDER = {
  joinery_item: 1, door_type: 2, window_type: 3, facade_system: 4,
  product: 5, hardware_set: 6, material: 7, finish: 8, other: 9,
}

export const KIND_GROUP_LABELS = {
  joinery_item: 'Joinery Items', door_type: 'Doors', window_type: 'Windows',
  facade_system: 'Facade', product: 'Products', hardware_set: 'Hardware',
  material: 'Materials', finish: 'Finishes', other: 'Other',
}

export const ROLE_LABELS = {
  hardware: 'Hardware', hinge: 'Hinge', finish_internal: 'Finish', finish_external: 'Finish',
  closer: 'Lock / Closer', threshold: 'Threshold', accessory: 'Accessory', carcass: 'Carcass',
  door_front: 'Door Front', drawer_front: 'Drawer', benchtop: 'Benchtop', edge_band: 'Edge Band',
  shelf: 'Shelf', frame: 'Frame', glazing: 'Glazing', other: 'Other',
}

/* ── Pure helper functions ── */

// Walk up codeHierarchyMap to find the root assembly (no parent).
// Guards against circular refs. Returns null if code isn't in the map.
export function getTopLevelAssemblyCode(code, codeHierarchyMap) {
  let current = code
  const seen = new Set()
  while (current && !seen.has(current)) {
    seen.add(current)
    const info = codeHierarchyMap[current]
    if (!info) return null
    if (!info.parent_canonical_code) return current
    current = info.parent_canonical_code
  }
  return null // circular reference guard
}

// Parse code from title: "MX1 — Shower mixer" → { code: "MX1", name: "Shower mixer" }
export function parseCode(title, attrs) {
  const sysCode = attrs?.code || null
  if (!title) return { code: sysCode, name: title }
  const m = title.match(/^([A-Z][A-Z0-9]*(?:\.[0-9]+)?)\s*[—–\-]\s*(.+)$/i)
  if (m) return { code: sysCode || m[1], name: m[2] }
  const j = title.match(/^Joinery\s+(J\d+(?:\.\d+)?)\s*$/i)
  if (j) return { code: sysCode || j[1], name: 'Joinery' }
  return { code: sysCode, name: title }
}

// Derive IFC family from selection data
export function deriveIfcFamily(item) {
  const sel = item.project_selections || {}
  const attrs = sel.attributes || {}
  const title = (sel.title || '').toLowerCase()
  const kind = sel.selection_kind || ''
  const role = sel.component_role || ''
  const group = item.schedule_group || ''

  if (attrs.ifc_class && IFC_FAMILIES[attrs.ifc_class]) return attrs.ifc_class

  if (kind === 'door_type') return 'IfcDoor'
  if (kind === 'window_type') return 'IfcWindow'
  if (kind === 'facade_system') return 'IfcWall'
  if (kind === 'joinery_item') return 'IfcFurniture'

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

  if (role === 'insulation' || role === 'membrane' || role === 'lining' || role === 'substrate') return 'IfcCovering'
  if (role === 'finish_internal' || role === 'finish_external' || role === 'accent') return 'IfcCovering'
  if (role === 'hardware' || role === 'hinge' || role === 'closer') return 'IfcBuildingElementProxy'

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

// Build room-grouped data structure
export function buildRoomGroups(filteredItems, allItems, roomMappings) {
  const itemBySelId = {}
  allItems.forEach(i => { itemBySelId[i.project_selection_id] = i })

  const filteredIds = new Set(filteredItems.map(i => i.project_selection_id))

  const roomMap = {}
  roomMappings.forEach(m => {
    if (!roomMap[m.room_key]) roomMap[m.room_key] = []
    roomMap[m.room_key].push(m)
  })

  const rooms = Object.entries(roomMap).map(([roomKey, mappings]) => {
    const config = ROOM_CONFIG[roomKey] || { label: roomKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), order: 50 }

    const elementMap = {}
    mappings.forEach(m => {
      const item = itemBySelId[m.project_selection_id]
      if (!item) return
      if (!filteredIds.has(m.project_selection_id)) return
      const elType = m.element_type || 'other'
      if (!elementMap[elType]) elementMap[elType] = []
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

// Build component-grouped data: group by IFC family
export function buildComponentGroups(filteredItems, allItems) {
  const familyGroups = {}
  filteredItems.forEach(item => {
    const family = deriveIfcFamily(item)
    if (!familyGroups[family]) familyGroups[family] = { items: [], allItems: [] }
    familyGroups[family].items.push(item)
  })
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

// Build parent->children tree from flat items list
export function buildItemTree(items) {
  const bySelId = {}
  items.forEach(i => { if (i.project_selections?.id) bySelId[i.project_selections.id] = i })

  const parents = []
  const childMap = {}

  items.forEach(item => {
    const sel = item.project_selections || {}
    if (sel.is_component && sel.parent_selection_id) {
      if (!childMap[sel.parent_selection_id]) childMap[sel.parent_selection_id] = []
      childMap[sel.parent_selection_id].push(item)
    } else {
      parents.push(item)
    }
  })

  Object.values(childMap).forEach(children => {
    children.sort((a, b) => (a.project_selections?.component_order || 99) - (b.project_selections?.component_order || 99))
  })

  const tree = parents.map(p => ({
    item: p,
    children: childMap[p.project_selections?.id] || [],
  }))

  Object.entries(childMap).forEach(([parentId, children]) => {
    if (!bySelId[parentId]) {
      children.forEach(c => tree.push({ item: c, children: [] }))
    }
  })

  return tree
}

// Sub-group tree nodes by parent selection_kind
export function groupTreeByKind(tree) {
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

// Derive the dominant element_type for a list of items
export function getDominantElementType(items) {
  const counts = {}
  items.forEach(i => {
    const et = i.project_selections?.element_type || 'other'
    counts[et] = (counts[et] || 0) + 1
  })
  let best = 'other', bestCount = 0
  Object.entries(counts).forEach(([k, v]) => {
    if (k !== 'other' && v > bestCount) { best = k; bestCount = v }
  })
  return best
}

// Get a background colour/gradient for colour swatch thumbnail
export function getColourBackground(colour) {
  if (!colour) return null
  const c = colour.toLowerCase()
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

export function formatK(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return n.toFixed(0)
}

// Format dimension attributes into a readable string
export function formatDimensions(attrs) {
  const w = attrs.width || attrs.dim_width
  const h = attrs.height || attrs.dim_height
  const d = attrs.depth || attrs.dim_depth
  const parts = [w, h, d].filter(Boolean)
  if (parts.length === 0) return null
  const unit = attrs.dim_unit || 'mm'
  return parts.join(' \u00d7 ') + ` ${unit}`
}
