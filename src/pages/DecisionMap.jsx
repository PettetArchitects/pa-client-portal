import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import { Compass, ChevronDown, ChevronUp, ArrowRight, CheckCircle2, AlertTriangle, Clock, Info } from 'lucide-react'

const STATUS_CONFIG = {
  confirmed: { color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', icon: CheckCircle2, label: 'Confirmed' },
  assumed:   { color: 'bg-amber-500/20 border-amber-500/40 text-amber-300',   icon: AlertTriangle, label: 'Assumed' },
  pending:   { color: 'bg-zinc-500/20 border-zinc-500/40 text-zinc-400',       icon: Clock,         label: 'Pending' },
  unresolved:{ color: 'bg-zinc-500/20 border-zinc-500/40 text-zinc-400',       icon: Clock,         label: 'Unresolved' },
}

const DOMAIN_LABELS = {
  architecture: 'Architecture',
  brief: 'Brief',
  bushfire: 'Bushfire',
  civil: 'Civil',
  delivery: 'Delivery',
  ecology: 'Ecology',
  environmental: 'Environmental',
  ground: 'Ground',
  interiors: 'Interiors',
  planning: 'Planning',
  services: 'Services',
  structure: 'Structure',
  water: 'Water',
}

function DecisionCard({ decision, dependencies }) {
  const [expanded, setExpanded] = useState(false)
  const status = decision.decision_status || 'unresolved'
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unresolved
  const StatusIcon = config.icon

  // Find the selected option label from options_json
  const options = Array.isArray(decision.options_json)
    ? decision.options_json
    : decision.options_json?.options || []
  const selectedLabel = options.find(o => o.option_key === decision.selected_option_key || o.key === decision.selected_option_key)?.label
    || decision.selected_option_key?.replace(/_/g, ' ')
    || '—'

  const deps = dependencies.filter(d => d.node_key === decision.node_key)
  const depOf = dependencies.filter(d => d.depends_on_node_key === decision.node_key)

  return (
    <div className={`rounded-lg border p-4 transition-all ${config.color}`}>
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon size={16} className="shrink-0" />
            <span className="text-[11px] uppercase tracking-[1px] font-medium opacity-70">{config.label}</span>
            {decision.confidence && (
              <span className="text-[10px] uppercase tracking-[0.5px] opacity-50 ml-auto mr-2">
                {decision.confidence} confidence
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-medium text-white/90 leading-snug">{decision.display_name}</h3>
          <p className="text-[13px] text-white/50 mt-1 leading-relaxed">{decision.question}</p>
        </div>
        <div className="ml-3 mt-1 shrink-0">
          {expanded ? <ChevronUp size={16} className="opacity-40" /> : <ChevronDown size={16} className="opacity-40" />}
        </div>
      </div>

      {/* Selected answer — always visible */}
      {status !== 'unresolved' && status !== 'pending' && (
        <div className="mt-3 px-3 py-2 rounded-md bg-black/20">
          <span className="text-[11px] uppercase tracking-[0.5px] opacity-50 block mb-0.5">Selected</span>
          <span className="text-[14px] text-white/80 capitalize">{selectedLabel}</span>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {decision.rationale && (
            <div className="px-3 py-2 rounded-md bg-black/10">
              <span className="text-[11px] uppercase tracking-[0.5px] opacity-50 block mb-1">Rationale</span>
              <p className="text-[13px] text-white/70 leading-relaxed">{decision.rationale}</p>
            </div>
          )}

          {decision.source_kind && (
            <div className="flex items-center gap-2 text-[11px] opacity-40">
              <Info size={12} />
              <span>Source: {decision.source_kind.replace(/_/g, ' ')}</span>
            </div>
          )}

          {/* Dependencies */}
          {deps.length > 0 && (
            <div className="px-3 py-2 rounded-md bg-black/10">
              <span className="text-[11px] uppercase tracking-[0.5px] opacity-50 block mb-1">Depends on</span>
              {deps.map(d => (
                <div key={d.depends_on_node_key} className="flex items-center gap-2 text-[13px] text-white/60">
                  <ArrowRight size={12} className="opacity-40" />
                  <span>{d.depends_on_node_key.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] opacity-40">({d.dependency_kind})</span>
                </div>
              ))}
            </div>
          )}
          {depOf.length > 0 && (
            <div className="px-3 py-2 rounded-md bg-black/10">
              <span className="text-[11px] uppercase tracking-[0.5px] opacity-50 block mb-1">Informs</span>
              {depOf.map(d => (
                <div key={d.node_key} className="flex items-center gap-2 text-[13px] text-white/60">
                  <ArrowRight size={12} className="opacity-40" />
                  <span>{d.node_key.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] opacity-40">({d.dependency_kind})</span>
                </div>
              ))}
            </div>
          )}

          {/* All options */}
          {options.length > 0 && (
            <div className="px-3 py-2 rounded-md bg-black/10">
              <span className="text-[11px] uppercase tracking-[0.5px] opacity-50 block mb-1">Options</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {options.map(o => {
                  const key = o.option_key || o.key
                  const isSelected = key === decision.selected_option_key
                  return (
                    <span
                      key={key}
                      className={`text-[12px] px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white/90' : 'bg-black/20 text-white/40'
                      }`}
                    >
                      {o.label}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DomainGroup({ domain, decisions, dependencies, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const confirmedCount = decisions.filter(d => d.decision_status === 'confirmed').length
  const assumedCount = decisions.filter(d => d.decision_status === 'assumed').length
  const pendingCount = decisions.filter(d => !d.decision_status || d.decision_status === 'unresolved' || d.decision_status === 'pending').length

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-[14px] font-medium text-white/80 uppercase tracking-[1px]">
            {DOMAIN_LABELS[domain] || domain}
          </h2>
          <span className="text-[12px] text-white/40">{decisions.length} decision{decisions.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3">
          {confirmedCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400/70">
              <CheckCircle2 size={12} /> {confirmedCount}
            </span>
          )}
          {assumedCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400/70">
              <AlertTriangle size={12} /> {assumedCount}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-zinc-400/70">
              <Clock size={12} /> {pendingCount}
            </span>
          )}
          {open ? <ChevronUp size={16} className="opacity-40" /> : <ChevronDown size={16} className="opacity-40" />}
        </div>
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-1">
          {decisions.map(d => (
            <DecisionCard key={d.node_key} decision={d} dependencies={dependencies} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DecisionMap() {
  const { project } = useProject()
  const [decisions, setDecisions] = useState([])
  const [dependencies, setDependencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | confirmed | assumed | pending

  useEffect(() => {
    if (!project?.id) return

    async function load() {
      setLoading(true)
      const [decRes, depRes] = await Promise.all([
        supabase
          .from('decision_nodes')
          .select(`
            node_key, display_name, domain, question, options_json,
            project_decisions!inner(
              decision_status, selected_option_key, confidence, rationale, source_kind
            )
          `)
          .eq('is_active', true)
          .eq('project_decisions.project_id', project.id)
          .order('domain')
          .order('display_name'),
        supabase
          .from('decision_node_dependencies')
          .select('node_key, depends_on_node_key, dependency_kind')
          .eq('active', true)
      ])

      if (decRes.data) {
        // Flatten the join
        const flat = decRes.data.map(dn => ({
          ...dn,
          ...(dn.project_decisions?.[0] || {}),
          options_json: dn.options_json,
        }))
        setDecisions(flat)
      }
      if (depRes.data) setDependencies(depRes.data)
      setLoading(false)
    }

    load()
  }, [project?.id])

  // Also fetch decisions that have NO project_decisions row (truly unresolved)
  useEffect(() => {
    if (!project?.id) return

    async function loadOrphans() {
      const { data } = await supabase
        .from('decision_nodes')
        .select('node_key, display_name, domain, question, options_json')
        .eq('is_active', true)

      if (data) {
        setDecisions(prev => {
          const existingKeys = new Set(prev.map(d => d.node_key))
          const orphans = data
            .filter(d => !existingKeys.has(d.node_key))
            .map(d => ({ ...d, decision_status: 'unresolved' }))
          return [...prev, ...orphans]
        })
      }
    }

    loadOrphans()
  }, [project?.id])

  // Group by domain
  const grouped = decisions
    .filter(d => {
      if (filter === 'all') return true
      if (filter === 'confirmed') return d.decision_status === 'confirmed'
      if (filter === 'assumed') return d.decision_status === 'assumed'
      if (filter === 'pending') return !d.decision_status || d.decision_status === 'unresolved' || d.decision_status === 'pending'
      return true
    })
    .reduce((acc, d) => {
      const domain = d.domain || 'other'
      if (!acc[domain]) acc[domain] = []
      acc[domain].push(d)
      return acc
    }, {})

  const domainOrder = Object.keys(DOMAIN_LABELS)
  const sortedDomains = Object.keys(grouped).sort((a, b) => {
    const ai = domainOrder.indexOf(a)
    const bi = domainOrder.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  // Summary stats
  const totalCount = decisions.length
  const confirmedCount = decisions.filter(d => d.decision_status === 'confirmed').length
  const assumedCount = decisions.filter(d => d.decision_status === 'assumed').length
  const pendingCount = totalCount - confirmedCount - assumedCount

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/30 text-sm">Loading decisions…</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Compass size={22} className="text-white/40" />
        <div>
          <h1 className="text-[18px] font-medium text-white/90">Decision Map</h1>
          <p className="text-[13px] text-white/40 mt-0.5">
            {totalCount} decisions across {sortedDomains.length} domains
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-6 px-4 py-3 rounded-lg bg-white/5">
        <button
          onClick={() => setFilter('all')}
          className={`text-[13px] px-3 py-1 rounded-full transition-colors ${filter === 'all' ? 'bg-white/15 text-white/90' : 'text-white/40 hover:text-white/60'}`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilter('confirmed')}
          className={`flex items-center gap-1.5 text-[13px] px-3 py-1 rounded-full transition-colors ${filter === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/40 hover:text-white/60'}`}
        >
          <CheckCircle2 size={13} /> Confirmed ({confirmedCount})
        </button>
        <button
          onClick={() => setFilter('assumed')}
          className={`flex items-center gap-1.5 text-[13px] px-3 py-1 rounded-full transition-colors ${filter === 'assumed' ? 'bg-amber-500/20 text-amber-300' : 'text-white/40 hover:text-white/60'}`}
        >
          <AlertTriangle size={13} /> Assumed ({assumedCount})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`flex items-center gap-1.5 text-[13px] px-3 py-1 rounded-full transition-colors ${filter === 'pending' ? 'bg-zinc-500/20 text-zinc-300' : 'text-white/40 hover:text-white/60'}`}
        >
          <Clock size={13} /> Pending ({pendingCount})
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-8 px-1">
        <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
          {confirmedCount > 0 && (
            <div className="h-full bg-emerald-500/60 transition-all" style={{ width: `${(confirmedCount / totalCount) * 100}%` }} />
          )}
          {assumedCount > 0 && (
            <div className="h-full bg-amber-500/60 transition-all" style={{ width: `${(assumedCount / totalCount) * 100}%` }} />
          )}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] text-white/30">{Math.round(((confirmedCount + assumedCount) / totalCount) * 100)}% resolved</span>
          <span className="text-[11px] text-white/30">{pendingCount} remaining</span>
        </div>
      </div>

      {/* Domain groups */}
      {sortedDomains.map((domain, i) => (
        <DomainGroup
          key={domain}
          domain={domain}
          decisions={grouped[domain]}
          dependencies={dependencies}
          defaultOpen={i < 3}
        />
      ))}

      {sortedDomains.length === 0 && (
        <div className="text-center py-12 text-white/30 text-sm">
          No decisions match the current filter.
        </div>
      )}
    </div>
  )
}
