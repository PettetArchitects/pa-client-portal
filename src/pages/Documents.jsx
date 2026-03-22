import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import { useAuth } from '../hooks/useAuth'
import {
  FileText, Eye, Clock, Search, Folder, ChevronDown, ChevronRight,
  Package, Palette, Wrench, Grid3X3, ListChecks, Download, ExternalLink,
  ArrowLeft, X, BookOpen, PenTool, ClipboardList, FileBarChart, FolderOpen
} from 'lucide-react'

/* ══════════════════════════════════════════════════════════════════════
 * MASTER DOCUMENT PRECEDENCE RULE
 * ──────────────────────────────────────────────────────────────────────
 * Standard contractual hierarchy: specification governs drawings (AS 4000 cl 2.2).
 * Written intent takes precedence over graphic representation.
 * This constant drives the UX — sections render in this order.
 * ══════════════════════════════════════════════════════════════════════ */
const DOCUMENT_PRECEDENCE = [
  {
    tier: 1,
    key: 'specifications',
    label: 'Specifications',
    description: 'Written intent — highest precedence',
    icon: BookOpen,
    docTypes: ['specification', 'spec', 'natspec', 'project_specification'],
  },
  {
    tier: 2,
    key: 'drawings',
    label: 'Drawings',
    description: 'Graphic record, subordinate to specification',
    icon: PenTool,
    docTypes: ['drawing_set', 'drawing', 'architectural_drawing', 'construction_drawing'],
  },
  {
    tier: 3,
    key: 'schedules',
    label: 'Schedules',
    description: 'Selections derived from specs, cross-referenced to drawings',
    icon: Grid3X3,
    docTypes: ['schedule'],
    includesSelections: true,
  },
  {
    tier: 4,
    key: 'reports',
    label: 'Reports',
    description: 'Supporting technical evidence',
    icon: FileBarChart,
    docTypes: ['geotechnical_report', 'consultant_report', 'tender_drawing_detail_matrix'],
  },
  {
    tier: 5,
    key: 'administrative',
    label: 'Administrative',
    description: 'Contract administration — registers, transmittals, QA',
    icon: FolderOpen,
    docTypes: ['tender_document_register', 'tender_delivery_work_plan', 'tender_pack_qa_run_summary', 'transmittal', 'presentation'],
  },
]

/* Map every doc_type to its precedence tier key for fast lookup */
const DOC_TYPE_TO_TIER = {}
DOCUMENT_PRECEDENCE.forEach(tier => {
  tier.docTypes.forEach(dt => { DOC_TYPE_TO_TIER[dt] = tier.key })
})

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

const STATUS_LABELS = {
  locked: 'Confirmed',
  proposed: 'Proposed',
  provisional_sum: 'PS',
}

const DOC_TYPE_LABELS = {
  tender_document_register: 'Tender Register',
  tender_drawing_detail_matrix: 'Drawing Matrix',
  tender_delivery_work_plan: 'Work Plan',
  tender_pack_qa_run_summary: 'QA Summary',
  geotechnical_report: 'Geotech Report',
  consultant_report: 'Consultant Report',
  specification: 'Specification',
  drawing_set: 'Drawing Set',
  presentation: 'Presentation',
  schedule: 'Schedule',
  transmittal: 'Transmittal',
}

