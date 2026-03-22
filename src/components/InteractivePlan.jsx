import { useState, useRef } from 'react'
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

const PLAN_URL = 'https://mmfhjlpsumhyxjqhyirw.supabase.co/storage/v1/object/public/image-library/plans/P003/ground_floor_plan.png'

/**
 * Room zones — percentage coordinates relative to the plan image.
 * Format: { x, y, w, h } as percentages (0–100).
 * These map to room_key values in portal_selection_rooms.
 *
 * Coordinates are approximate — refine by toggling debug mode (architect only).
 */
const ROOM_ZONES = [
  { key: 'kitchen',     label: 'Kitchen',       x: 38, y: 52, w: 16, h: 26, color: 'rgba(212,160,23,0.25)' },
  { key: 'pantry',      label: 'Pantry',        x: 34, y: 58, w: 5,  h: 14, color: 'rgba(212,160,23,0.20)' },
  { key: 'living',      label: 'Living / Dining', x: 55, y: 18, w: 28, h: 32, color: 'rgba(61,139,64,0.20)' },
  { key: 'bedroom_01',  label: 'Main Bedroom',  x: 28, y: 14, w: 16, h: 26, color: 'rgba(100,140,200,0.22)' },
  { key: 'ensuite',     label: 'Ensuite',       x: 30, y: 40, w: 10, h: 12, color: 'rgba(100,140,200,0.18)' },
  { key: 'bedroom_02',  label: 'Bedroom 2',     x: 44, y: 14, w: 11, h: 20, color: 'rgba(140,100,200,0.20)' },
  { key: 'study',       label: 'Study / Guest', x: 44, y: 34, w: 11, h: 16, color: 'rgba(140,100,200,0.18)' },
  { key: 'bathroom',    label: 'Bathroom',       x: 40, y: 40, w: 8,  h: 12, color: 'rgba(200,100,100,0.20)' },
  { key: 'laundry',     label: 'Laundry',       x: 48, y: 40, w: 8,  h: 12, color: 'rgba(180,160,100,0.20)' },
  { key: 'entry',       label: 'Entry',         x: 28, y: 40, w: 6,  h: 12, color: 'rgba(150,150,150,0.18)' },
  { key: 'alfresco',    label: 'Alfresco',      x: 55, y: 52, w: 18, h: 26, color: 'rgba(100,180,100,0.18)' },
  { key: 'garage',      label: 'Garage',        x: 75, y: 52, w: 12, h: 26, color: 'rgba(150,150,150,0.15)' },
  { key: 'exterior',    label: 'Exterior',      x: 88, y: 14, w: 8,  h: 60, color: 'rgba(100,120,100,0.10)' },
  { key: 'whole_house', label: 'Whole House',   x: 28, y: 80, w: 58, h: 5,  color: 'rgba(60,60,60,0.10)' },
]

export default function InteractivePlan({ roomMappings, items, onSelectRoom, selectedRoom, isArchitect }) {
  const [zoom, setZoom] = useState(1)
  const [debug, setDebug] = useState(false)
  const containerRef = useRef(null)

  // Count items per room
  const roomCounts = {}
  const roomPending = {}
  if (roomMappings && items) {
    const itemMap = {}
    items.forEach(i => { itemMap[i.project_selection_id] = i })
    roomMappings.forEach(m => {
      const item = itemMap[m.project_selection_id]
      if (!item || !item.active) return
      roomCounts[m.room_key] = (roomCounts[m.room_key] || 0) + 1
      if (item.approval_status === 'pending') {
        roomPending[m.room_key] = (roomPending[m.room_key] || 0) + 1
      }
    })
  }

  const handleZoom = (dir) => {
    setZoom(z => Math.max(0.5, Math.min(3, z + dir * 0.25)))
  }

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-[var(--color-muted)] font-light">
          Tap a room to see its selections
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => handleZoom(1)} className="p-1.5 rounded-lg hover:bg-white/40 text-[var(--color-muted)] transition-colors">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => handleZoom(-1)} className="p-1.5 rounded-lg hover:bg-white/40 text-[var(--color-muted)] transition-colors">
            <ZoomOut size={14} />
          </button>
          <button onClick={() => setZoom(1)} className="p-1.5 rounded-lg hover:bg-white/40 text-[var(--color-muted)] transition-colors">
            <Maximize2 size={14} />
          </button>
          {isArchitect && (
            <button
              onClick={() => setDebug(d => !d)}
              className={`px-2 py-1 rounded text-[9px] font-mono transition-colors ${debug ? 'bg-[var(--color-urgent)]/20 text-[var(--color-urgent)]' : 'text-[var(--color-muted)] hover:bg-white/40'}`}
            >
              {debug ? 'ZONES ON' : 'debug'}
            </button>
          )}
        </div>
      </div>

      {/* Selected room banner */}
      {selectedRoom && (
        <div className="flex items-center justify-between glass-t px-3 py-2 mb-3">
          <span className="text-[12px] font-medium">
            {ROOM_ZONES.find(z => z.key === selectedRoom)?.label || selectedRoom}
            <span className="text-[var(--color-muted)] font-light ml-2">{roomCounts[selectedRoom] || 0} selections</span>
          </span>
          <button onClick={() => onSelectRoom(null)} className="p-1 rounded hover:bg-white/40 text-[var(--color-muted)]">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Plan image with hotspots */}
      <div
        ref={containerRef}
        className="glass-s overflow-auto cursor-grab active:cursor-grabbing"
        style={{ maxHeight: '60vh' }}
      >
        <div className="relative inline-block" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease' }}>
          <img
            src={PLAN_URL}
            alt="Ground Floor Plan"
            className="block w-full h-auto"
            draggable={false}
            style={{ minWidth: 800 }}
          />

          {/* Room zone overlays */}
          {ROOM_ZONES.map(zone => {
            const isSelected = selectedRoom === zone.key
            const count = roomCounts[zone.key] || 0
            const pending = roomPending[zone.key] || 0
            const hasItems = count > 0

            return (
              <button
                key={zone.key}
                onClick={() => onSelectRoom(isSelected ? null : zone.key)}
                className="absolute transition-all duration-200 rounded-md group"
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`,
                  background: isSelected
                    ? 'rgba(26, 26, 26, 0.18)'
                    : debug
                    ? zone.color
                    : 'transparent',
                  border: isSelected
                    ? '2px solid rgba(26,26,26,0.5)'
                    : debug
                    ? '1px dashed rgba(0,0,0,0.3)'
                    : '1px solid transparent',
                  cursor: hasItems ? 'pointer' : 'default',
                }}
                title={`${zone.label} — ${count} selections`}
              >
                {/* Hover fill */}
                <div
                  className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: zone.color }}
                />

                {/* Label badge — show on hover or when selected or in debug */}
                <div
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap transition-opacity ${
                    isSelected || debug ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <div className="glass px-2 py-1 text-center shadow-sm" style={{ borderRadius: 6 }}>
                    <div className="text-[9px] font-medium text-[var(--color-text)] leading-tight">{zone.label}</div>
                    {hasItems && (
                      <div className="text-[8px] text-[var(--color-muted)] leading-tight mt-0.5">
                        {count} item{count !== 1 ? 's' : ''}
                        {pending > 0 && <span className="text-[var(--color-pending)] ml-1">({pending} pending)</span>}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { ROOM_ZONES }
