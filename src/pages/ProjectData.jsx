import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import {
  Database, ChevronDown, ChevronRight, AlertTriangle, CheckCircle,
  Package, Layers, FileText, Settings, RefreshCw, Search
} from 'lucide-react'

const TABS = [
  { key: 'selections', label: 'Selections', icon: Package },
  { key: 'decisions', label: 'Decisions', icon: CheckCircle },
  { key: 'risks', label: 'Risk Flags', icon: AlertTriangle },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'portal', label: 'Portal Status', icon: Layers },
]

export default function ProjectData({ projectId }) {
  const { isArchitect } = useProject()
  const [activeTab, setActiveTab] = useState('selections')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedKind, setExpandedKind] = useState(null)

  useEffect(() => {
    if (!projectId || !isArchitect) return
    loadAllData()
  }, [projectId, isArchitect])

  async function loadAllData() {
    setLoading(true)
    const [selRes, decRes, riskRes, docRes, portalRes, grpRes] = await Promise.all([
      supabase.from('project_selections').select('*').eq('project_id', projectId).order('selection_kind').order('title'),
      supabase.from('project_decisions').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('risk_flags').select('*').eq('project_id', projectId).order('severity'),
      supabase.from('project_documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('homeowner_selections_portal').select('*, project_selections:project_selection_id(title, selection_kind)').eq('project_id', projectId).eq('active', true),
      supabase.from('schedule_groups').select('*').eq('project_id', projectId).order('display_order'),
    ])
    setData({
      selections: selRes.data || [],
      decisions: decRes.data || [],
      risks: riskRes.data || [],
      documents: docRes.data || [],
      portal: portalRes.data || [],
      groups: grpRes.data || [],
    })
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    await supabase.rpc('sync_portal_selections', { p_project_id: projectId })
    await loadAllData()
    setSyncing(false)
  }

  if (!isArchitect) {
    return (
      <div className="text-center py-20">
        <Database size={24} className="mx-auto text-[var(--color-border)] mb-3" />
        <p className="text-sm text-[var(--color-muted)] font-light">Architect access required.</p>
      </div>
    )
  }

  if (loading) return <div className="animate-pulse"><div className="h-8 w-48 bg-[var(--color-border)] rounded mb-8" /></div>

  // Selection stats
  const selByKind = {}
  const selByStatus = {}
  ;(data.selections || []).forEach(s => {
    selByKind[s.selection_kind] = (selByKind[s.selection_kind] || 0) + 1
    selByStatus[s.status] = (selByStatus[s.status] || 0) + 1
  })

  // Portal stats
  const portalByStatus = {}
  ;(data.portal || []).forEach(p => {
    portalByStatus[p.approval_status] = (portalByStatus[p.approval_status] || 0) + 1
  })

  // Filter selections by search
  const filteredSelections = search
    ? (data.selections || []).filter(s =>
        s.title?.toLowerCase().includes(search.toLowerCase()) ||
        s.model?.toLowerCase().includes(search.toLowerCase()) ||
        s.manufacturer_name?.toLowerCase().includes(search.toLowerCase())
      )
    : data.selections || []

  // Group selections by kind
  const selectionsByKind = {}
  filteredSelections.forEach(s => {
    if (!selectionsByKind[s.selection_kind]) selectionsByKind[s.selection_kind] = []
    selectionsByKind[s.selection_kind].push(s)
  })

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-tight mb-1 flex items-center gap-2">
            <Database size={20} strokeWidth={1.5} /> Project Data
          </h1>
          <p className="text-sm text-[var(--color-muted)] font-light">
            Full Supabase schema for this project — {data.selections?.length || 0} selections, {data.decisions?.length || 0} decisions, {data.risks?.length || 0} risk flags
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white text-xs rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Portal'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Selections" value={data.selections?.length || 0} sub={Object.entries(selByStatus).map(([k,v]) => `${v} ${k}`).join(', ')} />
        <SummaryCard label="Decisions" value={data.decisions?.length || 0} sub={`${(data.decisions || []).filter(d => d.status === 'resolved').length} resolved`} />
        <SummaryCard label="Risk Flags" value={data.risks?.length || 0} sub={`${(data.risks || []).filter(r => r.severity === 'high').length} high`} accent={data.risks?.some(r => r.severity === 'high')} />
        <SummaryCard label="Portal Items" value={data.portal?.length || 0} sub={`${portalByStatus.pending || 0} pending, ${portalByStatus.approved || 0} approved`} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 backdrop-blur-xl bg-white/30 rounded-xl p-1 border border-white/40 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/50'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'selections' && (
        <div>
          <div className="mb-4 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search selections…"
              className="w-full pl-9 pr-4 py-2.5 text-xs backdrop-blur-xl bg-white/40 border border-white/40 rounded-xl focus:outline-none focus:border-[var(--color-accent)]/30"
            />
          </div>
          {Object.entries(selectionsByKind).map(([kind, items]) => {
            const isExpanded = expandedKind === kind
            return (
              <div key={kind} className="mb-2">
                <button
                  onClick={() => setExpandedKind(isExpanded ? null : kind)}
                  className="w-full flex items-center justify-between px-4 py-3 backdrop-blur-xl bg-white/40 rounded-xl border border-white/40 hover:bg-white/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{kind}</span>
                    <span className="text-[10px] text-[var(--color-muted)] bg-white/50 px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={14} className="text-[var(--color-muted)]" /> : <ChevronRight size={14} className="text-[var(--color-muted)]" />}
                </button>
                {isExpanded && (
                  <div className="mt-1 space-y-1 pl-2">
                    {items.map(sel => (
                      <div key={sel.id} className="flex items-start gap-3 px-4 py-2.5 bg-white/30 rounded-lg border border-white/30 text-[11px]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--color-text)] truncate">{sel.title}</span>
                            <StatusPill status={sel.status} />
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-[var(--color-muted)]">
                            {sel.manufacturer_name && <span>{sel.manufacturer_name}</span>}
                            {sel.model && <span className="text-[var(--color-text)]">{sel.model}</span>}
                            {sel.spec_reference && <span className="font-mono text-[10px]">{sel.spec_reference}</span>}
                          </div>
                          {sel.notes && <p className="text-[var(--color-muted)] italic mt-0.5">{sel.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'decisions' && (
        <div className="space-y-2">
          {(data.decisions || []).map(d => (
            <div key={d.id} className="flex items-start gap-3 px-5 py-3 backdrop-blur-xl bg-white/40 rounded-xl border border-white/40">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{d.node_key || d.decision_key || d.id}</span>
                  <StatusPill status={d.status} />
                </div>
                {d.domain && <span className="text-[10px] text-[var(--color-muted)] bg-white/50 px-2 py-0.5 rounded-full mt-1 inline-block">{d.domain}</span>}
                {d.rationale && <p className="text-[11px] text-[var(--color-muted)] mt-1">{d.rationale}</p>}
                {d.outcome && <p className="text-[11px] text-[var(--color-text)] mt-0.5">{d.outcome}</p>}
              </div>
              <span className="text-[10px] text-[var(--color-muted)] shrink-0">{d.confidence || ''}</span>
            </div>
          ))}
          {(data.decisions || []).length === 0 && <EmptyState text="No decisions recorded." />}
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="space-y-2">
          {(data.risks || []).map(r => (
            <div key={r.id} className={`flex items-start gap-3 px-5 py-3 backdrop-blur-xl bg-white/40 rounded-xl border ${
              r.severity === 'high' ? 'border-[var(--color-urgent)]/30' :
              r.severity === 'medium' ? 'border-[var(--color-pending)]/30' :
              'border-white/40'
            }`}>
              <AlertTriangle size={14} className={
                r.severity === 'high' ? 'text-[var(--color-urgent)] shrink-0 mt-0.5' :
                r.severity === 'medium' ? 'text-[var(--color-pending)] shrink-0 mt-0.5' :
                'text-[var(--color-muted)] shrink-0 mt-0.5'
              } />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{r.flag_key || r.title || r.id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    r.severity === 'high' ? 'bg-[var(--color-urgent)]/10 text-[var(--color-urgent)]' :
                    r.severity === 'medium' ? 'bg-[var(--color-pending)]/10 text-[var(--color-pending)]' :
                    'bg-white/50 text-[var(--color-muted)]'
                  }`}>{r.severity || 'info'}</span>
                  <StatusPill status={r.status} />
                </div>
                {r.description && <p className="text-[11px] text-[var(--color-muted)] mt-1">{r.description}</p>}
                {r.mitigation && <p className="text-[11px] text-[var(--color-text)] mt-0.5">Mitigation: {r.mitigation}</p>}
              </div>
            </div>
          ))}
          {(data.risks || []).length === 0 && <EmptyState text="No risk flags." />}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-2">
          {(data.documents || []).map(d => (
            <div key={d.id} className="flex items-start gap-3 px-5 py-3 backdrop-blur-xl bg-white/40 rounded-xl border border-white/40">
              <FileText size={14} className="text-[var(--color-muted)] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">{d.document_type || d.title || d.id}</span>
                {d.source && <span className="text-[10px] text-[var(--color-muted)] ml-2">{d.source}</span>}
                {d.notes && <p className="text-[11px] text-[var(--color-muted)] mt-1">{d.notes}</p>}
              </div>
            </div>
          ))}
          {(data.documents || []).length === 0 && <EmptyState text="No documents recorded." />}
        </div>
      )}

      {activeTab === 'portal' && (
        <div>
          {/* Portal sync status by group */}
          <div className="space-y-3">
            {(data.groups || []).map(g => {
              const gItems = (data.portal || []).filter(p => p.schedule_group === g.group_key)
              const pending = gItems.filter(p => p.approval_status === 'pending').length
              const approved = gItems.filter(p => p.approval_status === 'approved').length
              const confirmed = gItems.filter(p => p.approval_status === 'not_applicable').length
              const changeReq = gItems.filter(p => p.approval_status === 'change_requested').length

              return (
                <div key={g.group_key} className="px-5 py-3 backdrop-blur-xl bg-white/40 rounded-xl border border-white/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium">{g.group_name}</span>
                      <span className="text-[10px] text-[var(--color-muted)] ml-2">{g.group_key}</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-muted)]">{gItems.length} items</span>
                  </div>
                  <div className="flex gap-3 mt-2">
                    {pending > 0 && <MiniStat label="pending" value={pending} color="var(--color-pending)" />}
                    {approved > 0 && <MiniStat label="approved" value={approved} color="var(--color-approved)" />}
                    {confirmed > 0 && <MiniStat label="confirmed" value={confirmed} color="var(--color-muted)" />}
                    {changeReq > 0 && <MiniStat label="change req" value={changeReq} color="var(--color-change)" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className={`backdrop-blur-xl bg-white/40 rounded-xl border px-4 py-3 ${accent ? 'border-[var(--color-urgent)]/30' : 'border-white/40'}`}>
      <p className="text-[10px] tracking-[1px] uppercase text-[var(--color-muted)] font-medium">{label}</p>
      <p className="text-xl font-light mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-[var(--color-muted)] mt-0.5">{sub}</p>}
    </div>
  )
}

function StatusPill({ status }) {
  const colors = {
    selected: 'bg-[var(--color-approved)]/10 text-[var(--color-approved)]',
    locked: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
    proposed: 'bg-[var(--color-pending)]/10 text-[var(--color-pending)]',
    resolved: 'bg-[var(--color-approved)]/10 text-[var(--color-approved)]',
    assumed: 'bg-[var(--color-pending)]/10 text-[var(--color-pending)]',
    deferred: 'bg-white/50 text-[var(--color-muted)]',
    open: 'bg-[var(--color-urgent)]/10 text-[var(--color-urgent)]',
    mitigated: 'bg-[var(--color-approved)]/10 text-[var(--color-approved)]',
  }
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colors[status] || 'bg-white/50 text-[var(--color-muted)]'}`}>
      {status}
    </span>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[10px] text-[var(--color-muted)]">{value} {label}</span>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-12">
      <Settings size={20} className="mx-auto text-[var(--color-border)] mb-2" />
      <p className="text-xs text-[var(--color-muted)] font-light">{text}</p>
    </div>
  )
}
