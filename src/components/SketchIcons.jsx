/**
 * Hand-drawn sketch-style icons for schedule groups + element types.
 * Single stroke, imperfect lines — architectural sketch feel.
 * All icons are 24×24 viewBox, rendered at whatever size is passed.
 */

const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }

// ── Schedule Group Icons ──

export function IconExterior({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Simple house silhouette — hand-drawn */}
      <path d="M3.5 11.5L12 4l8.5 7.5" {...s} />
      <path d="M5 10.5v9.5h14v-9.5" {...s} />
      <path d="M9.5 20V14.5h5V20" {...s} />
      <path d="M2 12l1.5-1" {...s} />
      <path d="M22 12l-1.5-1" {...s} />
    </svg>
  )
}

export function IconKitchen({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Rangehood / benchtop sketch */}
      <path d="M4 20h16" {...s} />
      <path d="M4 14h16v6H4z" {...s} />
      <path d="M6 14v-3h12v3" {...s} />
      <circle cx="8.5" cy="17" r="1" {...s} />
      <circle cx="12" cy="17" r="1" {...s} />
      <circle cx="15.5" cy="17" r="1" {...s} />
      {/* Steam lines */}
      <path d="M9 8c0-1.5 1-2 1-3" {...s} />
      <path d="M12 7c0-1.5 1-2 1-3.5" {...s} />
    </svg>
  )
}

export function IconBathrooms({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Bathtub / basin sketch */}
      <path d="M4 12h16" {...s} />
      <path d="M5 12v4c0 2 2 4 7 4s7-2 7-4v-4" {...s} />
      <path d="M4 12V7c0-1.5 1.5-3 3-3s3 1.5 3 3" {...s} />
      {/* Tap */}
      <path d="M9 7h2" {...s} />
      <path d="M10 7v-1.5" {...s} />
    </svg>
  )
}

export function IconFlooring({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Floor tiles / boards — perspective */}
      <path d="M3 18L8 6h8l5 12H3z" {...s} />
      <path d="M6.5 18l2-12" {...s} />
      <path d="M12 18V6" {...s} />
      <path d="M17.5 18l-2-12" {...s} />
      <path d="M4.5 13h15" {...s} />
    </svg>
  )
}

export function IconDoorsHardware({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Door ajar — sketch */}
      <path d="M5 4h8l4 1v15l-4 1H5V4z" {...s} />
      <circle cx="14.5" cy="12.5" r="0.8" {...s} />
      <path d="M5 4v17" {...s} />
      {/* Frame */}
      <path d="M3 3h12" {...s} />
      <path d="M3 21h12" {...s} />
    </svg>
  )
}

export function IconJoinery({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Cabinet with drawers */}
      <rect x="4" y="4" width="16" height="16" rx="1" {...s} />
      <path d="M4 10h16" {...s} />
      <path d="M4 15h16" {...s} />
      <path d="M12 4v6" {...s} />
      {/* Handles */}
      <path d="M10 12.5h4" {...s} />
      <path d="M10 17.5h4" {...s} />
    </svg>
  )
}

export function IconInternalFinishes({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Paint roller / wall texture */}
      <rect x="6" y="3" width="10" height="6" rx="1.5" {...s} />
      <path d="M12 9v4" {...s} />
      <path d="M12 13v5" {...s} strokeDasharray="2 1.5" />
      {/* Swatch dabs */}
      <circle cx="6" cy="19" r="1.5" {...s} />
      <circle cx="12" cy="20" r="1.5" {...s} />
      <circle cx="18" cy="19" r="1.5" {...s} />
    </svg>
  )
}

export function IconLightingElectrical({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Pendant light — architectural sketch */}
      <path d="M12 3v3" {...s} />
      <path d="M8 6h8l-1.5 7h-5L8 6z" {...s} />
      {/* Glow rays */}
      <path d="M12 16v2" {...s} />
      <path d="M8.5 14.5l-1.5 1.5" {...s} />
      <path d="M15.5 14.5l1.5 1.5" {...s} />
      {/* Bulb */}
      <circle cx="12" cy="13.5" r="0.8" {...s} />
    </svg>
  )
}

