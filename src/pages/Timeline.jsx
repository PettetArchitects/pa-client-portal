import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import {
  Check, Clock, Circle, CalendarDays, ChevronDown, ChevronRight,
  FileText, AlertTriangle, GitBranch, FolderOpen, ArrowUpRight
} from 'lucide-react'

/* ── Map service stage codes to decision_node stage prefixes ── */
const STAGE_DECISION_PREFIXES = {
  '20': ['project-establishment', 'site-analysis', 'consultant-trigger'],
  '21': ['design-development'],
  '22': ['planning-strategy', 'planning-application'],
  '23': ['construction-docs'],
  '24': ['tender', '24', '25'],
}

/* ── Map service stage codes to document stage values ── */
const STAGE_DOC_VALUES = {
  '20': [],
  '21': [],
  '22': ['planning-strategy'],
  '23': ['construction-docs'],
  '24': ['24', 'tender'],
}

function matchesStage(stageCode, stageCodes) {
  const prefixes = STAGE_DECISION_PREFIXES[stageCode] || []
  if (!stageCodes || !Array.isArray(stageCodes)) return false
  return stageCodes.some(sc => prefixes.some(p => sc === p || sc.startsWith(p + '-')))
}

export default function Timeline({ projectId }) {
  const { isArchitect, project } = useProject()
  const [stages, setStages] = useState([])
  const [gateItems, setGateItems] = useState([])
  const [decisions, setDecisions] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedStages, setExpandedStages] = useState(new Set())

  useEffect(() => {
    if (!projectId) return
    loadTimeline()
  }, [projectId])

  async function loadTimeline() {
    const projectGuid = project?.project_guid

    const [stagesRes, gatesRes, decisionsRes, docsRes] = await Promise.all([
      supabase
        .from('project_services')
        .select('*')
        .eq('project_id', projectId)
        .order('stage_code'),
      supabase
        .from('stage_gate_items')
        .select('*')
        .eq('project_id', projectId)
        .order('item_date', { ascending: true, nullsFirst: false }),
      // Decisions: join project_decisions with decision_nodes
      supabase.rpc('get_project_decisions_with_nodes', { p_project_id: projectId }).then(res => {
        // If RPC doesn't exist, fall back to separate queries
        if (res.error) {
          return loadDecisionsFallback(projectId)
        }
        return res
      }),
      supabase
        .from('project_documents')
        .select('id, title, stage, doc_type, status, hierarchy_group, effective_date, notes')
        .eq('project_id', projectId)
        .order('hierarchy_order'),
    ])

    setStages(stagesRes.data || [])
    setGateItems(gatesRes.data || [])
    setDecisions(decisionsRes.data || decisionsRes || [])
    setDocuments(docsRes.data || [])
    setLoading(false)

    // Auto-expand active stage
    const active = (stagesRes.data || []).find(s => s.status === 'active')
    if (active) setExpandedStages(new Set([active.stage_code]))
  }

  async function loadDecisionsFallback(pid) {
    // Load decisions + nodes separately and join in JS
    const [decRes, nodesRes] = await Promise.all([
      supabase
        .from('project_decisions')
        .select('node_key, decision_status, selected_option_key, rationale, confidence, resolved_at')
        .eq('project_id', pid),
      supabase
        .from('decision_nodes')
        .select('node_key, display_name, domain, activation_stage_codes, required_stage_codes'),
    ])
    const nodesMap = {}
    ;(nodesRes.data || []).forEach(n => { nodesMap[n.node_key] = n })
    return {
      data: (decRes.data || []).map(d => ({
        ...d,
        display_name: nodesMap[d.node_key]?.display_name || d.node_key,
        domain: nodesMap[d.node_key]?.domain || '',
        activation_stage_codes: nodesMap[d.node_key]?.activation_stage_codes || [],
        required_stage_codes: nodesMap[d.node_key]?.required_stage_codes || [],
      }))
    }
  }

  function toggleStage(code) {
    setExpandedStages(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  const completed = stages.filter(s => s.status === 'complete').length
  const total = stages.length
  const activeStage = stages.find(s => s.status === 'active')
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  // Group gate items by stage
  const gatesByStage = {}
  gateItems.forEach(gi => {
    if (!gatesByStage[gi.stage]) gatesByStage[gi.stage] = []
    gatesByStage[gi.stage].push(gi)
  })

  // Group decisions by stage using activation_stage_codes
  function getDecisionsForStage(stageCode) {
    return decisions.filter(d => matchesStage(stageCode, d.required_stage_codes || d.activation_stage_codes))
  }

  // Group documents by stage
  function getDocumentsForStage(stageCode) {
    const docValues = STAGE_DOC_VALUES[stageCode] || []
    return documents.filter(d => docValues.includes(d.stage))
  }

  if (loading) {
    return (
      <div className="max-w-2xl animate-pulse">
        <div className="h-8 w-48 bg-white/40 rounded mb-4" />
        <div className="h-3 w-64 bg-white/40 rounded mb-8" />
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/40 rounded-xl mb-3" />)}
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-lg font-medium text-[var(--color-text)] mb-1">Project Timeline</h1>
        <p className="text-sm text-[var(--color-muted)] font-light">
          {activeStage
            ? `Currently in ${activeStage.stage_label} — ${completed} of ${total} stages complete.`
            : `${completed} of ${total} stages complete.`
          }
        </p>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="backdrop-blur-xl bg-white/70 rounded-xl border border-white/50 p-4 mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] font-medium">
              Progress
            </span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: progress === 100
                  ? 'var(--color-approved)'
                  : 'linear-gradient(90deg, var(--color-accent) 0%, var(--color-muted) 100%)',
              }}
            />
          </div>
          <div className="flex gap-4 mt-3">
            <span className="text-[10px] text-[var(--color-muted)]">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-approved)] mr-1 align-middle" />
              {completed} complete
            </span>
            {activeStage && (
              <span className="text-[10px] text-[var(--color-muted)]">
                <span className="inline-block w-2 h-2 rounded-full border border-[var(--color-accent)] mr-1 align-middle" />
                1 active
              </span>
            )}
            <span className="text-[10px] text-[var(--color-muted)]">
              <span className="inline-block w-2 h-2 rounded-full bg-white/60 border border-white/80 mr-1 align-middle" />
              {total - completed - (activeStage ? 1 : 0)} upcoming
            </span>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-white/40" />

        <div className="space-y-0">
          {stages.map((stage, i) => {
            const isCompleted = stage.status === 'complete'
            const isActive = stage.status === 'active'
            const isPending = !isCompleted && !isActive
            const isExpanded = expandedStages.has(stage.stage_code)
            const stageGates = gatesByStage[stage.stage_code] || []
            const stageDecisions = getDecisionsForStage(stage.stage_code)
            const stageDocs = getDocumentsForStage(stage.stage_code)
            const hasContent = stageGates.length > 0 || stageDecisions.length > 0 || stageDocs.length > 0
            const itemCounts = []
            if (stageDecisions.length > 0) itemCounts.push(`${stageDecisions.length} decisions`)
            if (stageDocs.length > 0) itemCounts.push(`${stageDocs.length} docs`)
            if (stageGates.length > 0) itemCounts.push(`${stageGates.length} gates`)

            return (
              <div key={stage.id} className="relative">
                {/* Stage row */}
                <div
                  className={`relative flex gap-4 py-3.5 px-2 rounded-xl transition-colors ${
                    isActive ? 'bg-white/40' : 'hover:bg-white/20'
                  } cursor-pointer`}
                  onClick={() => toggleStage(stage.stage_code)}
                >
                  {/* Node */}
                  <div className="relative z-10 shrink-0">
                    {isCompleted ? (
                      <div className="w-[30px] h-[30px] rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow-sm">
                        <Check size={14} strokeWidth={2.5} className="text-white" />
                      </div>
                    ) : isActive ? (
                      <div className="w-[30px] h-[30px] rounded-full border-2 border-[var(--color-accent)] bg-white flex items-center justify-center shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-[30px] h-[30px] rounded-full border border-white/60 bg-white/40 flex items-center justify-center">
                        <Circle size={8} className="text-[var(--color-border)]" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-[var(--color-muted)] tabular-nums">{stage.stage_code}</span>
                      <h3 className={`text-sm ${isCompleted || isActive ? 'font-medium text-[var(--color-text)]' : 'font-light text-[var(--color-muted)]'}`}>
                        {stage.stage_label}
                      </h3>
                      {isActive && (
                        <span className="text-[9px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(251,188,4,0.1)', color: 'var(--color-pending)' }}>
                          Current
                        </span>
                      )}
                      <span className="ml-auto text-[var(--color-muted)]">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    </div>

                    {/* Dates + summary counts */}
                    <div className="flex items-center gap-4 mt-1">
                      {stage.start_date && (
                        <span className="flex items-center gap-1 text-[10px] text-[var(--color-muted)]">
                          <CalendarDays size={10} />
                          {new Date(stage.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {stage.end_date && (
                        <span className="text-[10px] text-[var(--color-muted)]">
                          — {new Date(stage.end_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {!isExpanded && itemCounts.length > 0 && (
                        <span className="text-[10px] text-[var(--color-muted)] font-light">
                          {itemCounts.join(' · ')}
                        </span>
                      )}
                      {stage.notes && (
                        <span className="text-[10px] text-[var(--color-muted)] font-light italic">{stage.notes}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded content: decisions, documents, gate items */}
                {isExpanded && (
                  <div className="ml-[46px] mb-4 space-y-3 mt-1">

                    {/* Decisions section */}
                    {stageDecisions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <GitBranch size={11} className="text-[var(--color-muted)]" />
                          <span className="text-[10px] tracking-[1.2px] uppercase text-[var(--color-muted)] font-medium">
                            Decisions ({stageDecisions.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {stageDecisions.map(d => (
                            <DecisionRow key={d.node_key} decision={d} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Documents section */}
                    {stageDocs.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FolderOpen size={11} className="text-[var(--color-muted)]" />
                          <span className="text-[10px] tracking-[1.2px] uppercase text-[var(--color-muted)] font-medium">
                            Documents ({stageDocs.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {stageDocs.map(doc => (
                            <DocumentRow key={doc.id} doc={doc} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gate items section */}
                    {stageGates.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={11} className="text-[var(--color-muted)]" />
                          <span className="text-[10px] tracking-[1.2px] uppercase text-[var(--color-muted)] font-medium">
                            Gate Items ({stageGates.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {stageGates.map(gi => (
                            <GateItem key={gi.id} item={gi} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {stageDecisions.length === 0 && stageDocs.length === 0 && stageGates.length === 0 && (
                      <div className="px-4 py-3 rounded-lg backdrop-blur-xl bg-white/30 border border-white/30">
                        <p className="text-[11px] text-[var(--color-muted)] font-light italic">
                          {isPending ? 'This stage hasn\'t started yet.' : 'No items recorded for this stage.'}
                        </p>
                      </div>
                    )}

                    {/* Fee portion if architect */}
                    {isArchitect && stage.fee_portion && (
                      <div className="px-4 py-2 rounded-lg bg-white/20 border border-white/20">
                        <span className="text-[10px] text-[var(--color-muted)]">
                          Fee portion: {(stage.fee_portion * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {stages.length === 0 && (
        <div className="text-center py-16 backdrop-blur-xl bg-white/40 rounded-xl border border-white/40">
          <Clock size={24} className="mx-auto text-[var(--color-border)] mb-3" />
          <p className="text-sm text-[var(--color-muted)] font-light">Timeline not yet available.</p>
          <p className="text-xs text-[var(--color-muted)] font-light mt-1">
            Service stages will appear here once your project is set up.
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Decision row ── */
function DecisionRow({ decision }) {
  const statusColor = {
    confirmed: 'bg-green-50 text-green-600',
    assumed: 'bg-amber-50 text-amber-600',
    deferred: 'bg-gray-50 text-gray-500',
    open: 'bg-blue-50 text-blue-600',
  }

  // Format the selected option for display
  const optionDisplay = decision.selected_option_key
    ? decision.selected_option_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 rounded-lg backdrop-blur-xl bg-white/40 border border-white/30">
      <div className="mt-0.5 shrink-0">
        <GitBranch size={12} className={
          decision.decision_status === 'confirmed' ? 'text-[var(--color-approved)]' :
          decision.decision_status === 'assumed' ? 'text-amber-500' :
          'text-[var(--color-muted)]'
        } />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-medium text-[var(--color-text)] block">
          {decision.display_name}
        </span>
        {optionDisplay && (
          <p className="text-[10px] text-[var(--color-text)] mt-0.5">
            {optionDisplay}
          </p>
        )}
        {decision.rationale && (
          <p className="text-[10px] text-[var(--color-muted)] font-light mt-0.5 leading-relaxed line-clamp-2">
            {decision.rationale}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {decision.domain && (
            <span className="text-[8px] tracking-[0.8px] uppercase text-[var(--color-muted)] font-medium">
              {decision.domain}
            </span>
          )}
          {decision.confidence && (
            <span className="text-[9px] text-[var(--color-muted)]">
              {decision.confidence} confidence
            </span>
          )}
        </div>
      </div>
      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
        statusColor[decision.decision_status] || 'bg-gray-50 text-gray-500'
      }`}>
        {decision.decision_status || 'open'}
      </span>
    </div>
  )
}

/* ── Document row ── */
function DocumentRow({ doc }) {
  const statusColor = {
    approved: 'bg-green-50 text-green-600',
    for_review: 'bg-amber-50 text-amber-600',
    draft: 'bg-gray-50 text-gray-500',
    issued: 'bg-blue-50 text-blue-600',
    superseded: 'bg-red-50 text-red-400',
  }

  const typeLabel = doc.doc_type
    ? doc.doc_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 rounded-lg backdrop-blur-xl bg-white/40 border border-white/30">
      <div className="mt-0.5 shrink-0">
        <FileText size={12} className={
          doc.status === 'approved' ? 'text-[var(--color-approved)]' :
          doc.status === 'issued' ? 'text-blue-500' :
          'text-[var(--color-muted)]'
        } />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-medium text-[var(--color-text)] block">
          {doc.title}
        </span>
        <div className="flex items-center gap-3 mt-1">
          {typeLabel && (
            <span className="text-[8px] tracking-[0.8px] uppercase text-[var(--color-muted)] font-medium">
              {typeLabel}
            </span>
          )}
          {doc.hierarchy_group && (
            <span className="text-[9px] text-[var(--color-muted)]">
              {doc.hierarchy_group}
            </span>
          )}
          {doc.effective_date && (
            <span className="text-[9px] text-[var(--color-muted)]">
              {new Date(doc.effective_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        {doc.notes && (
          <p className="text-[10px] text-[var(--color-muted)] font-light mt-0.5 leading-relaxed line-clamp-2">
            {doc.notes}
          </p>
        )}
      </div>
      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
        statusColor[doc.status] || 'bg-gray-50 text-gray-500'
      }`}>
        {(doc.status || 'draft').replace(/_/g, ' ')}
      </span>
    </div>
  )
}

/* ── Gate item sub-row ── */
function GateItem({ item }) {
  const isComplete = item.item_status === 'complete' || item.item_status === 'passed'
  const isBlocked = item.item_status === 'blocked' || item.item_status === 'failed'
  const isWarning = item.item_status === 'warning'

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 rounded-lg backdrop-blur-xl bg-white/40 border border-white/30">
      <div className="mt-0.5 shrink-0">
        {isComplete ? (
          <Check size={12} className="text-[var(--color-approved)]" />
        ) : isBlocked ? (
          <AlertTriangle size={12} className="text-red-500" />
        ) : isWarning ? (
          <AlertTriangle size={12} className="text-amber-500" />
        ) : (
          <FileText size={12} className="text-[var(--color-muted)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-medium text-[var(--color-text)] block">{item.title}</span>
        {item.summary && (
          <p className="text-[10px] text-[var(--color-muted)] font-light mt-0.5 leading-relaxed">{item.summary}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {item.gate_type && (
            <span className="text-[8px] tracking-[0.8px] uppercase text-[var(--color-muted)] font-medium">{item.gate_type}</span>
          )}
          {item.actor_name && (
            <span className="text-[9px] text-[var(--color-muted)]">{item.actor_name}</span>
          )}
          {item.item_date && (
            <span className="text-[9px] text-[var(--color-muted)]">
              {new Date(item.item_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
      <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
        isComplete ? 'bg-green-50 text-green-600' :
        isBlocked ? 'bg-red-50 text-red-600' :
        isWarning ? 'bg-amber-50 text-amber-600' :
        'bg-gray-50 text-gray-500'
      }`}>
        {item.item_status || 'pending'}
      </span>
    </div>
  )
}