/* ── Document viewer styles injected once ── */
const DOC_VIEWER_STYLES = `
  .doc-viewer-content .doc-content { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a1a; line-height: 1.7; }
  .doc-viewer-content .doc-header { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08); }
  .doc-viewer-content .doc-header h1 { font-size: 1.5rem; font-weight: 500; margin: 0.5rem 0 0.25rem; letter-spacing: -0.01em; }
  .doc-viewer-content .doc-subtitle { font-size: 0.85rem; color: #666; margin: 0; }
  .doc-viewer-content .doc-date { font-size: 0.75rem; color: #999; margin: 0.25rem 0 0; }
  .doc-viewer-content .doc-meta { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; }
  .doc-viewer-content .doc-badge { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; padding: 0.2rem 0.6rem; border-radius: 4px; background: rgba(0,0,0,0.04); color: #666; font-weight: 500; }
  .doc-viewer-content .doc-version { font-size: 0.65rem; color: #999; }
  .doc-viewer-content .doc-status { font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: 500; }
  .doc-viewer-content .doc-status.approved { background: rgba(34,139,34,0.08); color: #228b22; }
  .doc-viewer-content .doc-status.for-review { background: rgba(184,134,11,0.08); color: #b8860b; }
  .doc-viewer-content section { margin-bottom: 1.75rem; }
  .doc-viewer-content h2 { font-size: 1rem; font-weight: 600; margin: 0 0 0.75rem; color: #1a1a1a; letter-spacing: 0.01em; }
  .doc-viewer-content h3 { font-size: 0.85rem; font-weight: 600; margin: 1.25rem 0 0.5rem; color: #333; }
  .doc-viewer-content p { font-size: 0.8rem; margin: 0 0 0.75rem; color: #444; }
  .doc-viewer-content ul, .doc-viewer-content ol { font-size: 0.8rem; padding-left: 1.5rem; margin: 0 0 0.75rem; color: #444; }
  .doc-viewer-content li { margin-bottom: 0.35rem; }
  .doc-viewer-content table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 1rem; font-size: 0.75rem; }
  .doc-viewer-content th { text-align: left; padding: 0.5rem 0.75rem; background: rgba(0,0,0,0.03); border-bottom: 1px solid rgba(0,0,0,0.1); font-weight: 600; color: #333; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; }
  .doc-viewer-content td { padding: 0.45rem 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.04); color: #444; }
  .doc-viewer-content tr:hover td { background: rgba(0,0,0,0.01); }
  .doc-viewer-content td.pass { color: #228b22; font-weight: 500; }
  .doc-viewer-content td.gap { color: #b8860b; font-weight: 500; }
  .doc-viewer-content td.highlight { background: rgba(184,134,11,0.06); font-weight: 500; }
  .doc-viewer-content tr.highlight-row td { background: rgba(184,134,11,0.08); font-weight: 600; }
  .doc-viewer-content .info-table td:first-child { font-weight: 500; color: #666; width: 40%; white-space: nowrap; }
  .doc-viewer-content .callout { padding: 1rem 1.25rem; border-radius: 8px; margin: 0.75rem 0; font-size: 0.8rem; line-height: 1.6; }
  .doc-viewer-content .callout.highlight { background: rgba(184,134,11,0.06); border-left: 3px solid #b8860b; }
  .doc-viewer-content .callout.warning { background: rgba(220,80,40,0.05); border-left: 3px solid #dc5028; }
  .doc-viewer-content .callout.info { background: rgba(60,120,180,0.05); border-left: 3px solid #3c78b4; }
  .doc-viewer-content .stats-row { display: flex; gap: 1rem; margin: 1rem 0; flex-wrap: wrap; }
  .doc-viewer-content .stat { text-align: center; padding: 0.75rem 1.25rem; background: rgba(0,0,0,0.02); border-radius: 8px; flex: 1; min-width: 80px; }
  .doc-viewer-content .stat-value { display: block; font-size: 1.5rem; font-weight: 600; color: #1a1a1a; }
  .doc-viewer-content .stat-label { display: block; font-size: 0.65rem; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-top: 0.25rem; }
  .doc-viewer-content .doc-footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.06); }
  .doc-viewer-content .doc-footer p { font-size: 0.7rem; color: #999; margin: 0 0 0.25rem; }
`

const SUPABASE_FN_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://mmfhjlpsumhyxjqhyirw.supabase.co') + '/functions/v1'