export function IconMechanical({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Fan / HVAC grille */}
      <circle cx="12" cy="12" r="8" {...s} />
      <circle cx="12" cy="12" r="2.5" {...s} />
      {/* Blades */}
      <path d="M12 4.5c2 2 2 4.5 0 5" {...s} />
      <path d="M19.5 12c-2 2-4.5 2-5 0" {...s} />
      <path d="M12 19.5c-2-2-2-4.5 0-5" {...s} />
      <path d="M4.5 12c2-2 4.5-2 5 0" {...s} />
    </svg>
  )
}

export function IconServicesInfra({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Solar panel / battery — services */}
      <rect x="4" y="4" width="16" height="10" rx="1" {...s} />
      <path d="M8 4v10" {...s} />
      <path d="M12 4v10" {...s} />
      <path d="M16 4v10" {...s} />
      <path d="M4 7.5h16" {...s} />
      <path d="M4 11h16" {...s} />
      {/* Stand */}
      <path d="M8 14l-2 6" {...s} />
      <path d="M16 14l2 6" {...s} />
    </svg>
  )
}

// ── Element Type Icons (smaller, for schedule rows) ──

export function IconFloor({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M3 18L8 6h8l5 12H3z" {...s} />
      <path d="M12 6v12" {...s} />
      <path d="M5 13h14" {...s} />
    </svg>
  )
}

export function IconWall({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="0.5" {...s} />
      <path d="M3 10h18" {...s} />
      <path d="M3 16h18" {...s} />
      <path d="M9 4v6" {...s} />
      <path d="M15 10v6" {...s} />
      <path d="M9 16v4" {...s} />
    </svg>
  )
}

export function IconCeiling({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M3 8h18" {...s} />
      <path d="M5 8l-2 4" {...s} />
      <path d="M19 8l2 4" {...s} />
      <path d="M8 8v-3" {...s} />
      <path d="M12 8v-4" {...s} />
      <path d="M16 8v-3" {...s} />
    </svg>
  )
}

export function IconTapware({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M10 6h4c1 0 2 1 2 2v1" {...s} />
      <path d="M12 9v3" {...s} />
      <path d="M8 16c0-2 1.5-4 4-4s4 2 4 4" {...s} />
      <path d="M7 6h2" {...s} />
    </svg>
  )
}

export function IconSanitary({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Toilet side view */}
      <path d="M7 10h10c1 0 2 1.5 1.5 3.5L17 17H7l-1.5-3.5C5 11.5 6 10 7 10z" {...s} />
      <path d="M8 10V7c0-1 1-2 2.5-2h3c1.5 0 2.5 1 2.5 2v3" {...s} />
      <path d="M9 17v2h6v-2" {...s} />
    </svg>
  )
}

export function IconHardware({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Door handle lever */}
      <circle cx="12" cy="10" r="3" {...s} />
      <path d="M15 10h5" {...s} />
      <path d="M20 10v2" {...s} />
      <circle cx="12" cy="10" r="0.8" {...s} />
    </svg>
  )
}

export function IconDoor({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="6" y="3" width="12" height="18" rx="0.5" {...s} />
      <circle cx="15.5" cy="12.5" r="0.8" {...s} />
    </svg>
  )
}

export function IconWindow({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1" {...s} />
      <path d="M12 4v16" {...s} />
      <path d="M4 12h16" {...s} />
    </svg>
  )
}

export function IconGeneral({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="8" {...s} />
      <path d="M12 8v4l2.5 2.5" {...s} />
    </svg>
  )
}

// ── Room Icons ──

