import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import { useAuth } from '../hooks/useAuth'
import {
  FileText, Eye, Clock, Search, Folder, ChevronDown, ChevronRight,
  Package, Palette, Wrench, Grid3X3, ListChecks, Download, ExternalLink,
  ArrowLeft, X
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
  const [activeTab, setActiveTab] = useState('documents')
  const [docs, setDocs] = useState([])
  const [allProjectDocs, setAllProjectDocs] = useState([])
  const [scheduleData, setScheduleData] = useState({ groups: [], meta: { total: 0, confirmed: 0, approved: 0, to_review: 0 } })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
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
      // Selections now come from the portal-selections edge function
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
    // For architect view, doc is the project_documents row directly
    // For client view, doc is the share row with project_documents nested
    const pd = isArchitect ? doc : doc.project_documents
    if (!pd) return
    setSelectedDoc({ ...pd, shareId: doc.id, shareNote: doc.share_note })
    if (!isArchitect && !doc.viewed_at) markViewed(doc.id)
  }

  function toggleGroup(key) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Filter schedule data from edge function by search term
  const groupedSchedule = (scheduleData.groups || []).map(g => {
    if (!search) return g
    const q = search.toLowerCase()
    const items = g.items.filter(item => {
      const text = [item.code, item.title, item.manufacturer_name, item.model, item.colour, item.schedule_group].filter(Boolean).join(' ').toLowerCase()
      return text.includes(q)
    })
    return { ...g, items, item_count: items.length }
  }).filter(g => g.items.length > 0)

  const documentList = isArchitect ? allProjectDocs : docs
  const filteredDocs = documentList.filter(d => {
    if (!search) return true
    const title = isArchitect ? d.title : (d.project_documents?.title || '')
    const docType = isArchitect ? d.doc_type : (d.project_documents?.doc_type || '')
    return [title, docType].join(' ').toLowerCase().includes(search.toLowerCase())
  })

  const groupedDocs = isArchitect
    ? Object.entries(
        filteredDocs.reduce((acc, d) => {
          const group = d.hierarchy_group || 'Other'
          if (!acc[group]) acc[group] = []
          acc[group].push(d)
          return acc
        }, {})
      )
    : null

  const totalScheduleItems = scheduleData.meta?.total || 0
  const totalDocs = isArchitect ? allProjectDocs.length : docs.length

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
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1 backdrop-blur-xl bg-white/40 rounded-lg p-0.5 border border-white/40">
          {[
            { key: 'documents', label: 'Documents', icon: FileText, count: totalDocs },
            { key: 'schedules', label: 'Schedules', icon: Grid3X3, count: totalScheduleItems },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSearch('') }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                activeTab === t.key
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <t.icon size={11} />
              {t.label}
              <span className={`text-[9px] px-1 py-0.5 rounded ${
                activeTab === t.key ? 'bg-white/40' : 'bg-white/40'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'schedules' ? 'Search selections\u2026' : 'Search documents\u2026'}
            className="pl-7 pr-3 py-1.5 rounded-lg border border-white/40 backdrop-blur-xl bg-white/40 text-[11px] font-light focus:outline-none focus:border-[var(--color-accent)] transition-colors w-48"
          />
        </div>
      </div>

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <div>
          {isArchitect && groupedDocs ? (
            <div className="space-y-4">
              {groupedDocs.map(([group, items]) => (
                <div key={group}>
                  <h3 className="text-[10px] tracking-[2px] uppercase text-[var(--color-muted)] font-medium mb-2 px-1">
                    {group.replace(/_/g, ' ')}
                  </h3>
                  <div className="space-y-2">
                    {items.map(doc => (
                      <ArchitectDocRow key={doc.id} doc={doc} onClick={() => openDocument(doc)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {filteredDocs.map(doc => (
                <div key={doc.id} className="mb-2">
                  <ClientDocRow doc={doc} onClick={() => openDocument(doc)} />
                </div>
              ))}
            </div>
          )}

          {filteredDocs.length === 0 && (
            <div className="text-center py-20 backdrop-blur-xl bg-white/40 rounded-xl border border-white/40">
              <FileText size={24} className="mx-auto text-[var(--color-border)] mb-3" />
              <p className="text-sm text-[var(--color-muted)] font-light">
                {search ? 'No documents match your search.' : 'No documents shared yet.'}
              </p>
              {!isArchitect && (
                <p className="text-xs text-[var(--color-muted)] font-light mt-1">
                  Documents will appear here when your architect shares them.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedules tab */}
      {activeTab === 'schedules' && (
        <div className="space-y-3">
          {groupedSchedule.map(group => {
            const isExpanded = expandedGroups.has(group.group_key)
            return (
              <div key={group.group_key} className="backdrop-blur-xl bg-white/40 rounded-xl border border-white/40 overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.group_key)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
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
                    {isExpanded
                      ? <ChevronDown size={14} className="text-[var(--color-muted)]" />
                      : <ChevronRight size={14} className="text-[var(--color-muted)]" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/30 px-4 py-3 space-y-1">
                    {(() => {
                      // Build parent→child hierarchy for visual nesting
                      const parents = group.items.filter(i => !i.is_component)
                      const componentMap = new Map()
                      // Map child selection_ids to their portal items
                      const childSelMap = new Map()
                      group.items.forEach(i => { if (i.is_component) childSelMap.set(i.selection_id, i) })
                      // Link parents to their child portal items via components array
                      parents.forEach(p => {
                        const kids = (p.components || [])
                          .map(c => childSelMap.get(c.id))
                          .filter(Boolean)
                        if (kids.length) componentMap.set(p.portal_id, kids)
                      })
                      // Collect orphan components (not linked to any parent in this group)
                      const linkedChildIds = new Set()
                      for (const kids of componentMap.values()) kids.forEach(k => linkedChildIds.add(k.portal_id))
                      const orphans = group.items.filter(i => i.is_component && !linkedChildIds.has(i.portal_id))

                      const renderRow = (item, isChild = false) => {
                        const Icon = KIND_ICONS[item.selection_kind] || Package
                        return (
                          <div key={item.portal_id}
                            className={`grid gap-3 py-3.5 text-[12px] rounded-lg border transition-colors items-start ${
                              isChild
                                ? 'border-white/20 bg-white/5 hover:bg-white/30 ml-6 pl-4 pr-4 border-l-2 border-l-[var(--color-border)]'
                                : 'border-white/30 bg-white/10 hover:bg-white/40 px-4'
                            }`}
                            style={{ gridTemplateColumns: isChild ? '48px 48px 2fr 2.5fr 1.5fr 80px' : '60px 48px 2fr 2.5fr 1.5fr 80px' }}>
                            {/* CODE */}
                            <div>
                              {isChild ? (
                                <span className="text-[10px] text-[var(--color-muted)] tracking-tight leading-none">{item.component_role?.replace(/_/g, ' ') || '\u2014'}</span>
                              ) : item.code ? (
                                <span className="font-semibold text-[13px] text-[var(--color-text)] tracking-tight leading-none">{item.code}</span>
                              ) : (
                                <span className="text-[10px] text-[var(--color-border)]">{'\u2014'}</span>
                              )}
                              {!isChild && item.selection_kind && (
                                <span className="block text-[8px] text-[var(--color-muted)] mt-1 uppercase tracking-wider">{item.selection_kind.replace(/_/g, ' ')}</span>
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
                              <div className={`leading-snug text-[var(--color-text)] ${isChild ? 'text-[11px]' : 'font-medium'}`}>{item.title || '\u2014'}</div>
                            </div>
                            {/* BRAND / PRODUCT */}
                            <div className="text-[11px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
                              {item.manufacturer_name && <span className={`text-[var(--color-text)] ${isChild ? '' : 'font-medium'}`}>{item.manufacturer_name}</span>}
                              {item.manufacturer_name && item.model && <br />}
                              <span className="text-[var(--color-muted)]">{item.model || (!item.manufacturer_name && '\u2014')}</span>
                            </div>
                            {/* COLOUR */}
                            <div className="text-[var(--color-text)] text-[11px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
                              {item.colour || <span className="text-[var(--color-muted)]">{'\u2014'}</span>}
                            </div>
                            {/* STATUS */}
                            <div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                item.approval_status === 'locked' ? 'bg-[var(--color-confirmed)]/10 text-[var(--color-confirmed)]' :
                                item.approval_status === 'proposed' ? 'bg-[var(--color-pending)]/10 text-[var(--color-pending)]' :
                                'bg-white/40 text-[var(--color-muted)]'
                              }`}>
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
                    })()}
                  </div>
                )}
              </div>
            )
          })}

          {groupedSchedule.length === 0 && (
            <div className="text-center py-20 backdrop-blur-xl bg-white/40 rounded-xl border border-white/40">
              <ListChecks size={24} className="mx-auto text-[var(--color-border)] mb-3" />
              <p className="text-sm text-[var(--color-muted)] font-light">
                {search ? 'No items match your search.' : 'No schedule data yet.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl bg-white/40 border border-white/40 text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/60 transition-all"
        >
          <ArrowLeft size={12} />
          Documents
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-[var(--color-muted)] bg-white/30 px-2 py-0.5 rounded">
          {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type?.replace(/_/g, ' ') || 'Document'}
        </span>
        {doc.version && (
          <span className="text-[10px] text-[var(--color-muted)]">{doc.version}</span>
        )}
      </div>

      {/* Document content panel */}
      <div className="backdrop-blur-xl bg-white/70 rounded-2xl border border-white/50 shadow-sm overflow-hidden">
        {hasContent ? (
          <div className="doc-viewer-content p-8 md:p-10 lg:p-12">
            <div dangerouslySetInnerHTML={{ __html: doc.content_html }} />
          </div>
        ) : (
          /* Fallback: render from metadata */
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center">
                <FileText size={24} strokeWidth={1.2} className="text-[var(--color-muted)]" />
              </div>
              <div>
                <h1 className="text-lg font-medium text-[var(--color-text)]">{doc.title || 'Untitled Document'}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[var(--color-muted)] bg-white/50 px-1.5 py-0.5 rounded">
                    {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-medium" style={{
                    color: doc.status === 'approved' ? 'var(--color-approved)' :
                           doc.status === 'for_review' ? 'var(--color-pending)' :
                           'var(--color-muted)'
                  }}>
                    {doc.status?.replace(/_/g, ' ')}
                  </span>
                  {doc.version && <span className="text-[10px] text-[var(--color-muted)]">{doc.version}</span>}
                </div>
              </div>
            </div>

            {doc.stage && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-white/40 border border-white/30">
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-medium">Stage</span>
                <p className="text-sm text-[var(--color-text)] mt-0.5">{doc.stage}</p>
              </div>
            )}

            {doc.notes && (
              <div className="mb-4">
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-medium">Summary</span>
                <p className="text-sm text-[var(--color-text)] mt-1 leading-relaxed font-light">{doc.notes}</p>
              </div>
            )}

            {doc.shareNote && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--color-pending)]/5 border-l-2 border-[var(--color-pending)]">
                <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-medium">Architect Note</span>
                <p className="text-sm text-[var(--color-text)] mt-1 font-light italic">{doc.shareNote}</p>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-white/30">
              <p className="text-[11px] text-[var(--color-muted)] font-light">
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
      className="w-full text-left flex items-center gap-4 p-4 rounded-xl backdrop-blur-xl bg-white/50 border border-white/40 hover:bg-white/70 hover:shadow-sm transition-all cursor-pointer group"
    >
      <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center shrink-0 group-hover:bg-white/80 transition-colors">
        <FileText size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-normal truncate text-[var(--color-text)]">{doc.title}</h3>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-[var(--color-muted)] bg-white/50 px-1.5 py-0.5 rounded">{typeLabel}</span>
          <span className="text-[10px] font-medium" style={{ color: statusColor }}>
            {doc.status?.replace(/_/g, ' ')}
          </span>
          {doc.version && <span className="text-[10px] text-[var(--color-muted)] font-light">{doc.version}</span>}
          {doc.file_size_bytes && <span className="text-[10px] text-[var(--color-muted)] font-light">{formatSize(doc.file_size_bytes)}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-[var(--color-muted)] bg-white/40 px-2 py-0.5 rounded">
          {doc.stage}
        </span>
        <div className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-muted)] group-hover:text-[var(--color-accent)] transition-colors">
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
      className={`w-full text-left flex items-center gap-4 p-4 rounded-xl backdrop-blur-xl bg-white/40 border transition-all hover:shadow-sm hover:bg-white/60 cursor-pointer group ${
        isNew ? 'border-[var(--color-pending)]/40 border-l-[3px]' : 'border-white/40'
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-white/50 flex items-center justify-center shrink-0 group-hover:bg-white/70 transition-colors">
        <FileText size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-normal truncate">{pd.title || 'Untitled'}</h3>
          {isNew && (
            <span className="text-[9px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded bg-[var(--color-pending)]/10 text-[var(--color-pending)]">
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {typeLabel && <span className="text-[10px] text-[var(--color-muted)] bg-white/40 px-1.5 py-0.5 rounded">{typeLabel}</span>}
          {pd.version && <span className="text-xs text-[var(--color-muted)] font-light">{pd.version}</span>}
          {pd.file_size_bytes && <span className="text-xs text-[var(--color-muted)] font-light">{formatSize(pd.file_size_bytes)}</span>}
          <span className="text-xs text-[var(--color-muted)] font-light flex items-center gap-1">
            <Clock size={10} /> {formatDate(doc.shared_at)}
          </span>
        </div>
        {doc.share_note && (
          <p className="text-xs text-[var(--color-muted)] font-light mt-1 italic">{doc.share_note}</p>
        )}
      </div>

      <div className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-muted)] group-hover:text-[var(--color-accent)] transition-colors shrink-0">
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
