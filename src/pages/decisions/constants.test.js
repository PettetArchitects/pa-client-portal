import { describe, it, expect } from 'vitest'
import {
  getTopLevelAssemblyCode,
  parseCode,
  deriveIfcFamily,
  buildItemTree,
  getDominantElementType,
  getColourBackground,
  formatK,
  formatDimensions,
  buildRoomGroups,
  buildComponentGroups,
} from './constants'

/* ── getTopLevelAssemblyCode ── */
describe('getTopLevelAssemblyCode', () => {
  it('returns the root assembly with no parent', () => {
    const map = {
      'D1': { role: 'assembly', parent_canonical_code: null, title: 'Door Type 01' },
      'D1-HW': { role: 'hardware', parent_canonical_code: 'D1', title: 'Hardware' },
      'D1-FIN': { role: 'finish', parent_canonical_code: 'D1', title: 'Finish' },
    }
    expect(getTopLevelAssemblyCode('D1-HW', map)).toBe('D1')
    expect(getTopLevelAssemblyCode('D1-FIN', map)).toBe('D1')
    expect(getTopLevelAssemblyCode('D1', map)).toBe('D1')
  })

  it('returns null for codes not in the map', () => {
    const map = { 'A1': { role: 'assembly', parent_canonical_code: null } }
    expect(getTopLevelAssemblyCode('UNKNOWN', map)).toBeNull()
  })

  it('guards against circular references', () => {
    const map = {
      'A': { role: 'product', parent_canonical_code: 'B' },
      'B': { role: 'product', parent_canonical_code: 'A' },
    }
    expect(getTopLevelAssemblyCode('A', map)).toBeNull()
  })

  it('handles multi-level hierarchy', () => {
    const map = {
      'ROOT': { role: 'assembly', parent_canonical_code: null },
      'MID': { role: 'product', parent_canonical_code: 'ROOT' },
      'LEAF': { role: 'finish', parent_canonical_code: 'MID' },
    }
    expect(getTopLevelAssemblyCode('LEAF', map)).toBe('ROOT')
  })
})

/* ── parseCode ── */
describe('parseCode', () => {
  it('parses "CODE — Name" format', () => {
    const result = parseCode('MX1 — Shower mixer', {})
    expect(result).toEqual({ code: 'MX1', name: 'Shower mixer' })
  })

  it('parses "CODE - Name" format with hyphen', () => {
    const result = parseCode('LT1 - Light Type 01', {})
    expect(result).toEqual({ code: 'LT1', name: 'Light Type 01' })
  })

  it('prefers attrs.code over parsed code', () => {
    const result = parseCode('MX1 — Shower mixer', { code: 'SYS_CODE' })
    expect(result).toEqual({ code: 'SYS_CODE', name: 'Shower mixer' })
  })

  it('handles Joinery pattern', () => {
    const result = parseCode('Joinery J01.1', {})
    expect(result).toEqual({ code: 'J01.1', name: 'Joinery' })
  })

  it('returns title as name when no code pattern found', () => {
    const result = parseCode('Plain title', {})
    expect(result).toEqual({ code: null, name: 'Plain title' })
  })

  it('handles null title', () => {
    const result = parseCode(null, { code: 'ABC' })
    expect(result).toEqual({ code: 'ABC', name: null })
  })
})

/* ── deriveIfcFamily ── */
describe('deriveIfcFamily', () => {
  it('uses explicit ifc_class attribute', () => {
    const item = { project_selections: { attributes: { ifc_class: 'IfcDoor' } } }
    expect(deriveIfcFamily(item)).toBe('IfcDoor')
  })

  it('derives from selection_kind: door_type', () => {
    const item = { project_selections: { selection_kind: 'door_type' } }
    expect(deriveIfcFamily(item)).toBe('IfcDoor')
  })

  it('derives from selection_kind: window_type', () => {
    const item = { project_selections: { selection_kind: 'window_type' } }
    expect(deriveIfcFamily(item)).toBe('IfcWindow')
  })

  it('derives from title keywords: roof', () => {
    const item = { project_selections: { title: 'Metal Roofing System' } }
    expect(deriveIfcFamily(item)).toBe('IfcRoof')
  })

  it('derives from title keywords: light', () => {
    const item = { project_selections: { title: 'LT1 Pendant Light' } }
    expect(deriveIfcFamily(item)).toBe('IfcLightFixture')
  })

  it('derives from title keywords: basin', () => {
    const item = { project_selections: { title: 'Bathroom Basin' } }
    expect(deriveIfcFamily(item)).toBe('IfcSanitaryTerminal')
  })

  it('derives from schedule_group', () => {
    const item = { project_selections: {}, schedule_group: 'exterior' }
    expect(deriveIfcFamily(item)).toBe('IfcWall')
  })

  it('falls back to IfcBuildingElementProxy', () => {
    const item = { project_selections: { title: 'Something generic' } }
    expect(deriveIfcFamily(item)).toBe('IfcBuildingElementProxy')
  })
})

