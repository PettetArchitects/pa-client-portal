import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import { useAuth } from '../hooks/useAuth'
import {
  FileText, Eye, Clock, Search, Folder, ChevronDown, ChevronRight,
  Package, Palette, Wrench, Grid3X3, ListChecks, Download, ExternalLink
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

export default function Documents({ projectId }) {
  const { isArchitect } = useProject()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('documents')
  const [docs, setDocs] = useState([])
  const [allProjectDocs, setAllProjectDocs] = useState([])
  const [scheduleGroups, setScheduleGroups] = useState([])
  const [selections, setSelections] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState(new Set())

  useEffect(() => {
    if (!projectId) return
    loadAll()
  }, [projectId])

  async function loadAll() {
    const queries = [
      // Shared documents (for client view)
      supabase
        .from('homeowner_document_shares')
        .select(`*, project_documents:project_document_id (id, title, doc_type, storage_path, file_size_bytes, version, issued_at, notes, status, stage)`)
        .eq('project_id', projectId)
        .eq('active', true)
        .order('shared_at', { ascending: false }),
      // Schedule groups
      supabase
        .from('schedule_groups')
        .select('*')
        .eq('project_id', projectId)
        .eq('visible_to_homeowner', true)
        .order('display_order'),
      // Selections for schedule view
      supabase
        .from('homeowner_selections_portal')
        .select(`*, project_selections:project_selection_id (title, selection_kind, manufacturer_name, supplier_name, model, spec_reference, notes, attributes)`)
        .eq('project_id', projectId)
        .eq('active', true),
    ]

    // Architect gets all project documents directly
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
    const [docRes, grpRes, selRes] = results

    setDocs(docRes.data || [])
    setScheduleGroups(grpRes.data || [])
    setSelections(selRes.data || [])
    if (results[3]) setAllProjectDocs(results[3].data || [])
    setLoading(false)
  }

  async function markViewed(id) {
    await supabase.from('homeowner_document_shares')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', id)
  }

  function toggleGroup(key) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Filter selections by search
  const filteredSelections = selections.filter(s => {
    if (!search) return true
    const sel = s.project_selections || {}
    const text = [sel.title, sel.manufacturer_name, sel.model, s.schedule_group].join(' ').toLowerCase()
    return text.includes(search.toLowerCase())
  })

  // Group selections by schedule_group
  const groupedSchedule = scheduleGroups.map(g => {
    const items = filteredSelections.filter(s => s.schedule_group === g.group_key)
    return { ...g, items }
  }).filter(g => g.items.length > 0)

  // For architects: show all project documents; for clients: show shared documents
  const documentList = isArchitect ? allProjectDocs : docs
  const filteredDocs = documentList.filter(d => {
    if (!search) return true
    const title = isArchitect ? d.title : (d.project_documents?.title || '')
    const docType = isArchitect ? d.doc_type : (d.project_documents?.doc_type || '')
    return [title, docType].join(' ').toLowerCase().includes(search.toLowerCase())
  })

  // Group project docs by hierarchy_group for architect view
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

  const totalScheduleItems = selections.length
  const totalDocs = isArchitect ? allProjectDocs.length : docs.length

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
        <div className="flex gap-1 glass-t rounded-lg p-0.5">
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

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'schedules' ? 'Search selections\u2026' : 'Search documents\u2026'}
            className="pl-7 pr-3 py-1.5 glass-t text-[11px] font-light focus:outline-none focus:border-[var(--color-accent)] transition-colors w-48"
          />
        </div>
      </div>

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <div>
          {isArchitect && groupedDocs ? (
            // Architect view — grouped by hierarchy_group
            <div className="space-y-4">
              {groupedDocs.map(([group, items]) => (
                <div key={group}>
                  <h3 className="text-[10px] tracking-[2px] uppercase text-[var(--color-muted)] font-medium mb-2 px-1">
                    {group.replace(/_/g, ' ')}
                  </h3>
                  <div className="space-y-2">
                    {items.map(doc => (
                      <ArchitectDocRow key={doc.id} doc={doc} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Client view — shared documents
            <div>
              {filteredDocs.map(doc => (
                <div key={doc.id} className="mb-2">
                  <ClientDocRow doc={doc} onView={() => markViewed(doc.id)} />
                </div>
              ))}
            </div>
          )}

          {filteredDocs.length === 0 && (
            <div className="text-center py-20 glass-t">
              <FileText size={24} className="mx-auto text-[var(--color-border)] mb-3" />
              <p className="text-[13px] text-[var(--color-muted)] font-light">
                {search ? 'No documents match your search.' : 'No documents shared yet.'}
              </p>
              {!isArchitect && (
                <p className="text-[11px] text-[var(--color-muted)] font-light mt-1">
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
              <div key={group.group_key} className="glass-t overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.group_key)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[13px] font-medium" style={{ color: 'var(--color-text)' }}>{group.group_name}</h2>
                      <span className="text-[10px] text-[var(--color-muted)] bg-white/50 px-1.5 py-0.5 rounded">
                        {group.items.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-muted)] font-light mt-0.5">{group.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded
                      ? <ChevronDown size={14} style={{ color: 'var(--color-muted)' }} />
                      : <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/30 px-4 py-3 space-y-2">
                    {group.items.map(item => {
                      const sel = item.project_selections || {}
                      const attrs = sel.attributes || {}
                      const Icon = KIND_ICONS[sel.selection_kind] || Package
                      return (
                        <div key={item.id} className="grid gap-3 px-4 py-3.5 text-[12px] rounded-lg border border-white/30 bg-white/10 hover:bg-white/40 transition-colors items-start"
                          style={{ gridTemplateColumns: '48px 2.5fr 3fr 1.5fr 80px' }}>
                          <div>
                            {item.portal_image_url ? (
                              <img src={item.portal_image_url} alt="" style={{
                                width: 48, height: 48, borderRadius: 8, objectFit: 'cover',
                                border: '1px solid rgba(0,0,0,0.06)',
                              }} loading="lazy"
                              onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div style="width:48px;height:48px;border-radius:8px;background:rgba(255,255,255,0.5);border:1px solid rgba(0,0,0,0.04)"></div>' }}
                              />
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
                            <div className="font-medium leading-snug text-[var(--color-text)]">{sel.title || '\u2014'}</div>
                            {sel.selection_kind && (
                              <span className="text-[9px] text-[var(--color-muted)] mt-0.5 inline-block">{sel.selection_kind.replace(/_/g, ' ')}</span>
                            )}
                          </div>
                          <div className="text-[11px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
                            {sel.manufacturer_name && <span className="font-medium text-[var(--color-text)]">{sel.manufacturer_name}</span>}
                            {sel.manufacturer_name && sel.model && <br />}
                            <span className="text-[var(--color-muted)]">{sel.model || (!sel.manufacturer_name && '\u2014')}</span>
                          </div>
                          <div className="text-[var(--color-text)] text-[11px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
                            {attrs.colour || <span className="text-[var(--color-muted)]">{'\u2014'}</span>}
                          </div>
                          <div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                              item.approval_status === 'locked' ? 'bg-[var(--color-approved)]/10 text-[var(--color-approved)]' :
                              item.approval_status === 'proposed' ? 'bg-[var(--color-pending)]/10 text-[var(--color-pending)]' :
                              'bg-white/40 text-[var(--color-muted)]'
                            }`}>
                              {STATUS_LABELS[item.approval_status] || item.approval_status || '\u2014'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {groupedSchedule.length === 0 && (
            <div className="text-center py-20 glass-t">
              <ListChecks size={24} className="mx-auto text-[var(--color-border)] mb-3" />
              <p className="text-[13px] text-[var(--color-muted)] font-light">
                {search ? 'No items match your search.' : 'No schedule data yet.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Architect document row ── */
function ArchitectDocRow({ doc }) {
  const typeLabel = DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type?.replace(/_/g, ' ') || 'Document'

  const statusColor = {
    approved: 'var(--color-approved)',
    for_review: 'var(--color-pending)',
    draft: 'var(--color-muted)',
    issued: 'var(--color-accent)',
  }[doc.status] || 'var(--color-muted)'

  return (
    <div className="flex items-center gap-4 p-4 glass-s glass-s-hover transition-all">
      <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
        <FileText size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[13px] font-normal truncate text-[var(--color-text)]">{doc.title}</h3>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-[var(--color-muted)] bg-white/50 px-1.5 py-0.5 rounded">{typeLabel}</span>
          <span className="text-[10px] font-medium" style={{ color: statusColor }}>
            {doc.status?.replace(/_/g, ' ')}
          </span>
          {doc.version && <span className="text-[10px] text-[var(--color-muted)] font-light">{doc.version}</span>}
          {doc.file_size_bytes && <span className="text-[10px] text-[var(--color-muted)] font-light">{formatSize(doc.file_size_bytes)}</span>}
        </div>
      </div>

      <span className="text-[10px] text-[var(--color-muted)] bg-white/40 px-2 py-0.5 rounded shrink-0">
        {doc.stage}
      </span>
    </div>
  )
}

/* ── Client document row ── */
function ClientDocRow({ doc, onView }) {
  const pd = doc.project_documents || {}
  const isNew = !doc.viewed_at
  const typeLabel = DOC_TYPE_LABELS[pd.doc_type] || (pd.doc_type || '').replace(/_/g, ' ') || 'Document'

  return (
    <div className={`flex items-center gap-4 p-4 glass-t glass-t-hover transition-all ${
      isNew ? 'border-[var(--color-pending)]/40 border-l-[3px]' : 'border-white/40'
    }`}>
      <div className="w-9 h-9 rounded-lg bg-white/50 flex items-center justify-center shrink-0">
        <FileText size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-normal truncate" style={{ color: 'var(--color-text)' }}>{pd.title || 'Untitled'}</h3>
          {isNew && (
            <span className="text-[9px] font-medium tracking-wider uppercase px-1.5 py-0.5 rounded bg-[var(--color-pending)]/10 text-[var(--color-pending)]">
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {typeLabel && <span className="text-[10px] text-[var(--color-muted)] bg-white/40 px-1.5 py-0.5 rounded">{typeLabel}</span>}
          {pd.version && <span className="text-[12px] text-[var(--color-muted)] font-light">{pd.version}</span>}
          {pd.file_size_bytes && <span className="text-[12px] text-[var(--color-muted)] font-light">{formatSize(pd.file_size_bytes)}</span>}
          <span className="text-[12px] text-[var(--color-muted)] font-light flex items-center gap-1">
            <Clock size={10} style={{ color: 'var(--color-muted)' }} /> {formatDate(doc.shared_at)}
          </span>
        </div>
        {doc.share_note && (
          <p className="text-[12px] text-[var(--color-muted)] font-light mt-1 italic">{doc.share_note}</p>
        )}
      </div>

      <button
        onClick={onView}
        className="shrink-0 w-8 h-8 rounded-lg border border-white/40 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
        title="View document"
      >
        <Eye size={14} style={{ color: 'var(--color-muted)' }} />
      </button>
    </div>
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
