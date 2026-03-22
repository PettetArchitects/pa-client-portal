import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import {
  Image, Search, Filter, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronRight, ExternalLink, RefreshCw, Upload,
  Eye, X, Link2, Copy, BarChart3, Grid3X3, List
} from 'lucide-react'

/* ── Constants ── */
const VIEW_MODES = { grid: 'grid', list: 'list' }

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'missing', label: 'Missing' },
  { key: 'broken', label: 'Broken' },
  { key: 'linked', label: 'Linked' },
]

/* ── ImageManager — Architect-Only Admin Page ── */
export default function ImageManager() {
  const { project, isArchitect } = useProject()
  const projectId = project?.project_id || project?.id

  const [selections, setSelections] = useState([])
  const [groups, setGroups] = useState([])
  const [scheduleSheets, setScheduleSheets] = useState([])
  const [elementLabels, setElementLabels] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')
  const [elementFilter, setElementFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sheetFilter, setSheetFilter] = useState('all')
  const [viewMode, setViewMode] = useState(VIEW_MODES.grid)
  const [brokenUrls, setBrokenUrls] = useState(new Set())
  const [selectedItem, setSelectedItem] = useState(null)
  const [editUrl, setEditUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  /* ── Data Loading ── */
  useEffect(() => {
    if (!projectId) return
    loadData()
  }, [projectId, refreshKey])

  async function loadData() {
    setLoading(true)
    const [selRes, grpRes, sheetRes, elemRes] = await Promise.all([
      supabase
        .from('homeowner_selections_portal')
        .select(`*, project_selections:project_selection_id (id, title, selection_kind, element_type, manufacturer_name, supplier_name, model, spec_reference, notes, attributes)`)
        .eq('project_id', projectId)
        .eq('active', true),
      supabase
        .from('schedule_groups')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order'),
      supabase
        .from('schedule_output_definitions')
        .select('output_code, output_title, element_types, display_order')
        .eq('active', true)
        .order('display_order'),
      supabase
        .from('sub_criteria_definitions')
        .select('element_type, element_label'),
    ])
    setSelections(selRes.data || [])
    setGroups(grpRes.data || [])
    setScheduleSheets(sheetRes.data || [])
    // Build element_type → label lookup from canonical definitions
    const labels = {}
    ;(elemRes.data || []).forEach(e => { if (!labels[e.element_type]) labels[e.element_type] = e.element_label })
    setElementLabels(labels)
    setBrokenUrls(new Set())
    setLoading(false)
  }

  /* ── Broken Image Detection ── */
  const handleImageError = useCallback((url) => {
    setBrokenUrls(prev => new Set([...prev, url]))
  }, [])

  /* ── Stats ── */
  const stats = (() => {
    const total = selections.length
    const withImage = selections.filter(s => s.portal_image_url).length
    const missing = total - withImage
    const broken = selections.filter(s => s.portal_image_url && brokenUrls.has(s.portal_image_url)).length
    const healthy = withImage - broken
    const coveragePct = total > 0 ? Math.round((withImage / total) * 100) : 0
    return { total, withImage, missing, broken, healthy, coveragePct }
  })()

  /* ── Group Stats ── */
  const groupStats = groups.map(g => {
    const items = selections.filter(s => s.schedule_group === g.group_key)
    const withImg = items.filter(s => s.portal_image_url).length
    const broken = items.filter(s => s.portal_image_url && brokenUrls.has(s.portal_image_url)).length
    return {
      ...g,
      total: items.length,
      withImage: withImg,
      missing: items.length - withImg,
      broken,
      coveragePct: items.length > 0 ? Math.round((withImg / items.length) * 100) : 0,
    }
  })

  /* ── Derived Filter Options (canonical labels from Supabase) ── */
  const kindOptions = [...new Set(selections.map(s => s.project_selections?.selection_kind).filter(Boolean))].sort()
  const elementOptions = [...new Set(selections.map(s => s.project_selections?.element_type).filter(Boolean))].sort()
  const approvalOptions = [...new Set(selections.map(s => s.approval_status).filter(Boolean))].sort()

  // Helper: resolve element_type to canonical label
  const getElementLabel = (et) => elementLabels[et] || et?.replace(/_/g, ' ') || '—'

  // Helper: find which schedule sheet(s) an element_type belongs to
  const getSheetForElement = (et) => scheduleSheets.find(sh => sh.element_types?.includes(et))

  const activeFilterCount = [groupFilter, kindFilter, elementFilter, statusFilter, sheetFilter].filter(f => f !== 'all').length

  /* ── Filtering ── */
  const filteredSelections = selections.filter(s => {
    const sel = s.project_selections || {}
    // Search filter
    if (search) {
      const text = [sel.title, sel.manufacturer_name, sel.model, sel.element_type, s.schedule_group, s.portal_image_url].join(' ').toLowerCase()
      if (!text.includes(search.toLowerCase())) return false
    }
    // Dimension filters
    if (groupFilter !== 'all' && s.schedule_group !== groupFilter) return false
    if (kindFilter !== 'all' && sel.selection_kind !== kindFilter) return false
    if (elementFilter !== 'all' && sel.element_type !== elementFilter) return false
    if (statusFilter !== 'all' && s.approval_status !== statusFilter) return false
    if (sheetFilter !== 'all') {
      const sheet = scheduleSheets.find(sh => sh.output_code === sheetFilter)
      if (sheet && !sheet.element_types?.includes(sel.element_type)) return false
    }
    // Image status filter
    if (filter === 'missing') return !s.portal_image_url
    if (filter === 'broken') return s.portal_image_url && brokenUrls.has(s.portal_image_url)
    if (filter === 'linked') return s.portal_image_url && !brokenUrls.has(s.portal_image_url)
    return true
  })

  /* ── URL Update ── */
  async function saveImageUrl() {
    if (!selectedItem) return
    setSaving(true)
    const url = editUrl.trim() || null
    const { error } = await supabase
      .from('homeowner_selections_portal')
      .update({ portal_image_url: url, updated_at: new Date().toISOString() })
      .eq('id', selectedItem.id)
    if (!error) {
      setSelections(prev => prev.map(s =>
        s.id === selectedItem.id ? { ...s, portal_image_url: url } : s
      ))
      if (url) brokenUrls.delete(url)
      setSelectedItem(null)
    }
    setSaving(false)
  }

  /* ── Auth Guard ── */
  if (!isArchitect) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="glass-s p-8">
          <AlertTriangle size={24} style={{ color: 'var(--color-urgent)', margin: '0 auto 12px' }} />
          <p className="text-[15px] font-medium" style={{ color: 'var(--color-text)' }}>
            Architect access required
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <RefreshCw size={20} className="animate-spin mx-auto" style={{ color: 'var(--color-muted)' }} />
        <p className="text-[13px] mt-3" style={{ color: 'var(--color-muted)' }}>Loading image data…</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Image size={22} style={{ color: 'var(--color-muted)' }} />
        <div className="flex-1">
          <h1 className="text-[18px] font-medium" style={{ color: 'var(--color-text)' }}>
            Image Manager
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Audit, verify, and manage selection images across the project
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="glass-t glass-t-hover flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium"
          style={{ color: 'var(--color-muted)' }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* ── Coverage Dashboard ── */}
      <div className="glass-s p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={14} style={{ color: 'var(--color-muted)' }} />
          <span className="text-[11px] uppercase tracking-[1px] font-medium"
                style={{ color: 'var(--color-muted)' }}>
            Coverage Overview
          </span>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Linked" value={stats.withImage} color="var(--color-approved)" />
          <StatCard label="Missing" value={stats.missing} color={stats.missing > 0 ? 'var(--color-urgent)' : 'var(--color-approved)'} />
          <StatCard label="Broken" value={stats.broken} color={stats.broken > 0 ? 'var(--color-urgent)' : 'var(--color-approved)'} />
          <StatCard label="Coverage" value={`${stats.coveragePct}%`} color={stats.coveragePct === 100 ? 'var(--color-approved)' : 'var(--color-pending)'} />
        </div>

        {/* Coverage Bar */}
        <div className="h-2 rounded-full bg-white/40 overflow-hidden mb-4">
          <div className="h-full rounded-full transition-all duration-500"
               style={{
                 width: `${stats.coveragePct}%`,
                 background: stats.coveragePct === 100 ? 'var(--color-approved)' : 'var(--color-pending)',
               }} />
        </div>

        {/* Group Breakdown */}
        <div className="space-y-1.5">
          {groupStats.map(g => (
            <button
              key={g.group_key}
              onClick={() => setGroupFilter(groupFilter === g.group_key ? 'all' : g.group_key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                groupFilter === g.group_key ? 'bg-white/50' : 'hover:bg-white/30'
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>
                  {g.group_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {g.missing > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--color-urgent)', background: 'rgba(107, 45, 10, 0.08)' }}>
                    {g.missing} missing
                  </span>
                )}
                {g.broken > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--color-change)', background: 'rgba(90, 32, 16, 0.08)' }}>
                    {g.broken} broken
                  </span>
                )}
                <span className="text-[11px] font-medium tabular-nums w-10 text-right"
                      style={{ color: g.coveragePct === 100 ? 'var(--color-approved)' : 'var(--color-pending)' }}>
                  {g.coveragePct}%
                </span>
                <div className="w-16 h-1.5 rounded-full bg-white/40 overflow-hidden">
                  <div className="h-full rounded-full"
                       style={{
                         width: `${g.coveragePct}%`,
                         background: g.coveragePct === 100 ? 'var(--color-approved)' : 'var(--color-pending)',
                       }} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="glass-s flex items-center gap-3 mb-4 px-4 py-3 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={14} style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Search selections…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-[13px] flex-1 placeholder:text-[var(--color-border)]"
            style={{ color: 'var(--color-text)' }}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={12} style={{ color: 'var(--color-muted)' }} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border)]" />

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          {FILTER_OPTIONS.map(f => {
            const count = f.key === 'all' ? selections.length :
                          f.key === 'missing' ? stats.missing :
                          f.key === 'broken' ? stats.broken :
                          stats.healthy
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  filter === f.key
                    ? 'text-[var(--color-surface)]'
                    : 'hover:bg-white/40'
                }`}
                style={filter === f.key
                  ? { background: 'var(--color-accent)', color: 'var(--color-surface)' }
                  : { color: 'var(--color-muted)' }
                }
              >
                {f.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border)]" />

        {/* Dimension Filters */}
        <FilterDropdown
          label="Group"
          value={groupFilter}
          options={groups.map(g => ({ key: g.group_key, label: g.group_name }))}
          onChange={setGroupFilter}
        />
        <FilterDropdown
          label="Schedule"
          value={sheetFilter}
          options={scheduleSheets.map(sh => ({ key: sh.output_code, label: sh.output_title }))}
          onChange={setSheetFilter}
        />
        <FilterDropdown
          label="Element"
          value={elementFilter}
          options={elementOptions.map(e => ({ key: e, label: getElementLabel(e) }))}
          onChange={setElementFilter}
        />
        <FilterDropdown
          label="Kind"
          value={kindFilter}
          options={kindOptions.map(k => ({ key: k, label: k.replace(/_/g, ' ') }))}
          onChange={setKindFilter}
        />
        <FilterDropdown
          label="Approval"
          value={statusFilter}
          options={approvalOptions.map(a => ({ key: a, label: a.replace(/_/g, ' ') }))}
          onChange={setStatusFilter}
        />

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <>
            <div className="w-px h-5 bg-[var(--color-border)]" />
            <button
              onClick={() => { setGroupFilter('all'); setKindFilter('all'); setElementFilter('all'); setStatusFilter('all'); setSheetFilter('all') }}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium hover:bg-white/40 transition-colors"
              style={{ color: 'var(--color-urgent)' }}
            >
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              <X size={10} />
            </button>
          </>
        )}

        {/* View Toggle */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode(VIEW_MODES.grid)}
            className={`p-1.5 rounded ${viewMode === VIEW_MODES.grid ? 'bg-white/50' : ''}`}
          >
            <Grid3X3 size={14} style={{ color: viewMode === VIEW_MODES.grid ? 'var(--color-text)' : 'var(--color-muted)' }} />
          </button>
          <button
            onClick={() => setViewMode(VIEW_MODES.list)}
            className={`p-1.5 rounded ${viewMode === VIEW_MODES.list ? 'bg-white/50' : ''}`}
          >
            <List size={14} style={{ color: viewMode === VIEW_MODES.list ? 'var(--color-text)' : 'var(--color-muted)' }} />
          </button>
        </div>
      </div>

      {/* ── Results Count ── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
          {filteredSelections.length} of {selections.length} selections
        </span>
      </div>

      {/* ── Image Grid / List ── */}
      {viewMode === VIEW_MODES.grid ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredSelections.map(item => (
            <ImageCard
              key={item.id}
              item={item}
              isBroken={brokenUrls.has(item.portal_image_url)}
              onImageError={handleImageError}
              onClick={() => { setSelectedItem(item); setEditUrl(item.portal_image_url || '') }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredSelections.map(item => (
            <ImageRow
              key={item.id}
              item={item}
              isBroken={brokenUrls.has(item.portal_image_url)}
              onImageError={handleImageError}
              onClick={() => { setSelectedItem(item); setEditUrl(item.portal_image_url || '') }}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredSelections.length === 0 && (
        <div className="glass-s text-center py-16">
          <Image size={24} style={{ color: 'var(--color-border)', margin: '0 auto 12px' }} />
          <p className="text-[13px] font-light" style={{ color: 'var(--color-muted)' }}>
            {search || filter !== 'all' || activeFilterCount > 0 ? 'No selections match the current filters.' : 'No selections found.'}
          </p>
        </div>
      )}

      {/* ── Detail / Edit Modal ── */}
      {selectedItem && (
        <ImageDetailModal
          item={selectedItem}
          editUrl={editUrl}
          setEditUrl={setEditUrl}
          saving={saving}
          isBroken={brokenUrls.has(selectedItem.portal_image_url)}
          onSave={saveImageUrl}
          onClose={() => setSelectedItem(null)}
          onImageError={handleImageError}
        />
      )}
    </div>
  )
}


/* ── Stat Card ── */
function StatCard({ label, value, color }) {
  return (
    <div className="bg-white/30 rounded-lg p-3 text-center">
      <div className="text-[20px] font-medium tabular-nums" style={{ color: color || 'var(--color-text)' }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[1px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
        {label}
      </div>
    </div>
  )
}


/* ── Filter Dropdown ── */
function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const activeLabel = value === 'all' ? label : options.find(o => o.key === value)?.label || value.replace(/_/g, ' ')
  const isActive = value !== 'all'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
          isActive ? 'bg-white/50' : 'hover:bg-white/30'
        }`}
        style={{ color: isActive ? 'var(--color-text)' : 'var(--color-muted)' }}
      >
        <Filter size={10} />
        <span className="max-w-[100px] truncate">{activeLabel}</span>
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] max-h-[240px] overflow-y-auto rounded-lg shadow-lg border border-[var(--color-border)] z-40"
             style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <button
            onClick={() => { onChange('all'); setOpen(false) }}
            className={`w-full text-left px-3 py-2 text-[11px] transition-colors ${
              value === 'all' ? 'bg-white/60 font-medium' : 'hover:bg-white/40'
            }`}
            style={{ color: 'var(--color-text)' }}
          >
            All {label}s
          </button>
          {options.map(o => (
            <button
              key={o.key}
              onClick={() => { onChange(o.key); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-[11px] transition-colors capitalize ${
                value === o.key ? 'bg-white/60 font-medium' : 'hover:bg-white/40'
              }`}
              style={{ color: 'var(--color-text)' }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


/* ── Grid Card ── */
function ImageCard({ item, isBroken, onImageError, onClick }) {
  const sel = item.project_selections || {}
  const hasImage = !!item.portal_image_url
  const statusColor = !hasImage ? 'var(--color-urgent)' :
                      isBroken ? 'var(--color-change)' :
                      'var(--color-approved)'

  return (
    <button
      onClick={onClick}
      className="glass-t glass-t-hover text-left p-0 overflow-hidden group transition-all"
      style={{ display: 'block' }}
    >
      {/* Image Area */}
      <div className="relative aspect-square bg-white/30 overflow-hidden">
        {hasImage && !isBroken ? (
          <img
            src={item.portal_image_url}
            alt={sel.title || ''}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => onImageError(item.portal_image_url)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {!hasImage ? (
              <>
                <Image size={20} style={{ color: 'var(--color-border)' }} />
                <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>No image</span>
              </>
            ) : (
              <>
                <XCircle size={20} style={{ color: 'var(--color-change)' }} />
                <span className="text-[10px]" style={{ color: 'var(--color-change)' }}>Broken link</span>
              </>
            )}
          </div>
        )}

        {/* Status Indicator */}
        <div className="absolute top-2 right-2">
          <span className="w-2.5 h-2.5 rounded-full block shadow-sm"
                style={{ background: statusColor }} />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Eye size={16} style={{ color: 'var(--color-text)' }} />
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <div className="text-[12px] font-medium leading-snug truncate" style={{ color: 'var(--color-text)' }}>
          {sel.title || '—'}
        </div>
        <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>
          {sel.manufacturer_name || sel.selection_kind?.replace(/_/g, ' ') || '—'}
        </div>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {sel.element_type && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-white/40" style={{ color: 'var(--color-muted)' }}>
              {elementLabels[sel.element_type] || sel.element_type?.replace(/_/g, ' ')}
            </span>
          )}
          <span className="text-[8px] px-1 py-0.5 rounded bg-white/40" style={{ color: 'var(--color-muted)' }}>
            {item.schedule_group?.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
    </button>
  )
}


/* ── List Row ── */
function ImageRow({ item, isBroken, onImageError, onClick }) {
  const sel = item.project_selections || {}
  const hasImage = !!item.portal_image_url
  const statusColor = !hasImage ? 'var(--color-urgent)' :
                      isBroken ? 'var(--color-change)' :
                      'var(--color-approved)'

  return (
    <button
      onClick={onClick}
      className="glass-t glass-t-hover w-full text-left flex items-center gap-3 px-3 py-2.5 transition-all"
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/30">
        {hasImage && !isBroken ? (
          <img
            src={item.portal_image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => onImageError(item.portal_image_url)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {!hasImage
              ? <Image size={14} style={{ color: 'var(--color-border)' }} />
              : <XCircle size={14} style={{ color: 'var(--color-change)' }} />
            }
          </div>
        )}
      </div>

      {/* Status dot */}
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor }} />

      {/* Title & Details */}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text)' }}>
          {sel.title || '—'}
        </div>
        <div className="text-[10px] truncate" style={{ color: 'var(--color-muted)' }}>
          {[sel.manufacturer_name, sel.model].filter(Boolean).join(' — ') || '—'}
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-1 shrink-0">
        {sel.element_type && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/40" style={{ color: 'var(--color-muted)' }}>
            {elementLabels[sel.element_type] || sel.element_type?.replace(/_/g, ' ')}
          </span>
        )}
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/40 capitalize" style={{ color: 'var(--color-muted)' }}>
          {sel.selection_kind?.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Group */}
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/40 shrink-0 capitalize"
            style={{ color: 'var(--color-muted)' }}>
        {item.schedule_group?.replace(/_/g, ' ')}
      </span>

      {/* Status Label */}
      <span className="text-[10px] w-14 text-right shrink-0" style={{ color: statusColor }}>
        {!hasImage ? 'Missing' : isBroken ? 'Broken' : 'OK'}
      </span>
    </button>
  )
}


/* ── Detail / Edit Modal ── */
function ImageDetailModal({ item, editUrl, setEditUrl, saving, isBroken, onSave, onClose, onImageError }) {
  const sel = item.project_selections || {}
  const attrs = sel.attributes || {}
  const hasImage = !!item.portal_image_url
  const urlChanged = (editUrl || '') !== (item.portal_image_url || '')
  const inputRef = useRef(null)

  useEffect(() => {
    function handleEsc(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const copyUrl = () => {
    if (item.portal_image_url) {
      navigator.clipboard.writeText(item.portal_image_url)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      {/* Backdrop — white frost overlay consistent with glass system */}
      <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl glass rounded-xl shadow-xl overflow-hidden"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="min-w-0">
            <h2 className="text-[15px] font-medium truncate" style={{ color: 'var(--color-text)' }}>
              {sel.title || 'Untitled Selection'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {sel.selection_kind && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/40"
                      style={{ color: 'var(--color-muted)' }}>
                  {sel.selection_kind.replace(/_/g, ' ')}
                </span>
              )}
              <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
                {item.schedule_group?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/40 transition-colors">
            <X size={16} style={{ color: 'var(--color-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">

          {/* Image Preview */}
          <div className="rounded-lg overflow-hidden bg-white/30 border border-[var(--color-border)]">
            {hasImage && !isBroken ? (
              <img
                src={item.portal_image_url}
                alt={sel.title || ''}
                className="w-full max-h-[300px] object-contain"
                onError={() => onImageError(item.portal_image_url)}
              />
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                {!hasImage ? (
                  <>
                    <Image size={28} style={{ color: 'var(--color-border)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--color-muted)' }}>No image linked</span>
                  </>
                ) : (
                  <>
                    <XCircle size={28} style={{ color: 'var(--color-change)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--color-change)' }}>Image failed to load</span>
                    <span className="text-[10px] max-w-sm truncate px-4" style={{ color: 'var(--color-muted)' }}>
                      {item.portal_image_url}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Selection Details */}
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Manufacturer" value={sel.manufacturer_name} />
            <DetailField label="Model" value={sel.model} />
            <DetailField label="Supplier" value={sel.supplier_name} />
            <DetailField label="Spec Ref" value={sel.spec_reference} />
            {attrs.colour && <DetailField label="Colour" value={attrs.colour} />}
            {attrs.finish && <DetailField label="Finish" value={attrs.finish} />}
          </div>

          {/* URL Editor */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={12} style={{ color: 'var(--color-muted)' }} />
              <span className="text-[11px] uppercase tracking-[1px] font-medium"
                    style={{ color: 'var(--color-muted)' }}>
                Image URL
              </span>
              {item.portal_image_url && (
                <button onClick={copyUrl}
                        className="ml-auto flex items-center gap-1 text-[10px] hover:bg-white/40 px-2 py-0.5 rounded transition-colors"
                        style={{ color: 'var(--color-muted)' }}>
                  <Copy size={10} /> Copy
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editUrl}
                onChange={e => setEditUrl(e.target.value)}
                placeholder="Paste image URL…"
                className="flex-1 bg-white/40 border border-[var(--color-border)] rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-border)]"
                style={{ color: 'var(--color-text)' }}
              />
              {item.portal_image_url && (
                <a href={item.portal_image_url} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white/40 border border-[var(--color-border)] hover:bg-white/60 transition-colors text-[11px]"
                   style={{ color: 'var(--color-muted)' }}>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            {/* URL preview if changed */}
            {urlChanged && editUrl && (
              <div className="mt-3 rounded-lg overflow-hidden bg-white/20 border border-dashed border-[var(--color-border)] p-2">
                <span className="text-[10px] block mb-1.5" style={{ color: 'var(--color-muted)' }}>Preview:</span>
                <img
                  src={editUrl}
                  alt="Preview"
                  className="max-h-32 rounded object-contain"
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                />
                <div className="hidden items-center gap-2 py-4 justify-center">
                  <AlertTriangle size={14} style={{ color: 'var(--color-urgent)' }} />
                  <span className="text-[11px]" style={{ color: 'var(--color-urgent)' }}>Image failed to load from this URL</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-white/40 transition-colors"
            style={{ color: 'var(--color-muted)' }}
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {item.portal_image_url && (
              <button
                onClick={() => { setEditUrl(''); }}
                className="px-3 py-2 rounded-lg text-[11px] font-medium hover:bg-white/40 transition-colors"
                style={{ color: 'var(--color-urgent)' }}
              >
                Clear Image
              </button>
            )}
            <button
              onClick={onSave}
              disabled={!urlChanged || saving}
              className="px-4 py-2 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-40"
              style={{
                background: urlChanged ? 'var(--color-accent)' : 'var(--color-border)',
                color: 'var(--color-surface)',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


/* ── Detail Field ── */
function DetailField({ label, value }) {
  if (!value) return null
  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.5px]" style={{ color: 'var(--color-muted)' }}>
        {label}
      </span>
      <div className="text-[12px] mt-0.5" style={{ color: 'var(--color-text)' }}>
        {value}
      </div>
    </div>
  )
}
