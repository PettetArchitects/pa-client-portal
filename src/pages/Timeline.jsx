import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Check, Clock, Circle, CalendarDays } from 'lucide-react'

export default function Timeline({ projectId }) {
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    loadTimeline()
  }, [projectId])

  async function loadTimeline() {
    const { data } = await supabase
      .from('homeowner_milestones')
      .select('*')
      .eq('project_id', projectId)
      .eq('visible_to_homeowner', true)
      .order('display_order')

    setMilestones(data || [])
    setLoading(false)
  }

  const completed = milestones.filter(m => m.milestone_status === 'completed').length
  const total = milestones.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  if (loading) return <div className="animate-pulse"><div className="h-8 w-48 bg-[var(--color-border)] rounded mb-8" /></div>

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-tight mb-1">Project Timeline</h1>
        <p className="text-sm text-[var(--color-muted)] font-light">
          {completed} of {total} milestones completed
        </p>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--color-muted)] font-light">Overall progress</span>
            <span className="text-xs font-medium">{progress}%</span>
          </div>
          <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-[var(--color-border)]" />

        <div className="space-y-0">
          {milestones.map((m, i) => {
            const isCompleted = m.milestone_status === 'completed'
            const isActive = m.milestone_status === 'in_progress'
            const isPending = m.milestone_status === 'pending' || m.milestone_status === 'upcoming'

            return (
              <div key={m.id} className="relative flex gap-5 py-4 group">
                {/* Node */}
                <div className="relative z-10 shrink-0">
                  {isCompleted ? (
                    <div className="w-[30px] h-[30px] rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                      <Check size={14} strokeWidth={2} className="text-white" />
                    </div>
                  ) : isActive ? (
                    <div className="w-[30px] h-[30px] rounded-full border-2 border-[var(--color-accent)] bg-white flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-[30px] h-[30px] rounded-full border border-[var(--color-border)] bg-white flex items-center justify-center">
                      <Circle size={8} className="text-[var(--color-border)]" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 pb-4 ${i < milestones.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`text-sm ${isCompleted || isActive ? 'font-medium' : 'font-light text-[var(--color-muted)]'}`}>
                        {m.title}
                      </h3>
                      {m.description && (
                        <p className="text-xs text-[var(--color-muted)] font-light mt-1 leading-relaxed">
                          {m.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      {m.milestone_date && (
                        <div className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                          <CalendarDays size={11} />
                          {new Date(m.milestone_date).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short'
                          })}
                        </div>
                      )}
                      {isActive && (
                        <span className="inline-block mt-1 text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded bg-[var(--color-pending)]/10 text-[var(--color-pending)]">
                          In Progress
                        </span>
                      )}
                      {isCompleted && m.completed_at && (
                        <span className="text-[10px] text-[var(--color-muted)] font-light">
                          {new Date(m.completed_at).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short'
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stage tag */}
                  {m.stage && (
                    <span className="inline-block mt-2 text-[10px] tracking-[1px] uppercase text-[var(--color-muted)] font-light px-2 py-0.5 bg-[var(--color-bg)] rounded">
                      {m.stage}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {milestones.length === 0 && (
        <div className="text-center py-20">
          <Clock size={24} className="mx-auto text-[var(--color-border)] mb-3" />
          <p className="text-sm text-[var(--color-muted)] font-light">Timeline not yet available.</p>
          <p className="text-xs text-[var(--color-muted)] font-light mt-1">
            Milestones will appear here as your project progresses.
          </p>
        </div>
      )}
    </div>
  )
}
