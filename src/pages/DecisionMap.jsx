import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import { Compass, ChevronDown, ChevronUp, ArrowRight, CheckCircle2, AlertTriangle, Clock, Info } from 'lucide-react'

const STATUS_CONFIG = {
  confirmed: { dotClass: 'bg-[var(--color-approved)]', label: 'Confirmed', icon: CheckCircle2 },
  assumed:   { dotClass: 'bg-[var(--color-pending)]',  label: 'Assumed',   icon: AlertTriangle },
  pending:   { dotClass: 'bg-[var(--color-muted)]',    label: 'Pending',   icon: Clock },
  unresolved:{ dotClass: 'bg-[var(--color-muted)]',    label: 'Unresolved',icon: Clock },
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

  const options = Array.isArray(decision.options_json)
    ? decision.options_json
    : decision.options_json?.options || []
  const selectedLabel = options.find(o => o.option_key === decision.selected_option_key || o.key === decision.selected_option_key)?.label
    || decision.selected_option_key?.replace(/_/g, ' ')
    || '—'

  const deps = dependencies.filter(d => d.node_key === decision.node_key)
  const depOf = dependencies.filter(d => d.depends_on_node_key === decision.node_key)

  return (
    <div
      className="glass-t p-4 cursor-pointer focus-ring"
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setExpanded(!expanded)
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass}`} />
            <span className="text-[11px] uppercase tracking-[1px] font-medium" style={{ color: 'var(--color-muted)' }}>{config.label}</span>
            {decision.confidence && (
              <span className="text-[10px] uppercase tracking-[0.5px] ml-auto mr-2" style={{ color: 'var(--color-muted)' }}>
                {decision.confidence} confidence
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-medium leading-snug" style={{ color: 'var(--color-text)' }}>{decision.display_name}</h3>
          <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--color-muted)' }}>{decision.question}</p>
        </div>
        <div className="ml-3 mt-1 shrink-0" style={{ color: 'var(--color-muted)' }}>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--color-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} />}
        </div>
      </div>

      {status !== 'unresolved' && status !== 'pending' && (
        <div className="mt-3 px-3 py-2 rounded-md bg-white/40">
          <span className="text-[11px] uppercase tracking-[0.5px] block mb-0.5" style={{ color: 'var(--color-muted)' }}>Selected</span>
          <span className="text-[14px] capitalize" style={{ color: 'var(--color-text)' }}>{selectedLabel}</span>
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
          {decision.rationale && (
            <div className="px-3 py-2 rounded-md bg-white/30">
              <span className="text-[11px] uppercase tracking-[0.5px] block mb-1" style={{ color: 'var(--color-muted)' }}>Rationale</span>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text)' }}>{decision.rationale}</p>
            </div>
          )}

          {decision.source_kind && (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-muted)' }}>
              <Info size={12} style={{ color: 'var(--color-muted)' }} />
              <span>Source: {decision.source_kind.replace(/_/g, ' ')}</span>
            </div>
          )}

          {deps.length > 0 && (
            <div className="px-3 py-2 rounded-md bg-white/30">
              <span className="text-[11px] uppercase tracking-[0.5px] block mb-1" style={{ color: 'var(--color-muted)' }}>Depends on</span>
              {deps.map(d => (
                <div key={d.depends_on_node_key} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--color-text)' }}>
                  <ArrowRight size={12} style={{ color: 'var(--color-muted)' }} />
                  <span>{d.depends_on_node_key.replace(/_/g, ' ')}</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>({d.dependency_kind})</span>
                </div>
              ))}
            </div>
          )}
          {depOf.length > 0 && (
            <div className="px-3 py-2 rounded-md bg-white/30">
              <span className="text-[11px] uppercase tracking-[0.5px] block mb-1" style={{ color: 'var(--color-muted)' }}>Informs</span>
              {depOf.map(d => (
                <div key={d.node_key} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--color-text)' }}>
                  <ArrowRight size={12} style={{ color: 'var(--color-muted)' }} />
                  <span>{d.node_key.replace(/_/g, ' ')}</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>({d.dependency_kind})</span>
                </div>
              ))}
            </div>
          )}

          {options.length > 0 && (
            <div className="px-3 py-2 rounded-md bg-white/30">
              <span className="text-[11px] uppercase tracking-[0.5px] block mb-1" style={{ color: 'var(--color-muted)' }}>Options</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {options.map(o => {
                  const key = o.option_key || o.key
                  const isSelected = key === decision.selected_option_key
                  return (
                    <span
                      key={key}
                      className={`text-[12px] px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                          : 'bg-white/40 border-[var(--color-border)]'
                      }`}
                      style={!isSelected ? { color: 'var(--color-muted)' } : undefined}
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
        className="glass-s w-full flex items-center justify-between px-4 py-3 focus-ring"
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(!open)
          }
        }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-[14px] font-medium uppercase tracking-[1px]" style={{ color: 'var(--color-text)' }}>
            {DOMAIN_LABELS[domain] || domain}
          </h2>
          <span className="text-[12px]" style={{ color: 'var(--color-muted)' }}>{decisions.length} decision{decisions.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3">
          {confirmedCount > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-approved)' }}>
              <CheckCircle2 size={12} style={{ color: 'var(--color-approved)' }} /> {confirmedCount}
            </span>
          )}
          {assumedCount > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-pending)' }}>
              <AlertTriangle size={12} style={{ color: 'var(--color-pending)' }} /> {assumedCount}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-muted)' }}>
              <Clock size={12} style={{ color: 'var(--color-muted)' }} /> {pendingCount}
            </span>
          )}
          <span style={{ color: 'var(--color-muted)' }}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
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
  const [filter, setFilter] = useState('all')

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

  const totalCount = decisions.length
  const confirmedCount = decisions.filter(d => d.decision_status === 'confirmed').length
  const assumedCount = decisions.filter(d => d.decision_status === 'assumed').length
  const pendingCount = totalCount - confirmedCount - assumedCount

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[13px]" style={{ color: 'var(--color-muted)' }}>Loading decisions…</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Compass size={22} style={{ color: 'var(--color-muted)' }} />
        <div>
          <h1 className="text-[18px] font-medium" style={{ color: 'var(--color-text)' }}>Decision Map</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {totalCount} decisions across {sortedDomains.length} domains
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="glass-s flex items-center gap-4 mb-6 px-4 py-3">
        <button
          onClick={() => setFilter('all')}
          className={`text-[13px] px-3 py-1 rounded-full transition-colors ${filter === 'all' ? 'bg-[var(--color-accent)] text-white' : ''}`}
          style={filter !== 'all' ? { color: 'var(--color-muted)' } : undefined}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilter('confirmed')}
          className={`flex items-center gap-1.5 text-[13px] px-3 py-1 rounded-full transition-colors ${filter === 'confirmed' ? 'bg-[var(--color-approved)] text-white' : ''}`}
          style={filter !== 'confirmed' ? { color: 'var(--color-approved)' } : undefined}
        >
          <CheckCircle2 size={13} style={{ color: filter === 'confirmed' ? 'white' : 'var(--color-approved)' }} /> Confirmed ({confirmedCount})
        </button>
        <button
          onClick={() => setFilter('assumed')}
          className={`flex items-center gap-1.5 text-[13px] px-3 py-1 rounded-full transition-colors ${filter === 'assumed' ? 'bg-[var(--color-pending)] text-white' : ''}`}
          style={filter !== 'assumed' ? { color: 'var(--color-pending)' } : undefined}
        >
          <AlertTriangle size={13} style={{ color: filter === 'assumed' ? 'white' : 'var(--color-pending)' }} /> Assumed ({assumedCount})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`flex items-center gap-1.5 text-[13px] px-3 py-1 rounded-full transition-colors ${filter === 'pending' ? 'bg-[var(--color-muted)] text-white' : ''}`}
          style={filter !== 'pending' ? { color: 'var(--color-muted)' } : undefined}
        >
          <Clock size={13} style={{ color: filter === 'pending' ? 'white' : 'var(--color-muted)' }} /> Pending ({pendingCount})
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-8 px-1">
        <div className="h-2 rounded-full bg-white/40 overflow-hidden flex">
          {confirmedCount > 0 && (
            <div className="h-full transition-all" style={{ width: `${(confirmedCount / totalCount) * 100}%`, background: 'var(--color-approved)' }} />
          )}
          {assumedCount > 0 && (
            <div className="h-full transition-all" style={{ width: `${(assumedCount / totalCount) * 100}%`, background: 'var(--color-pending)' }} />
          )}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{Math.round(((confirmedCount + assumedCount) / totalCount) * 100)}% resolved</span>
          <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{pendingCount} remaining</span>
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
        <div className="text-center py-12 text-[13px]" style={{ color: 'var(--color-muted)' }}>
          No decisions match the current filter.
        </div>
      )}
    </div>
  )
}
