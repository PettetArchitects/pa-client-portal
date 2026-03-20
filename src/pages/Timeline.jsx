import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import { Check, Clock, Circle, CalendarDays, ChevronDown, ChevronRight, FileText, AlertTriangle } from 'lucide-react'

export default function Timeline({ projectId }) {
  const { isArchitect, project } = useProject()
  const [stages, setStages] = useState([])
  const [gateItems, setGateItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedStages, setExpandedStages] = useState(new Set())

  useEffect(() => {
    if (!projectId) return
    loadTimeline()
  }, [projectId])

  async function loadTimeline() {
    // Load service stages for this project
    const [stagesRes, gatesRes] = await Promise.all([
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
    ])

    setStages(stagesRes.data || [])
    setGateItems(gatesRes.data || [])
    setLoading(false)

    // Auto-expand active stage
    const active = (stagesRes.data || []).find(s => s.status === 'active')
    if (active) setExpandedStages(new Set([active.stage_code]))
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
            const hasSubItems = stageGates.length > 0

            return (
              <div key={stage.id} className="relative">
                {/* Stage row */}
                <div
                  className={`relative flex gap-4 py-3.5 px-2 rounded-xl transition-colors ${
                    isActive ? 'bg-white/40' : 'hover:bg-white/20'
                  } ${hasSubItems || isArchitect ? 'cursor-pointer' : ''}`}
                  onClick={() => (hasSubItems || isArchitect) && toggleStage(stage.stage_code)}
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
                      {(hasSubItems || isArchitect) && (
                        <span className="ml-auto text-[var(--color-muted)]">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                    </div>

                    {/* Dates */}
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
                      {stage.notes && (
                        <span className="text-[10px] text-[var(--color-muted)] font-light italic">{stage.notes}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-items: gate items for this stage */}
                {isExpanded && (
                  <div className="ml-[46px] mb-3 space-y-1.5 mt-1">
                    {stageGates.map(gi => (
                      <GateItem key={gi.id} item={gi} />
                    ))}

                    {stageGates.length === 0 && isArchitect && (
                      <div className="px-4 py-3 rounded-lg backdrop-blur-xl bg-white/30 border border-white/30">
                        <p className="text-[11px] text-[var(--color-muted)] font-light italic">
                          No gate items recorded for this stage yet.
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