export function IconRoomKitchen({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M4 20h16" {...s} />
      <path d="M4 14h16v6H4z" {...s} />
      <circle cx="8" cy="17" r="1.2" {...s} />
      <circle cx="12" cy="17" r="1.2" {...s} />
      <path d="M9 8c0-1.5 1-2.5 1-3.5" {...s} />
      <path d="M12 7c0-1.5 1-2 1-3" {...s} />
    </svg>
  )
}

export function IconRoomLiving({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Sofa side profile */}
      <path d="M4 16h16" {...s} />
      <path d="M5 16v-4c0-1 .8-2 2-2h10c1.2 0 2 1 2 2v4" {...s} />
      <path d="M3 12v4c0 .5.5 1 1 1h1" {...s} />
      <path d="M21 12v4c0 .5-.5 1-1 1h-1" {...s} />
      <path d="M5 10V8" {...s} />
      <path d="M19 10V8" {...s} />
      {/* Cushion lines */}
      <path d="M9 12v2" {...s} />
      <path d="M15 12v2" {...s} />
    </svg>
  )
}

export function IconRoomDining({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Table + chairs */}
      <path d="M6 12h12" {...s} />
      <path d="M7 12v7" {...s} />
      <path d="M17 12v7" {...s} />
      {/* Pendant above */}
      <path d="M12 3v4" {...s} />
      <path d="M9.5 7h5l-.5 2h-4l-.5-2z" {...s} />
    </svg>
  )
}

export function IconRoomBedroom({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Bed side view */}
      <path d="M3 17h18" {...s} />
      <path d="M4 17v-4h16v4" {...s} />
      <path d="M4 13v-2c0-.5.5-1 1-1h3c.5 0 1 .5 1 1v2" {...s} />
      <path d="M4 13h16" {...s} />
      {/* Headboard */}
      <path d="M4 11V8c0-.5.3-1 .8-1h2.4c.5 0 .8.5.8 1v3" {...s} />
      {/* Legs */}
      <path d="M4 17v2" {...s} />
      <path d="M20 17v2" {...s} />
    </svg>
  )
}

export function IconRoomStudy({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Desk + lamp */}
      <path d="M4 16h16" {...s} />
      <path d="M6 16v4" {...s} />
      <path d="M18 16v4" {...s} />
      {/* Desk lamp */}
      <path d="M15 16v-3l3-4" {...s} />
      <path d="M16.5 9h3" {...s} />
      {/* Book */}
      <rect x="7" y="12" width="4" height="3" rx="0.3" {...s} />
    </svg>
  )
}

export function IconRoomBathroom({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M4 12h16" {...s} />
      <path d="M5 12v4c0 2 2 4 7 4s7-2 7-4v-4" {...s} />
      <path d="M4 12V7c0-1.5 1.5-3 3-3s3 1.5 3 3" {...s} />
      <path d="M9 7h2" {...s} />
    </svg>
  )
}

export function IconRoomLaundry({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Washing machine front */}
      <rect x="5" y="4" width="14" height="16" rx="1.5" {...s} />
      <circle cx="12" cy="13" r="4.5" {...s} />
      <circle cx="12" cy="13" r="1.5" {...s} />
      <path d="M8 6.5h2" {...s} />
      <circle cx="16" cy="6.5" r="0.6" {...s} />
    </svg>
  )
}

export function IconRoomEntry({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Archway / doorframe */}
      <path d="M5 20V6c0-1.5 3-3 7-3s7 1.5 7 3v14" {...s} />
      <path d="M3 20h18" {...s} />
      {/* Welcome mat */}
      <path d="M8 20v1h8v-1" {...s} />
    </svg>
  )
}

export function IconRoomPantry({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Shelf unit with jars */}
      <rect x="4" y="3" width="16" height="18" rx="0.5" {...s} />
      <path d="M4 9h16" {...s} />
      <path d="M4 15h16" {...s} />
      {/* Jars on shelves */}
      <rect x="6" y="5" width="3" height="3" rx="0.5" {...s} />
      <rect x="11" y="5" width="3" height="3" rx="0.5" {...s} />
      <rect x="7" y="11" width="3" height="3" rx="0.5" {...s} />
      <rect x="13" y="11" width="3" height="3" rx="0.5" {...s} />
    </svg>
  )
}