export default function Documents({ projectId }) {
  const { isArchitect } = useProject()
  const { user } = useAuth()
  const [docs, setDocs] = useState([])
  const [allProjectDocs, setAllProjectDocs] = useState([])
  const [scheduleData, setScheduleData] = useState({ groups: [], meta: { total: 0, confirmed: 0, approved: 0, to_review: 0 } })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedTiers, setExpandedTiers] = useState(new Set(['specifications', 'drawings', 'schedules']))
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [selectedDoc, setSelectedDoc] = useState(null)

  useEffect(() => {
    if (!projectId) return
    loadAll()
  }, [projectId])

  async function loadAll() {
    const queries = [
      supabase
        .from('homeowner_document_shares')
        .select(`*, project_documents:project_document_id (id, title, doc_type, storage_path, file_size_bytes, version, issued_at, notes, status, stage, content_html)`)
        .eq('project_id', projectId)
        .eq('active', true)
        .order('shared_at', { ascending: false }),
      fetch(`${SUPABASE_FN_URL}/portal-selections?project_id=${encodeURIComponent(projectId)}`)
        .then(r => r.json())
        .catch(() => ({ groups: [], meta: { total: 0, confirmed: 0, approved: 0, to_review: 0 } })),
    ]

    if (isArchitect) {
      queries.push(
        supabase
          .from('project_documents')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_current', true)
          .order('hierarchy_order')
      )
    }

    const results = await Promise.all(queries)
    const [docRes, selData] = results

    setDocs(docRes.data || [])
    setScheduleData(selData)
    if (results[2]) setAllProjectDocs(results[2].data || [])
    setLoading(false)
  }

  async function markViewed(id) {
    await supabase.from('homeowner_document_shares')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', id)
  }

  function openDocument(doc) {
    const pd = isArchitect ? doc : doc.project_documents
    if (!pd) return
    setSelectedDoc({ ...pd, shareId: doc.id, shareNote: doc.share_note })
    if (!isArchitect && !doc.viewed_at) markViewed(doc.id)
  }

  function toggleTier(key) {
    setExpandedTiers(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleGroup(key) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  /* ── Classify documents into precedence tiers ── */
  const documentList = isArchitect ? allProjectDocs : docs
  const q = search.toLowerCase()

  function classifyDocs() {
    const tierDocs = {}
    DOCUMENT_PRECEDENCE.forEach(t => { tierDocs[t.key] = [] })

    documentList.forEach(d => {
      const docType = isArchitect ? d.doc_type : (d.project_documents?.doc_type || '')
      const title = isArchitect ? d.title : (d.project_documents?.title || '')
      if (q && ![title, docType].join(' ').toLowerCase().includes(q)) return
      const tierKey = DOC_TYPE_TO_TIER[docType] || 'administrative'
      tierDocs[tierKey].push(d)
    })

    return tierDocs
  }

  const tierDocs = classifyDocs()

  /* ── Schedule data filtered by search ── */
  const groupedSchedule = (scheduleData.groups || []).map(g => {
    if (!q) return g
    const items = g.items.filter(item => {
      const text = [item.code, item.title, item.manufacturer_name, item.model, item.colour, item.schedule_group].filter(Boolean).join(' ').toLowerCase()
      return text.includes(q)
    })
    return { ...g, items, item_count: items.length }
  }).filter(g => g.items.length > 0)

  const totalScheduleItems = scheduleData.meta?.total || 0

  /* ── Counts per tier ── */
  function getTierCount(tier) {
    const docCount = tierDocs[tier.key]?.length || 0
    if (tier.includesSelections) return docCount + totalScheduleItems
    return docCount
  }

  // ── Document viewer ──
  if (selectedDoc) {
    return <DocumentViewer doc={selectedDoc} onBack={() => setSelectedDoc(null)} />
  }

  if (loading) {
    return (
      <div className="max-w-4xl animate-pulse">
        <div className="h-8 w-48 bg-white/40 rounded mb-4" />
        <div className="h-3 w-64 bg-white/40 rounded mb-8" />
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/40 rounded-xl mb-3" />)}
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileText size={22} style={{ color: 'var(--color-muted)' }} />
          <div>
            <h1 className="text-[18px] font-medium" style={{ color: 'var(--color-text)' }}>
              Documents
            </h1>
            <p className="text-[11px] font-light mt-0.5" style={{ color: 'var(--color-muted)' }}>
              Ordered by contractual precedence
            </p>
          </div>
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search all documents…"
            className="pl-7 pr-3 py-1.5 rounded-lg glass-t text-[11px] font-light focus:outline-none transition-colors w-48"
            style={{ color: 'var(--color-text)' }}
          />
        </div>
      </div>

      {/* Precedence sections */}
      <div className="space-y-3">
        {DOCUMENT_PRECEDENCE.map(tier => {
          const isExpanded = expandedTiers.has(tier.key)
          const count = getTierCount(tier)
          const hasDocs = tierDocs[tier.key]?.length > 0
          const hasSchedules = tier.includesSelections && groupedSchedule.length > 0
          const hasContent = hasDocs || hasSchedules
          const TierIcon = tier.icon

          return (
            <div key={tier.key} className="glass-s overflow-hidden">
              {/* Tier header */}
              <button
                onClick={() => toggleTier(tier.key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/50 flex items-center justify-center shrink-0">
                    <TierIcon size={16} style={{ color: 'var(--color-muted)' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[14px] font-medium" style={{ color: 'var(--color-text)' }}>
                        {tier.label}
                      </h2>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/50"
                            style={{ color: 'var(--color-muted)' }}>
                        {count}
                      </span>
                      <span className="text-[9px] uppercase tracking-[1.5px] font-medium px-1.5 py-0.5 rounded bg-white/30"
                            style={{ color: 'var(--color-muted)' }}>
                        Tier {tier.tier}
                      </span>
                    </div>
                    <p className="text-[11px] font-light mt-0.5" style={{ color: 'var(--color-muted)' }}>
                      {tier.description}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {isExpanded
                    ? <ChevronDown size={14} style={{ color: 'var(--color-muted)' }} />
                    : <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} />}
                </div>
              </button>

              {/* Tier content */}
              {isExpanded && (
                <div className="border-t border-white/30 px-5 py-4">
                  {!hasContent && (
                    <p className="text-[12px] font-light py-4 text-center" style={{ color: 'var(--color-muted)' }}>
                      No {tier.label.toLowerCase()} shared yet.
                    </p>
                  )}

                  {/* Document rows for this tier */}
                  {hasDocs && (
                    <div className="space-y-2 mb-3">
                      {tierDocs[tier.key].map(doc => (
                        isArchitect
                          ? <ArchitectDocRow key={doc.id} doc={doc} onClick={() => openDocument(doc)} />
                          : <ClientDocRow key={doc.id} doc={doc} onClick={() => openDocument(doc)} />
                      ))}
                    </div>
                  )}

                  {/* Schedule selections (only in the Schedules tier) */}
                  {tier.includesSelections && hasSchedules && (
                    <div className="space-y-2">
                      {hasDocs && (
                        <div className="border-t border-white/20 my-3" />
                      )}
                      <p className="text-[10px] uppercase tracking-[2px] font-medium mb-2 px-1"
                         style={{ color: 'var(--color-muted)' }}>
                        Selections
                      </p>
                      {groupedSchedule.map(group => {
                        const isGroupExpanded = expandedGroups.has(group.group_key)
                        return (
                          <div key={group.group_key} className="glass-t overflow-hidden">
                            <button
                              onClick={() => toggleGroup(group.group_key)}
                              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/40 transition-colors"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-[13px] font-medium" style={{ color: 'var(--color-text)' }}>
                                    {group.group_name}
                                  </h3>
                                  <span className="text-[10px] bg-white/50 px-1.5 py-0.5 rounded"
                                        style={{ color: 'var(--color-muted)' }}>
                                    {group.items.length}
                                  </span>
                                </div>
                                <p className="text-[11px] font-light mt-0.5" style={{ color: 'var(--color-muted)' }}>
                                  {group.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isGroupExpanded
                                  ? <ChevronDown size={12} style={{ color: 'var(--color-muted)' }} />
                                  : <ChevronRight size={12} style={{ color: 'var(--color-muted)' }} />}
                              </div>
                            </button>

                            {isGroupExpanded && (
                              <div className="border-t border-white/20 px-4 py-3 space-y-1">
                                {renderScheduleItems(group)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Empty state for selections when no schedule docs but tier is schedules */}
                  {tier.includesSelections && !hasSchedules && !hasDocs && null /* already handled by !hasContent above */}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Schedule items renderer ── */
function renderScheduleItems(group) {
  const parents = group.items.filter(i => !i.is_component)
  const childSelMap = new Map()
  group.items.forEach(i => { if (i.is_component) childSelMap.set(i.selection_id, i) })
  const componentMap = new Map()
  parents.forEach(p => {
    const kids = (p.components || [])
      .map(c => childSelMap.get(c.id))
      .filter(Boolean)
    if (kids.length) componentMap.set(p.portal_id, kids)
  })
  const linkedChildIds = new Set()
  for (const kids of componentMap.values()) kids.forEach(k => linkedChildIds.add(k.portal_id))
  const orphans = group.items.filter(i => i.is_component && !linkedChildIds.has(i.portal_id))

  const renderRow = (item, isChild = false) => {
    const Icon = KIND_ICONS[item.selection_kind] || Package
    return (
      <div key={item.portal_id}
        className={`grid gap-3 py-3.5 text-[12px] rounded-lg border transition-colors items-start ${
          isChild
            ? 'border-white/10 bg-white/[0.03] hover:bg-white/10 ml-6 pl-4 pr-4 border-l-2 border-l-[var(--color-border)]/40'
            : 'border-white/40 bg-white/20 hover:bg-white/35 px-4 shadow-sm'
        }`}
        style={{ gridTemplateColumns: isChild ? '48px 48px 2fr 2.5fr 1.5fr 80px' : '60px 48px 2fr 2.5fr 1.5fr 80px' }}>
        {/* CODE */}
        <div>
          {isChild ? (
            <span className="text-[9px] tracking-tight leading-none uppercase" style={{ color: 'var(--color-muted)' }}>
              {item.component_role?.replace(/_/g, ' ') || '\u2014'}
            </span>
          ) : item.code ? (
            <span className="inline-block font-semibold text-[11px] tracking-tight leading-none px-2 py-1 rounded-full border bg-white/20 whitespace-nowrap"
                  style={{ color: 'var(--color-text)', borderColor: 'rgba(26,26,26,0.3)' }}>
              {item.code}
            </span>
          ) : (
            <span className="text-[10px]" style={{ color: 'var(--color-border)' }}>{'\u2014'}</span>
          )}
          {!isChild && (item.code_title || item.selection_kind) && (
            <span className="block text-[8px] mt-1 uppercase tracking-wider leading-tight" style={{ color: 'var(--color-muted)' }}>
              {item.code_title || item.selection_kind?.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        {/* IMAGE */}
        <div>
          {item.portal_image_url ? (
            <img src={item.portal_image_url} alt="" style={{
              width: isChild ? 36 : 48, height: isChild ? 36 : 48, borderRadius: 8, objectFit: 'cover',
              border: '1px solid rgba(0,0,0,0.06)',
            }} loading="lazy"
            onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<div style="width:${isChild ? 36 : 48}px;height:${isChild ? 36 : 48}px;border-radius:8px;background:rgba(255,255,255,0.5);border:1px solid rgba(0,0,0,0.04)"></div>` }}
            />
          ) : (
            <div style={{
              width: isChild ? 36 : 48, height: isChild ? 36 : 48, borderRadius: 8,
              background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={isChild ? 12 : 16} style={{ color: 'var(--color-border)' }} />
            </div>
          )}
        </div>
        {/* ITEM NAME */}
        <div>
          <div className={`leading-snug ${isChild ? 'text-[11px]' : 'font-medium'}`}
               style={{ color: 'var(--color-text)' }}>
            {item.title || '\u2014'}
          </div>
        </div>
        {/* BRAND / PRODUCT */}
        <div className="text-[11px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
          {item.manufacturer_name && (
            <span className={isChild ? '' : 'font-medium'} style={{ color: 'var(--color-text)' }}>
              {item.manufacturer_name}
            </span>
          )}
          {item.manufacturer_name && item.model && <br />}
          <span style={{ color: 'var(--color-muted)' }}>{item.model || (!item.manufacturer_name && '\u2014')}</span>
        </div>
        {/* COLOUR */}
        <div className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text)', wordBreak: 'break-word' }}>
          {item.colour || <span style={{ color: 'var(--color-muted)' }}>{'\u2014'}</span>}
        </div>
        {/* STATUS */}
        <div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
            item.approval_status === 'locked' ? 'bg-[var(--color-approved)]/10' :
            item.approval_status === 'proposed' ? 'bg-[var(--color-pending)]/10' :
            'bg-white/40'
          }`} style={{
            color: item.approval_status === 'locked' ? 'var(--color-approved)' :
                   item.approval_status === 'proposed' ? 'var(--color-pending)' :
                   'var(--color-muted)'
          }}>
            {STATUS_LABELS[item.approval_status] || item.approval_status || '\u2014'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      {parents.map(parent => (
        <div key={parent.portal_id} className="space-y-1">
          {renderRow(parent, false)}
          {(componentMap.get(parent.portal_id) || []).map(child => renderRow(child, true))}
        </div>
      ))}
      {orphans.map(item => renderRow(item, true))}
    </>
  )
}

/* ── Document Viewer ── */
function DocumentViewer({ doc, onBack }) {
  const hasContent = !!doc.content_html

  return (
    <div className="max-w-4xl">
      <style>{DOC_VIEWER_STYLES}</style>

      {/* Back button bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-t text-[11px] font-medium hover:bg-white/60 transition-all"
          style={{ color: 'var(--color-muted)' }}
        >
          <ArrowLeft size={12} />
          Documents
        </button>
        <div className="flex-1" />
        <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded" style={{ color: 'var(--color-muted)' }}>
          {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type?.replace(/_/g, ' ') || 'Document'}
        </span>
        {doc.version && (
          <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{doc.version}</span>
        )}
      </div>

      {/* Document content panel */}
      <div className="glass rounded-2xl shadow-sm overflow-hidden">
        {hasContent ? (
          <div className="doc-viewer-content p-8 md:p-10 lg:p-12">
            <div dangerouslySetInnerHTML={{ __html: doc.content_html }} />
          </div>
        ) : (
          /* Fallback: render from metadata */
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center">
                <FileText size={24} strokeWidth={1.2} style={{ color: 'var(--color-muted)' }} />
              </div>
              <div>
                <h1 className="text-[15px] font-medium" style={{ color: 'var(--color-text)' }}>
                  {doc.title || 'Untitled Document'}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] bg-white/50 px-1.5 py-0.5 rounded" style={{ color: 'var(--color-muted)' }}>
                    {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-medium" style={{
                    color: doc.status === 'approved' ? 'var(--color-approved)' :
                           doc.status === 'for_review' ? 'var(--color-pending)' :
                           'var(--color-muted)'
                  }}>
                    {doc.status?.replace(/_/g, ' ')}
                  </span>
                  {doc.version && <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{doc.version}</span>}
                </div>
              </div>
            </div>

            {doc.stage && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-white/40 border border-white/30">
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-muted)' }}>Stage</span>
                <p className="text-[14px] mt-0.5" style={{ color: 'var(--color-text)' }}>{doc.stage}</p>
              </div>
            )}

            {doc.notes && (
              <div className="mb-4">
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-muted)' }}>Summary</span>
                <p className="text-[14px] mt-1 leading-relaxed font-light" style={{ color: 'var(--color-text)' }}>{doc.notes}</p>
              </div>
            )}

            {doc.shareNote && (
              <div className="mb-4 px-4 py-3 rounded-lg border-l-2" style={{ background: 'rgba(107,79,0,0.05)', borderColor: 'var(--color-pending)' }}>
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--color-muted)' }}>Architect Note</span>
                <p className="text-[14px] mt-1 font-light italic" style={{ color: 'var(--color-text)' }}>{doc.shareNote}</p>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-white/30">
              <p className="text-[11px] font-light" style={{ color: 'var(--color-muted)' }}>
                Full document content is being prepared. Contact your architect for the complete document.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Architect document row ── */
function ArchitectDocRow({ doc, onClick }) {
  const typeLabel = DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type?.replace(/_/g, ' ') || 'Document'
  const hasContent = !!doc.content_html

  const statusColor = {
    approved: 'var(--color-approved)',
    for_review: 'var(--color-pending)',
    draft: 'var(--color-muted)',
    issued: 'var(--color-accent)',
  }[doc.status] || 'var(--color-muted)'

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-4 p-4 rounded-xl glass-t glass-t-hover hover:shadow-sm transition-all cursor-pointer group"
    >
      <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center shrink-0 group-hover:bg-white/80 transition-colors">
        <FileText size={16} strokeWidth={1.5} style={{ color: 'var(--color-muted)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[14px] font-normal truncate" style={{ color: 'var(--color-text)' }}>{doc.title}</h3>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] bg-white/50 px-1.5 py-0.5 rounded" style={{ color: 'var(--color-muted)' }}>{typeLabel}</span>
          <span className="text-[10px] font-medium" style={{ color: statusColor }}>
            {doc.status?.replace(/_/g, ' ')}
          </span>
          {doc.version && <span className="text-[10px] font-light" style={{ color: 'var(--color-muted)' }}>{doc.version}</span>}
          {doc.file_size_bytes && <span className="text-[10px] font-light" style={{ color: 'var(--color-muted)' }}>{formatSize(doc.file_size_bytes)}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] bg-white/40 px-2 py-0.5 rounded" style={{ color: 'var(--color-muted)' }}>
          {doc.stage}
        </span>
        <div className="w-7 h-7 rounded-md flex items-center justify-center group-hover:text-[var(--color-accent)] transition-colors"
             style={{ color: 'var(--color-muted)' }}>
          <Eye size={13} />
        </div>
      </div>
    </button>
  )
}

/* ── Client document row ── */
function ClientDocRow({ doc, onClick }) {
  const pd = doc.project_documents || {}
  const isNew = !doc.viewed_at
  const typeLabel = DOC_TYPE_LABELS[pd.doc_type] || (pd.doc_type || '').replace(/_/g, ' ') || 'Document'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-4 p-4 rounded-xl glass-t glass-t-hover transition-all hover:shadow-sm cursor-pointer group ${
        isNew ? 'glass-pending border-l-[3px]' : ''
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-white/50 flex items-center justify-center shrink-0 group-hover:bg-white/70 transition-colors">
        <FileText size={16} strokeWidth={1.5} style={{ color: 'var(--color-muted)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-normal truncate" style={{ color: 'var(--color-text)' }}>{pd.title || 'Untitled'}</h3>
          {isNew && (
            <span className="text-[9px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(107,79,0,0.1)', color: 'var(--color-pending)' }}>
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {typeLabel && <span className="text-[10px] bg-white/40 px-1.5 py-0.5 rounded" style={{ color: 'var(--color-muted)' }}>{typeLabel}</span>}
          {pd.version && <span className="text-[12px] font-light" style={{ color: 'var(--color-muted)' }}>{pd.version}</span>}
          {pd.file_size_bytes && <span className="text-[12px] font-light" style={{ color: 'var(--color-muted)' }}>{formatSize(pd.file_size_bytes)}</span>}
          <span className="text-[12px] font-light flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
            <Clock size={10} /> {formatDate(doc.shared_at)}
          </span>
        </div>
        {doc.share_note && (
          <p className="text-[12px] font-light mt-1 italic" style={{ color: 'var(--color-muted)' }}>{doc.share_note}</p>
        )}
      </div>

      <div className="w-7 h-7 rounded-md flex items-center justify-center group-hover:text-[var(--color-accent)] transition-colors shrink-0"
           style={{ color: 'var(--color-muted)' }}>
        <Eye size={14} />
      </div>
    </button>
  )
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
