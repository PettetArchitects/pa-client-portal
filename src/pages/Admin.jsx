import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import { UserPlus, Shield, Key, ChevronDown, ChevronUp, Plus, X, Check, AlertCircle, Link2, Users, Search } from 'lucide-react'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-client`

async function callManageClient(action, body = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...body }),
  })
  return res.json()
}

export default function Admin() {
  const { isArchitect, projects } = useProject()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedClient, setExpandedClient] = useState(null)
  const [message, setMessage] = useState(null)

  // Add client form
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newProjects, setNewProjects] = useState([])
  const [newAccess, setNewAccess] = useState('approver')
  const [creating, setCreating] = useState(false)
  const [selectedCrmContact, setSelectedCrmContact] = useState(null)

  // CRM contacts picker
  const [crmContacts, setCrmContacts] = useState([])
  const [crmLoading, setCrmLoading] = useState(false)
  const [showCrmPicker, setShowCrmPicker] = useState(false)
  const [crmSearch, setCrmSearch] = useState('')

  // Reset password
  const [resetUserId, setResetUserId] = useState(null)
  const [resetPw, setResetPw] = useState('')

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    const data = await callManageClient('list-clients')
    if (data.clients) setClients(data.clients)
    setLoading(false)
  }

  async function loadCrmContacts() {
    setCrmLoading(true)
    const data = await callManageClient('list-crm-contacts')
    if (data.contacts) setCrmContacts(data.contacts)
    setCrmLoading(false)
  }

  function handleSelectCrmContact(contact) {
    setSelectedCrmContact(contact)
    setNewName(contact.full_name || '')
    setNewEmail(contact.email || '')
    setNewPhone(contact.phone || '')
    // Auto-select projects this CRM contact is linked to
    if (contact.project_links?.length) {
      const linkedProjectIds = contact.project_links
        .map(pl => pl.project_id)
        .filter(pid => projects.some(p => p.project_id === pid))
      setNewProjects(linkedProjectIds)
    }
    setShowCrmPicker(false)
    setCrmSearch('')
  }

  function handleOpenCrmPicker() {
    setShowCrmPicker(true)
    if (crmContacts.length === 0) loadCrmContacts()
  }

  async function handleCreateClient(e) {
    e.preventDefault()
    setMessage(null)
    setCreating(true)

    const body = {
      email: newEmail,
      password: newPassword,
      full_name: newName,
      phone: newPhone,
      project_ids: newProjects,
      access_level: newAccess,
    }
    if (selectedCrmContact) {
      body.crm_contact_id = selectedCrmContact.id
    }

    const result = await callManageClient('create-client', body)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: `Client ${newEmail} created successfully.` })
      setShowAddForm(false)
      setNewEmail(''); setNewName(''); setNewPhone(''); setNewPassword(''); setNewProjects([]); setNewAccess('approver'); setSelectedCrmContact(null)
      loadClients()
    }
    setCreating(false)
  }

  async function handleToggleAccess(userId, projectId, currentActive) {
    await callManageClient('update-access', {
      user_id: userId,
      project_id: projectId,
      active: !currentActive,
    })
    loadClients()
  }

  async function handleResetPassword(userId) {
    if (!resetPw || resetPw.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    const result = await callManageClient('reset-password', {
      user_id: userId,
      new_password: resetPw,
    })
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Password reset successfully.' })
      setResetUserId(null)
      setResetPw('')
    }
  }

  async function handleAddProjectAccess(userId, projectId) {
    await callManageClient('add-project-access', {
      user_id: userId,
      project_id: projectId,
      access_level: 'approver',
    })
    loadClients()
  }

  if (!isArchitect) {
    return <div className="text-sm text-[var(--color-muted)]">Access denied.</div>
  }

  const filteredCrmContacts = crmContacts.filter(c => {
    if (!crmSearch) return true
    const q = crmSearch.toLowerCase()
    return (c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
  })

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-medium text-[var(--color-text)] mb-1">Client Management</h1>
          <p className="text-sm text-[var(--color-muted)] font-light">
            Create accounts, manage project access, and reset passwords.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-text)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
        >
          <UserPlus size={14} />
          Add Client
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-6 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Add client form */}
      {showAddForm && (
        <form onSubmit={handleCreateClient} className="bg-white border border-[var(--color-border)] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[var(--color-text)]">New Client Account</h2>
            <button
              type="button"
              onClick={handleOpenCrmPicker}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--color-accent)] border border-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
            >
              <Link2 size={12} /> Link from CRM
            </button>
          </div>

          {/* CRM contact picker */}
          {showCrmPicker && (
            <div className="mb-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] font-medium">Select CRM Contact</span>
                <button type="button" onClick={() => setShowCrmPicker(false)}><X size={14} className="text-[var(--color-muted)]" /></button>
              </div>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="text"
                  value={crmSearch}
                  onChange={e => setCrmSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
              {crmLoading ? (
                <p className="text-xs text-[var(--color-muted)] py-2">Loading CRM contacts...</p>
              ) : filteredCrmContacts.length === 0 ? (
                <p className="text-xs text-[var(--color-muted)] py-2">No contacts found.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredCrmContacts.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCrmContact(c)}
                      disabled={c.has_portal_account}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                        c.has_portal_account
                          ? 'opacity-50 cursor-not-allowed bg-[#F0F0EE]'
                          : 'hover:bg-[#F0F0EE]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium text-[var(--color-text)] block">{c.full_name}</span>
                          <span className="text-[10px] text-[var(--color-muted)]">{c.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.project_links?.length > 0 && (
                            <span className="text-[9px] text-[var(--color-muted)]">
                              {c.project_links.length} project{c.project_links.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {c.has_portal_account && (
                            <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full">
                              Has account
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CRM linked badge */}
          {selectedCrmContact && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 rounded-lg">
              <Link2 size={12} className="text-blue-600" />
              <span className="text-xs text-blue-700">
                Linked to CRM: {selectedCrmContact.full_name} (#{selectedCrmContact.id})
              </span>
              <button type="button" onClick={() => setSelectedCrmContact(null)} className="ml-auto">
                <X size={12} className="text-blue-400" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">Full name *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div>
              <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">Email *</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div>
              <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">Phone</label>
              <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
            <div>
              <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">Password *</label>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                placeholder="Min 8 characters"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:border-[var(--color-accent)]" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">Assign to projects *</label>
            <div className="flex flex-wrap gap-2">
              {projects.map(p => (
                <button
                  key={p.project_id}
                  type="button"
                  onClick={() => {
                    setNewProjects(prev =>
                      prev.includes(p.project_id)
                        ? prev.filter(id => id !== p.project_id)
                        : [...prev, p.project_id]
                    )
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    newProjects.includes(p.project_id)
                      ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                      : 'bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-text)]'
                  }`}
                >
                  {p.display_name || p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">Access level</label>
            <select value={newAccess} onChange={e => setNewAccess(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:border-[var(--color-accent)]">
              <option value="viewer">Viewer — read only</option>
              <option value="approver">Approver — can approve selections</option>
              <option value="full">Full — all actions</option>
            </select>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="submit" disabled={creating || newProjects.length === 0}
              className="px-6 py-2.5 bg-[var(--color-text)] text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Account'}
            </button>
            <button type="button" onClick={() => { setShowAddForm(false); setSelectedCrmContact(null); setShowCrmPicker(false) }}
              className="px-6 py-2.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Client list */}
      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading clients...</p>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-sm text-[var(--color-muted)]">
          No client accounts yet. Click "Add Client" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => {
            const isExpanded = expandedClient === client.id
            const isArch = client.metadata?.role === 'architect'
            const hasCrm = !!client.crm_contact_id
            return (
              <div key={client.id} className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAFAF8] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-sm font-medium text-[var(--color-text)] block">{client.full_name}</span>
                      <span className="text-xs text-[var(--color-muted)]">{client.email}</span>
                    </div>
                    {isArch && (
                      <span className="text-[9px] tracking-[1.5px] bg-[var(--color-text)] text-white px-2 py-0.5 rounded-full font-medium">
                        Architect
                      </span>
                    )}
                    {hasCrm && (
                      <span className="text-[9px] tracking-[1px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Link2 size={8} /> CRM
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--color-muted)]">
                      {client.projects?.filter(p => p.active).length || 0} project{client.projects?.filter(p => p.active).length !== 1 ? 's' : ''}
                    </span>
                    {isExpanded ? <ChevronUp size={14} className="text-[var(--color-muted)]" /> : <ChevronDown size={14} className="text-[var(--color-muted)]" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] px-5 py-4">
                    {/* Contact */}
                    <div className="flex gap-8 text-xs text-[var(--color-muted)] mb-4">
                      {client.phone && <span>Phone: {client.phone}</span>}
                      <span>Created: {new Date(client.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* CRM details */}
                    {client.crm && (
                      <div className="mb-4 px-3 py-3 bg-blue-50/50 rounded-lg border border-blue-100">
                        <h3 className="text-[11px] tracking-[1.5px] uppercase text-blue-600 mb-2 font-medium flex items-center gap-1.5">
                          <Link2 size={10} /> CRM Record
                        </h3>
                        <div className="space-y-1.5">
                          <div className="flex gap-6 text-xs">
                            <span className="text-[var(--color-muted)]">Contact type:</span>
                            <span className="text-[var(--color-text)] font-medium">{client.crm.contact_type || '—'}</span>
                          </div>
                          {client.crm.notes && (
                            <div className="text-xs">
                              <span className="text-[var(--color-muted)]">Notes: </span>
                              <span className="text-[var(--color-text)]">{client.crm.notes}</span>
                            </div>
                          )}
                          {client.crm.project_links?.length > 0 && (
                            <div className="text-xs">
                              <span className="text-[var(--color-muted)]">CRM projects: </span>
                              {client.crm.project_links.map((pl, i) => (
                                <span key={i} className="text-[var(--color-text)]">
                                  {pl.project_name || pl.project_id}
                                  {pl.role_on_project && ` (${pl.role_on_project})`}
                                  {i < client.crm.project_links.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Project access */}
                    <h3 className="text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-2 font-medium">Project Access</h3>
                    <div className="space-y-2 mb-4">
                      {client.projects?.map(pa => (
                        <div key={pa.project_id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--color-bg)]">
                          <div>
                            <span className="text-xs font-medium text-[var(--color-text)]">
                              {pa.metadata?.project_name || pa.project_id}
                            </span>
                            <span className="text-[10px] text-[var(--color-muted)] ml-2">
                              ({pa.access_level})
                            </span>
                          </div>
                          <button
                            onClick={() => handleToggleAccess(client.id, pa.project_id, pa.active)}
                            className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                              pa.active
                                ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-700'
                                : 'bg-red-50 text-red-700 hover:bg-green-50 hover:text-green-700'
                            } transition-colors`}
                          >
                            {pa.active ? 'Active' : 'Disabled'}
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add project access */}
                    {!isArch && (
                      <div className="mb-4">
                        <h3 className="text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-2 font-medium">Add Project</h3>
                        <div className="flex flex-wrap gap-2">
                          {projects
                            .filter(p => !client.projects?.some(cp => cp.project_id === p.project_id))
                            .map(p => (
                              <button
                                key={p.project_id}
                                onClick={() => handleAddProjectAccess(client.id, p.project_id)}
                                className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                              >
                                <Plus size={10} /> {p.display_name || p.name}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Reset password */}
                    <div className="flex items-center gap-3 pt-3 border-t border-[var(--color-border)]">
                      {resetUserId === client.id ? (
                        <>
                          <input
                            type="text"
                            value={resetPw}
                            onChange={e => setResetPw(e.target.value)}
                            placeholder="New password (min 8)"
                            className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm w-48 focus:outline-none focus:border-[var(--color-accent)]"
                          />
                          <button onClick={() => handleResetPassword(client.id)}
                            className="px-3 py-2 bg-[var(--color-text)] text-white text-xs rounded-lg hover:opacity-90">
                            Set
                          </button>
                          <button onClick={() => { setResetUserId(null); setResetPw('') }}
                            className="text-xs text-[var(--color-muted)]">Cancel</button>
                        </>
                      ) : (
                        <button
                          onClick={() => setResetUserId(client.id)}
                          className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                        >
                          <Key size={12} /> Reset password
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
