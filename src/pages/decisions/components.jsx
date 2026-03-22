/* ── Shared UI components for Decisions page ── */
import {
  Check, MessageSquare, ArrowUpRight, Package, Palette, Wrench, AlertCircle,
} from 'lucide-react'
import {
  STATUS_STYLES, ROLE_LABELS, ROOM_CONFIG,
  parseCode, getColourBackground, formatDimensions,
} from './constants'

export const KIND_ICONS = {
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

/* ── Stat pill ── */
export function Stat({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span className="text-[10px] text-[var(--color-text)] font-medium">{value} {label}</span>
    </div>
  )
}

/* ── Sub-field label + value ── */
export function SubField({ label, value, children }) {
  return (
    <div className="min-w-0">
      {children || (
        <span className="text-[11px] text-[var(--color-text)] leading-snug block break-words">
          {value || '\u2014'}
        </span>
      )}
      <span className="text-[8px] tracking-[0.5px] uppercase text-[var(--color-muted)] font-medium leading-none">
        {label}
      </span>
    </div>
  )
}

/* ── Colour dot: visual colour swatch ── */
export function ColourDot({ colour }) {
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

/* ── Spec cell: label + value ── */
export function SpecCell({ label, value, unit, children }) {
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

/* ── Selection card: Programa-style visual item with product image ── */
export function SelectionCard({ item, natspecMap, codeTitleMap, onApprove, onRequestChange }) {
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

  const imageUrl = item.portal_image_url
  const colourBg = getColourBackground(attrs.colour)

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
              {natspecCodes.map(n => n.ref).join(' \u00b7 ')}
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
            aria-label="Approve selection"
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
            aria-label="Request a change to this selection"
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
            aria-label="Approve selection instead of change request"
          >
            <Check size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Item row: full-size grid row for schedule view ── */
export function ItemRow({ item, natspecMap, subCriteriaMap, onApproveItem, onRequestChange }) {
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
        <span className="text-[9px] font-mono text-[var(--color-muted)] pt-3 text-right tabular-nums">{item.display_order || ''}</span>
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
              {natspecCodes.map(n => n.ref).join(' \u00b7 ')}
            </span>
          )}
          {code && <span className="text-[9px] font-mono tracking-wider text-[var(--color-muted)] uppercase block mt-0.5">{code}</span>}
        </div>
        <SpecCell label="Product" value={sel.model} />
        {specFields.slice(0, 4).map(f => (
          <SpecCell key={f.key} label={f.label} unit={f.unit} value={attrs[f.key]}>
            {f.type === 'colour' && attrs[f.key] ? (
              <span className="text-[11px] text-[var(--color-text)] leading-snug flex items-center gap-1 break-words">
                <ColourDot colour={attrs[f.key]} />{attrs[f.key]}
              </span>
            ) : undefined}
          </SpecCell>
        ))}
        {specFields.length < 4 && Array.from({ length: 4 - specFields.length }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        <div className="flex items-start justify-end gap-1 pt-1">
          {(isPending || isChangeReq) && onApproveItem && (<>
            <button onClick={() => onApproveItem(item.id)} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(91,138,101,0.1)]" style={{ border: '1px solid rgba(91,138,101,0.3)', color: 'var(--color-approved)' }} title="Approve" aria-label="Approve"><Check size={11} /></button>
            <button onClick={() => onRequestChange(item.id)} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(160,115,88,0.08)]" style={{ border: '1px solid rgba(232,232,229,0.8)', color: 'var(--color-muted)' }} title="Request change" aria-label="Request change"><MessageSquare size={10} /></button>
          </>)}
          {!isPending && !isChangeReq && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{st.label}</span>
          )}
        </div>
      </div>
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

/* ── Compact child/component row ── */
export function CompactChildRow({ item, natspecMap, subCriteriaMap, codeTitleMap, onApproveItem, onRequestChange }) {
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
        <div>
          {colourBg ? (
            <div style={{ width: 28, height: 28, borderRadius: 6, background: colourBg, border: '1px solid rgba(0,0,0,0.06)' }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={11} style={{ color: 'var(--color-border)' }} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <span className="text-[8px] tracking-[1px] uppercase text-[var(--color-muted)] font-medium block">{roleLabel}</span>
          <div className="font-medium leading-snug text-[var(--color-text)] text-[11px] break-words">{sel.title || item.selection_title}</div>
          {code && <span className="text-[8px] font-mono tracking-wider text-[var(--color-muted)] block">{code}{codeTitleMap && codeTitleMap[code] ? ` \u2014 ${codeTitleMap[code]}` : ''}</span>}
        </div>
        <SpecCell label="Product" value={sel.model} />
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
        <div className="flex items-center justify-end gap-1">
          {(isPending || isChangeReq) && onApproveItem && (
            <button onClick={() => onApproveItem(item.id)} className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-[rgba(91,138,101,0.1)]" style={{ border: '1px solid rgba(91,138,101,0.3)', color: 'var(--color-approved)' }} title="Approve" aria-label="Approve"><Check size={9} /></button>
          )}
          {!isPending && !isChangeReq && (
            <span className="text-[8px] font-medium px-1 py-0.5 rounded whitespace-nowrap" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{st.label}</span>
          )}
        </div>
      </div>
    </div>
  )
}