export function IconRoomGarage({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Garage door */}
      <path d="M3 20V8l9-5 9 5v12" {...s} />
      <path d="M5 20V10h14v10" {...s} />
      <path d="M5 13h14" {...s} />
      <path d="M5 16h14" {...s} />
    </svg>
  )
}

export function IconRoomAlfresco({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Pergola beams + outdoor */}
      <path d="M3 8h18" {...s} />
      <path d="M5 8V20" {...s} />
      <path d="M19 8V20" {...s} />
      <path d="M3 11h18" {...s} />
      {/* Sun */}
      <circle cx="16" cy="4.5" r="1.5" {...s} />
    </svg>
  )
}

export function IconRoomGeneric({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M3.5 11.5L12 4l8.5 7.5" {...s} />
      <path d="M5 10.5v9.5h14v-9.5" {...s} />
    </svg>
  )
}

export function IconThermalEnvelope({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {/* Outer wall outline */}
      <rect x="3" y="6" width="18" height="12" rx="1" {...s} />
      {/* Insulation batts — wavy lines */}
      <path d="M5 8.5c1-0.5 1.5-1.5 3-1.5s2 1 3 1.5" {...s} />
      <path d="M5 11c1-0.5 1.5-1.5 3-1.5s2 1 3 1.5" {...s} />
      <path d="M5 13.5c1-0.5 1.5-1.5 3-1.5s2 1 3 1.5" {...s} />
      <path d="M13 8.5c1-0.5 1.5-1.5 3-1.5s2 1 3 1.5" {...s} />
      <path d="M13 11c1-0.5 1.5-1.5 3-1.5s2 1 3 1.5" {...s} />
      <path d="M13 13.5c1-0.5 1.5-1.5 3-1.5s2 1 3 1.5" {...s} />
      {/* Center divider showing layers */}
      <path d="M12 6v12" {...s} strokeDasharray="2 2" />
    </svg>
  )
}

// ── Lookup maps ──

export const ROOM_ICONS = {
  kitchen: IconRoomKitchen,
  living: IconRoomLiving,
  dining: IconRoomDining,
  bedroom_01: IconRoomBedroom,
  bedroom_02: IconRoomBedroom,
  study: IconRoomStudy,
  bathroom: IconRoomBathroom,
  ensuite: IconRoomBathroom,
  laundry: IconRoomLaundry,
  entry: IconRoomEntry,
  pantry: IconRoomPantry,
  linen: IconRoomGeneric,
  alfresco: IconRoomAlfresco,
  garage: IconRoomGarage,
  exterior: IconExterior,
  whole_house: IconRoomGeneric,
}

export const GROUP_ICONS = {
  exterior: IconExterior,
  thermal_envelope: IconThermalEnvelope,
  kitchen: IconKitchen,
  bathrooms: IconBathrooms,
  flooring: IconFlooring,
  doors_hardware: IconDoorsHardware,
  joinery: IconJoinery,
  internal_finishes: IconInternalFinishes,
  lighting_electrical: IconLightingElectrical,
  mechanical: IconMechanical,
  services_infra: IconServicesInfra,
}

export const ELEMENT_ICONS = {
  floor: IconFloor,
  wall: IconWall,
  ceiling: IconCeiling,
  joinery: IconJoinery,
  sanitary: IconSanitary,
  tapware: IconTapware,
  fixture: IconGeneral,
  fitting: IconGeneral,
  hardware: IconHardware,
  door: IconDoor,
  window: IconWindow,
  product: IconGeneral,
  finish: IconInternalFinishes,
  trim: IconGeneral,
  services: IconServicesInfra,
  mechanical: IconMechanical,
  exterior: IconExterior,
  general: IconGeneral,
  other: IconGeneral,
}
