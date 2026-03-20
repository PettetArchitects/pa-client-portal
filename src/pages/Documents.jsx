import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, Download, Eye, Clock, Search, Folder } from 'lucide-react'

export default function Documents({ projectId }) {
  const [docs, setDocs] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    loadDocuments()
  }, [projectId])

  async function loadDocuments() {
    const { data } = await supabase
      .from('homeowner_document_shares')
      .select(`
        *,
        project_documents:project_document_id (
          title,
          document_type,
          file_path,
          file_size_bytes,
          version,
          uploaded_at,
          metadata
        )
      `)
      .eq('project_id', projectId)
      .eq('active', true)
      .order('shared_at', { ascending: false })

    setDocs(data || [])
    setLoading(false)
  }

  async function markViewed(id) {
    await supabase.from('homeowner_document_shares')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', id)
  }

  const filtered = docs.filter(d => {
    if (!search) return true
    const title = d.project_documents?.title || ''
    const type = d.project_documents?.document_type || ''
    return (title + type).toLowerCase().includes(search.toLowerCase())
  })

  // Group by document type
  const grouped = filtered.reduce((acc, doc) => {
    const type = doc.project_documents?.document_type || 'Other'
    if (!acc[type]) acc[type] = []
    acc[type].push(doc)
    return acc
  }, {})

  if (loading) return <div className="animate-pulse"><div className="h-8 w-48 bg-[var(--color-border)] rounded mb-8" /></div>

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-tight mb-1">Documents</h1>
        <p className="text-sm text-[var(--color-muted)] font-light">
          {docs.length} document{docs.length !== 1 ? 's' : ''} shared with you
        </p>
      </div>

      {/* Search */}
      {docs.length > 5 && (
        <div className="relative mb-8">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-white text-sm font-light focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
      )}

      {/* Document list */}
      {Object.entries(grouped).map(([type, typeDocs]) => (
        <section key={type} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Folder size={14} className="text-[var(--color-muted)]" />
            <h2 className="text-xs font-medium tracking-[1.5px] uppercase text-[var(--color-muted)]">{type}</h2>
          </div>

          <div className="space-y-2">
            {typeDocs.map(doc => (
              <DocumentRow key={doc.id} doc={doc} onView={() => markViewed(doc.id)} />
            ))}
          </div>
        </section>
      ))}

      {docs.length === 0 && (
        <div className="text-center py-20">
          <FileText size={24} className="mx-auto text-[var(--color-border)] mb-3" />
          <p className="text-sm text-[var(--color-muted)] font-light">No documents shared yet.</p>
          <p className="text-xs text-[var(--color-muted)] font-light mt-1">
            Documents will appear here when your architect shares them.
          </p>
        </div>
      )}
    </div>
  )
}

function DocumentRow({ doc, onView }) {
  const pd = doc.project_documents || {}
  const isNew = !doc.viewed_at

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

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl bg-white border transition-all hover:shadow-sm ${
      isNew ? 'border-[var(--color-pending)]/40 border-l-[3px]' : 'border-[var(--color-border)]'
    }`}>
      <div className="w-9 h-9 rounded-lg bg-[#F4F4F2] flex items-center justify-center shrink-0">
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
          {pd.version && <span className="text-xs text-[var(--color-muted)] font-light">v{pd.version}</span>}
          {pd.file_size_bytes && <span className="text-xs text-[var(--color-muted)] font-light">{formatSize(pd.file_size_bytes)}</span>}
          <span className="text-xs text-[var(--color-muted)] font-light flex items-center gap-1">
            <Clock size={10} /> {formatDate(doc.shared_at)}
          </span>
        </div>
        {doc.share_note && (
          <p className="text-xs text-[var(--color-muted)] font-light mt-1 italic">{doc.share_note}</p>
        )}
      </div>

      <button
        onClick={onView}
        className="shrink-0 w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
        title="View document"
      >
        <Eye size={14} />
      </button>
    </div>
  )
}