/* ── buildItemTree ── */
describe('buildItemTree', () => {
  it('groups children under parents', () => {
    const items = [
      { id: 1, project_selections: { id: 'sel-1', is_component: false } },
      { id: 2, project_selections: { id: 'sel-2', is_component: true, parent_selection_id: 'sel-1', component_order: 1 } },
      { id: 3, project_selections: { id: 'sel-3', is_component: true, parent_selection_id: 'sel-1', component_order: 2 } },
    ]
    const tree = buildItemTree(items)
    expect(tree).toHaveLength(1)
    expect(tree[0].item.id).toBe(1)
    expect(tree[0].children).toHaveLength(2)
    expect(tree[0].children[0].id).toBe(2)
    expect(tree[0].children[1].id).toBe(3)
  })

  it('handles orphan components', () => {
    const items = [
      { id: 1, project_selections: { id: 'sel-1', is_component: true, parent_selection_id: 'missing-parent', component_order: 1 } },
    ]
    const tree = buildItemTree(items)
    expect(tree).toHaveLength(1)
    expect(tree[0].item.id).toBe(1)
    expect(tree[0].children).toHaveLength(0)
  })
})

/* ── getDominantElementType ── */
describe('getDominantElementType', () => {
  it('returns most common non-other element type', () => {
    const items = [
      { project_selections: { element_type: 'floor' } },
      { project_selections: { element_type: 'floor' } },
      { project_selections: { element_type: 'wall' } },
    ]
    expect(getDominantElementType(items)).toBe('floor')
  })

  it('ignores "other" in counting', () => {
    const items = [
      { project_selections: { element_type: 'other' } },
      { project_selections: { element_type: 'other' } },
      { project_selections: { element_type: 'wall' } },
    ]
    expect(getDominantElementType(items)).toBe('wall')
  })

  it('returns "other" when all items are "other"', () => {
    const items = [
      { project_selections: { element_type: 'other' } },
    ]
    expect(getDominantElementType(items)).toBe('other')
  })
})

/* ── getColourBackground ── */
describe('getColourBackground', () => {
  it('returns gradient for known colours', () => {
    expect(getColourBackground('Natural White')).toContain('linear-gradient')
    expect(getColourBackground('Woodland Grey')).toContain('#4A4B45')
    expect(getColourBackground('Aged Brass')).toContain('#B08D57')
  })

  it('returns null for unknown colours', () => {
    expect(getColourBackground('Flamingo Pink')).toBeNull()
  })

  it('returns null for null/undefined', () => {
    expect(getColourBackground(null)).toBeNull()
    expect(getColourBackground(undefined)).toBeNull()
  })
})

/* ── formatK ── */
describe('formatK', () => {
  it('formats thousands with k suffix', () => {
    expect(formatK(1500)).toBe('1.5k')
    expect(formatK(15000)).toBe('15k')
    expect(formatK(150000)).toBe('150k')
  })

  it('formats small numbers as integers', () => {
    expect(formatK(500)).toBe('500')
    expect(formatK(0)).toBe('0')
  })
})

/* ── formatDimensions ── */
describe('formatDimensions', () => {
  it('formats width x height x depth', () => {
    expect(formatDimensions({ width: 600, height: 300, depth: 50 })).toBe('600 \u00d7 300 \u00d7 50 mm')
  })

  it('uses custom unit', () => {
    expect(formatDimensions({ width: 2, height: 1, dim_unit: 'm' })).toBe('2 \u00d7 1 m')
  })

  it('returns null when no dimensions', () => {
    expect(formatDimensions({})).toBeNull()
  })

  it('handles partial dimensions', () => {
    expect(formatDimensions({ width: 100 })).toBe('100 mm')
  })
})

/* ── buildRoomGroups ── */
describe('buildRoomGroups', () => {
  it('groups items by room', () => {
    const items = [
      { id: 1, project_selection_id: 'sel-1', approval_status: 'pending' },
      { id: 2, project_selection_id: 'sel-2', approval_status: 'approved' },
    ]
    const mappings = [
      { room_key: 'kitchen', project_selection_id: 'sel-1', element_type: 'floor' },
      { room_key: 'kitchen', project_selection_id: 'sel-2', element_type: 'wall' },
    ]
    const rooms = buildRoomGroups(items, items, mappings)
    expect(rooms).toHaveLength(1)
    expect(rooms[0].roomKey).toBe('kitchen')
    expect(rooms[0].label).toBe('Kitchen')
    expect(rooms[0].pending).toBe(1)
    expect(rooms[0].approved).toBe(1)
  })

  it('filters out rooms with no visible items', () => {
    const allItems = [
      { id: 1, project_selection_id: 'sel-1', approval_status: 'pending' },
    ]
    const filteredItems = [] // filtered to empty
    const mappings = [
      { room_key: 'kitchen', project_selection_id: 'sel-1', element_type: 'floor' },
    ]
    const rooms = buildRoomGroups(filteredItems, allItems, mappings)
    expect(rooms).toHaveLength(0)
  })
})

/* ── buildComponentGroups ── */
describe('buildComponentGroups', () => {
  it('groups by IFC family', () => {
    const items = [
      { id: 1, project_selections: { selection_kind: 'door_type' }, approval_status: 'pending', display_order: 1 },
      { id: 2, project_selections: { selection_kind: 'window_type' }, approval_status: 'approved', display_order: 2 },
    ]
    const groups = buildComponentGroups(items, items)
    expect(groups.length).toBeGreaterThanOrEqual(2)
    const doorGroup = groups.find(g => g.ifcClass === 'IfcDoor')
    const windowGroup = groups.find(g => g.ifcClass === 'IfcWindow')
    expect(doorGroup.totalVisible).toBe(1)
    expect(windowGroup.totalVisible).toBe(1)
  })
})
