import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useProject } from '../hooks/useProject'
import { usePractice } from '../hooks/usePractice'
import {
  UserPlus, Key, ChevronDown, ChevronUp, Plus, X, Check, AlertCircle,
  Link2, Search, Clock, CircleDashed, CircleCheck, Mail, Phone,
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, ArrowRight,
} from 'lucide-react'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-client`

/* ── Custom SVG discipline icons — architectural line-weight ── */
function ArchitectIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 22h20L12 2z" />
      <path d="M12 2v20" opacity="0.4" />
      <path d="M7 12h10" opacity="0.4" />
    </svg>
  )
}

function StructuralIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="18" width="18" height="4" rx="0.5" />
      <path d="M5 18V8" />
      <path d="M19 18V8" />
      <path d="M5 8h14" />
      <path d="M9 18V12" opacity="0.4" />
      <path d="M15 18V12" opacity="0.4" />
      <path d="M5 12h14" opacity="0.4" />
    </svg>
  )
}

function EnergyIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function FireIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c4-3 7-6.5 7-10.5C19 7 16 2 12 2c-1 3-3 5-5 6.5C5 10 4 12 4 14c0 3 2 5.5 4 7" />
      <path d="M12 22c-1.5-1.5-2.5-3.5-2.5-5.5 0-2 1-3.5 2.5-5 1.5 1.5 2.5 3 2.5 5 0 2-1 4-2.5 5.5z" opacity="0.4" />
    </svg>
  )
}

function WaterIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C12 2 5 10 5 14.5C5 18.64 8.13 22 12 22s7-3.36 7-7.5C19 10 12 2 12 2z" />
      <path d="M8 17c0-2.2 1.8-4 4-4" opacity="0.4" />
    </svg>
  )
}

function CivilIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20L8 10l4 4 4-6 6 12" />
      <path d="M2 20h20" />
      <circle cx="8" cy="10" r="1" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

function EcologyIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12" />
      <path d="M12 12C12 12 7 10 4 6c5 0 8 2 8 6z" />
      <path d="M12 12c0-4 3-6 8-6-3 4-8 6-8 6z" />
      <path d="M9 22h6" opacity="0.4" />
    </svg>
  )
}

function SurveyIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" opacity="0.3" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </svg>
  )
}

function CertifierIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
      <path d="M3 9h18" opacity="0.3" />
    </svg>
  )
}

function GeotechIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20" />
      <path d="M4 20v-4c0-1 1-2 2-2h1" opacity="0.4" />
      <path d="M12 4v16" />
      <path d="M12 4l-3 4h6l-3-4z" fill="currentColor" opacity="0.15" />
      <path d="M8 14h8" opacity="0.3" />
      <path d="M6 17h12" opacity="0.3" />
    </svg>
  )
}

function ClientIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </svg>
  )
}

const DISCIPLINE_ICONS = {
  architect: ArchitectIcon,
  structural_engineer: StructuralIcon,
  energy_assessor: EnergyIcon,
  bushfire_consultant: FireIcon,
  stormwater_engineer: WaterIcon,
  civil_engineer: CivilIcon,
  ecologist: EcologyIcon,
  surveyor: SurveyIcon,
  certifier: CertifierIcon,
  geotechnical_engineer: GeotechIcon,
  client: ClientIcon,
  co_owner: ClientIcon,
}

const STATUS_CONFIG = {
  engaged: { label: 'Engaged', icon: CircleCheck, color: 'var(--color-approved)', bg: 'rgba(52,168,83,0.08)' },
  issued: { label: 'Brief Issued', icon: Clock, color: 'var(--color-pending)', bg: 'rgba(251,188,4,0.08)' },
  draft: { label: 'Brief Draft', icon: CircleDashed, color: 'var(--color-muted)', bg: 'rgba(0,0,0,0.04)' },
  not_engaged: { label: 'Required', icon: CircleDashed, color: 'var(--color-muted)', bg: 'rgba(0,0,0,0.04)' },
  received: { label: 'Report Received', icon: Check, color: 'var(--color-approved)', bg: 'rgba(52,168,83,0.08)' },
}

/* ── QA Gate status config ── */
const GATE_STATUS = {
  passed: { label: 'Passed', icon: CheckCircle2, color: 'var(--color-approved)', bg: 'rgba(52,168,83,0.08)' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'var(--color-pending)', bg: 'rgba(251,188,4,0.08)' },
  blocked: { label: 'Blocked', icon: XCircle, color: 'var(--color-change)', bg: 'rgba(234,67,53,0.08)' },
  not_started: { label: 'Not Started', icon: CircleDashed, color: 'var(--color-muted)', bg: 'rgba(0,0,0,0.04)' },
  warning: { label: 'Warning', icon: AlertTriangle, color: 'var(--color-pending)', bg: 'rgba(251,188,4,0.08)' },
}

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
  const { isArchitect, isActualArchitect, project, projects } = useProject()
  const { practice } = usePractice()
  const [consultants, setConsultants] = useState([])
  const [teamContacts, setTeamContacts] = useState([])
  const [riskFlags, setRiskFlags] = useState([])
  const [loading, setLoading] = useState(true)

  // Architect-only state
  const [clients, setClients] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedClient, setExpandedClient] = useState(null)
  const [message, setMessage] = useState(null)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newProjects, setNewProjects] = useState([])
  const [newAccess, setNewAccess] = useState('approver')
  const [creating, setCreating] = useState(false)
  const [selectedCrmContact, setSelectedCrmContact] = useState(null)
  const [crmContacts, setCrmContacts] = useState([])
  const [crmLoading, setCrmLoading] = useState(false)
  const [showCrmPicker, setShowCrmPicker] = useState(false)
  const [crmSearch, setCrmSearch] = useState('')
  const [resetUserId, setResetUserId] = useState(null)
  const [resetPw, setResetPw] = useState('')

  useEffect(() => { loadAll() }, [project?.project_id])

  async function loadAll() {
    setLoading(true)
    const promises = [loadConsultants(), loadTeamContacts(), loadRiskFlags()]
    if (isActualArchitect) promises.push(loadClients())
    await Promise.all(promises)
    setLoading(false)
  }

  async function loadClients() {
    const data = await callManageClient('list-clients')
    if (data.clients) setClients(data.clients)
  }

  async function loadConsultants() {
    if (!project?.project_guid) return
    const { data } = await supabase
      .from('project_consultant_briefs')
      .select('*, consultant_disciplines!inner(discipline_name, description, typical_scope)')
      .eq('project_guid', project.project_guid)
    setConsultants(data || [])
  }

  async function loadTeamContacts() {
    if (!project?.project_id) return
    const { data } = await supabase
      .from('v_project_team')
      .select('*')
      .eq('project_id', project.project_id)
    setTeamContacts(data || [])
  }

  async function loadRiskFlags() {
    if (!project?.project_guid) return
    const { data } = await supabase
      .from('project_risk_flags')
      .select('*')
      .eq('project_guid', project.project_guid)
      .eq('resolved', false)
      .order('severity')
    setRiskFlags(data || [])
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
    if (selectedCrmContact) body.crm_contact_id = selectedCrmContact.id
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
    await callManageClient('update-access', { user_id: userId, project_id: projectId, active: !currentActive })
    loadClients()
  }

  async function handleResetPassword(userId) {
    if (!resetPw || resetPw.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    const result = await callManageClient('reset-password', { user_id: userId, new_password: resetPw })
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Password reset successfully.' })
      setResetUserId(null)
      setResetPw('')
    }
  }

  async function handleAddProjectAccess(userId, projectId) {
    await callManageClient('add-project-access', { user_id: userId, project_id: projectId, access_level: 'approver' })
    loadClients()
  }

  const filteredCrmContacts = crmContacts.filter(c => {
    if (!crmSearch) return true
    const q = crmSearch.toLowerCase()
    return (c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
  })

  const practiceName = practice?.practice_name || 'Pettet Architects'
  const accreditations = practice?.accreditations || {}

  // Build architect entry
  const architectEntry = {
    discipline: 'Architect',
    name: accreditations.nominated_architect || 'Sean Pettet',
    org: practiceName,
    status: 'engaged',
    scope: 'Lead design, documentation, contract administration',
    registration: accreditations.arb_registration || '',
    email: practice?.contact_email || '',
    phone: practice?.contact_phone || '',
  }

  const clientContacts = teamContacts.filter(c => c.contact_type === 'client')
  const otherContacts = teamContacts.filter(c => c.contact_type !== 'client')

  // QA gates for architect view
  const qaGates = buildQAGates(consultants, riskFlags, project)

  if (loading) {
    return (
      <div className="max-w-4xl animate-pulse">
        <div className="h-8 w-48 bg-white/40 rounded mb-4" />
        <div className="h-3 w-64 bg-white/40 rounded mb-8" />
        {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/40 rounded-xl mb-3" />)}
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
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

      {/* ── PROJECT TEAM — visible to everyone ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-[var(--color-text)] mb-1">Project Team</h1>
            <p className="text-sm text-[var(--color-muted)] font-light">
              {isArchitect
                ? `All disciplines required for ${project?.display_name || project?.name || 'this project'}.`
                : `Your project team for ${project?.display_name || project?.name || 'this project'}.`
              }
            </p>
          </div>
          {isArchitect && (
            <div className="flex items-center gap-3 text-[10px] text-[var(--color-muted)]">
              <span className="flex items-center gap-1"><CircleCheck size={10} className="text-[var(--color-approved)]" /> Engaged</span>
              <span className="flex items-center gap-1"><Clock size={10} className="text-[var(--color-pending)]" /> Brief issued</span>
              <span className="flex items-center gap-1"><CircleDashed size={10} /> Required</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {/* Architect row */}
          <TeamRow
            iconComponent={ArchitectIcon}
            discipline="Architect"
            name={architectEntry.name}
            org={architectEntry.org}
            status="engaged"
            scope={!isArchitect ? 'Design, documentation & contract administration' : architectEntry.scope}
            registration={isArchitect ? architectEntry.registration : null}
            email={architectEntry.email}
            phone={architectEntry.phone}
            showStatus={isArchitect}
          />

          {/* Client contacts */}
          {clientContacts.map(c => (
            <TeamRow
              key={c.contact_id}
              iconComponent={ClientIcon}
              discipline={c.role_on_project === 'co_owner' ? 'Co-owner' : 'Client'}
              name={c.full_name}
              org={c.organisation_name}
              status="engaged"
              scope={c.link_notes}
              email={isArchitect ? c.email : null}
              phone={isArchitect ? c.phone : null}
              showStatus={isArchitect}
            />
          ))}

          {/* Consultants from project_consultant_briefs */}
          {consultants.map(c => {
            const disc = c.consultant_disciplines
            const IconComp = DISCIPLINE_ICONS[c.discipline_key] || GeotechIcon
            const isEngaged = c.brief_status === 'engaged' || c.brief_status === 'received'
            return (
              <TeamRow
                key={c.id}
                iconComponent={IconComp}
                discipline={disc?.discipline_name || c.discipline_key?.replace(/_/g, ' ')}
                name={c.metadata?.consultant_name || null}
                org={c.metadata?.consultant_org || null}
                status={c.brief_status || 'not_engaged'}
                scope={isArchitect ? c.scope_summary : disc?.description}
                typicalScope={!isArchitect && !disc?.description ? disc?.typical_scope : (isArchitect ? disc?.typical_scope : null)}
                email={isArchitect ? c.metadata?.email : null}
                phone={isArchitect ? c.metadata?.phone : null}
                showStatus={isArchitect}
                showRequired={!isArchitect && !isEngaged}
              />
            )
          })}

          {/* Other team contacts from CRM */}
          {otherContacts.map(c => {
            const IconComp = DISCIPLINE_ICONS[c.contact_role] || ClientIcon
            return (
              <TeamRow
                key={c.contact_id}
                iconComponent={IconComp}
                discipline={c.role_on_project?.replace(/_/g, ' ') || c.contact_role?.replace(/_/g, ' ') || 'Team'}
                name={c.full_name}
                org={c.organisation_name}
                status="engaged"
                scope={c.link_notes}
                email={isArchitect ? c.email : null}
                phone={isArchitect ? c.phone : null}
                showStatus={isArchitect}
              />
            )
          })}

          {consultants.length === 0 && teamContacts.length === 0 && (
            <div className="text-center py-8 backdrop-blur-xl bg-white/40 rounded-xl border border-white/40">
              <p className="text-xs text-[var(--color-muted)] font-light">
                Team roster loading...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── QA PROCESS & GATING — architect only ── */}
      {isArchitect && (
        <div className="mb-10">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-[var(--color-text)] mb-1">QA Gates</h2>
            <p className="text-sm text-[var(--color-muted)] font-light">
              Pre-issue quality checks and consultant deliverable status.
            </p>
          </div>

          <div className="space-y-2">
            {qaGates.map((gate, i) => (
              <GateRow key={i} gate={gate} />
            ))}
          </div>

          {/* Risk flags summary */}
          {riskFlags.length > 0 && (
            <div className="mt-6">
              <h3 className="text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] font-medium mb-3">
                Open Risk Flags ({riskFlags.length})
              </h3>
              <div className="space-y-1.5">
                {riskFlags.map(rf => (
                  <div key={rf.id} className="flex items-start gap-3 px-4 py-3 rounded-lg backdrop-blur-xl bg-white/40 border border-white/30">
                    <AlertTriangle size={14} className={rf.severity === 'HIGH' ? 'text-red-500 mt-0.5' : rf.severity === 'MED' ? 'text-amber-500 mt-0.5' : 'text-[var(--color-muted)] mt-0.5'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono tracking-wider text-[var(--color-muted)] uppercase">{rf.flag_key}</span>
                        <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${
                          rf.severity === 'HIGH' ? 'bg-red-50 text-red-600' :
                          rf.severity === 'MED' ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-50 text-gray-500'
                        }`}>{rf.severity}</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-text)] font-light mt-0.5 leading-relaxed">{rf.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CLIENT MANAGEMENT — architect only ── */}
      {isArchitect && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-medium text-[var(--color-text)] mb-1">Portal Accounts</h2>
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

          {/* Add client form */}
          {showAddForm && (
            <form onSubmit={handleCreateClient} className="backdrop-blur-xl bg-white/60 border border-white/40 rounded-xl p-6 mb-6">
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

              {showCrmPicker && (
                <div className="mb-4 border border-white/40 rounded-lg bg-white/40 p-4">
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
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/40 bg-white/60 text-sm focus:outline-none focus:border-[var(--color-accent)]"
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
                              ? 'opacity-50 cursor-not-allowed bg-white/20'
                              : 'hover:bg-white/50'
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
                    className="w-full px-3 py-2.5 rounded-lg border border-white/40 bg-white/60 text-sm focus:outline-none focus:border-[var(--color-accent)]" />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">Email *</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
                    className="w-full px-3 py-2.5 rounded-lg border border-white/40 bg-white/60 text-sm focus:outline-none focus:border-[var(--color-accent)]" />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">Phone</label>
                  <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-white/40 bg-white/60 text-sm focus:outline-none focus:border-[var(--color-accent)]" />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-1.5 font-medium">Password *</label>
                  <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2.5 rounded-lg border border-white/40 bg-white/60 text-sm focus:outline-none focus:border-[var(--color-accent)]" />
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
                          : 'bg-white/40 text-[var(--color-muted)] border-white/40 hover:border-[var(--color-text)]'
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
                  className="px-3 py-2.5 rounded-lg border border-white/40 bg-white/60 text-sm focus:outline-none focus:border-[var(--color-accent)]">
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
          {clients.length === 0 ? (
            <div className="text-center py-8 backdrop-blur-xl bg-white/40 rounded-xl border border-white/40 text-sm text-[var(--color-muted)]">
              No client accounts yet. Click "Add Client" to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map(client => {
                const isExpanded = expandedClient === client.id
                const isArch = client.metadata?.role === 'architect'
                const hasCrm = !!client.crm_contact_id
                return (
                  <div key={client.id} className="backdrop-blur-xl bg-white/50 border border-white/40 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/40 transition-colors"
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
                      <div className="border-t border-white/30 px-5 py-4">
                        <div className="flex gap-8 text-xs text-[var(--color-muted)] mb-4">
                          {client.phone && <span>Phone: {client.phone}</span>}
                          <span>Created: {new Date(client.created_at).toLocaleDateString()}</span>
                        </div>

                        {client.crm && (
                          <div className="mb-4 px-3 py-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <h3 className="text-[11px] tracking-[1.5px] uppercase text-blue-600 mb-2 font-medium flex items-center gap-1.5">
                              <Link2 size={10} /> CRM Record
                            </h3>
                            <div className="space-y-1.5">
                              <div className="flex gap-6 text-xs">
                                <span className="text-[var(--color-muted)]">Contact type:</span>
                                <span className="text-[var(--color-text)] font-medium">{client.crm.contact_type || '\u2014'}</span>
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

                        <h3 className="text-[11px] tracking-[1.5px] uppercase text-[var(--color-muted)] mb-2 font-medium">Project Access</h3>
                        <div className="space-y-2 mb-4">
                          {client.projects?.map(pa => (
                            <div key={pa.project_id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/30">
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
                                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg border border-dashed border-white/50 text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
                                  >
                                    <Plus size={10} /> {p.display_name || p.name}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 pt-3 border-t border-white/30">
                          {resetUserId === client.id ? (
                            <>
                              <input
                                type="text"
                                value={resetPw}
                                onChange={e => setResetPw(e.target.value)}
                                placeholder="New password (min 8)"
                                className="px-3 py-2 rounded-lg border border-white/40 bg-white/60 text-sm w-48 focus:outline-none focus:border-[var(--color-accent)]"
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
      )}
    </div>
  )
}

/* ── Team member row component ── */
function TeamRow({ iconComponent: IconComp, discipline, name, org, status, scope, typicalScope, registration, email, phone, showStatus = true, showRequired = false }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_engaged
  const StatusIcon = cfg.icon

  return (
    <div className="flex items-start gap-4 px-5 py-4 rounded-xl backdrop-blur-xl bg-white/50 border border-white/40 hover:bg-white/60 transition-colors">
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center shrink-0 mt-0.5 border border-white/50">
        <IconComp size={18} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] tracking-[1.5px] uppercase font-medium text-[var(--color-text)]">
            {discipline}
          </span>
          {showStatus && (
            <span
              className="flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              <StatusIcon size={9} />
              {cfg.label}
            </span>
          )}
          {showRequired && (
            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-[rgba(0,0,0,0.04)] text-[var(--color-muted)]">
              Required
            </span>
          )}
        </div>
        {name && (
          <span className="text-sm font-light text-[var(--color-text)] block">
            {name}
            {org && <span className="text-[var(--color-muted)]"> · {org}</span>}
          </span>
        )}
        {!name && org && (
          <span className="text-sm font-light text-[var(--color-muted)] block">{org}</span>
        )}
        {!name && !org && (
          <span className="text-sm font-light text-[var(--color-muted)] italic block">To be appointed</span>
        )}
        {scope && (
          <p className="text-[11px] text-[var(--color-muted)] font-light mt-1 leading-relaxed">{scope}</p>
        )}
        {!scope && typicalScope && (
          <p className="text-[11px] text-[var(--color-muted)] font-light mt-1 leading-relaxed italic">{typicalScope}</p>
        )}
        {registration && (
          <span className="text-[10px] text-[var(--color-muted)] font-mono mt-1 block">{registration}</span>
        )}
      </div>

      {/* Contact */}
      <div className="shrink-0 flex items-center gap-2">
        {email && (
          <a href={`mailto:${email}`} className="w-7 h-7 rounded-lg border border-white/40 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors" title={email}>
            <Mail size={12} />
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="w-7 h-7 rounded-lg border border-white/40 flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors" title={phone}>
            <Phone size={12} />
          </a>
        )}
      </div>
    </div>
  )
}

/* ── QA Gate row ── */
function GateRow({ gate }) {
  const cfg = GATE_STATUS[gate.status] || GATE_STATUS.not_started
  const StatusIcon = cfg.icon

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 rounded-xl backdrop-blur-xl bg-white/50 border border-white/40">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: cfg.bg }}>
        <StatusIcon size={16} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-medium text-[var(--color-text)] block">{gate.name}</span>
        <span className="text-[11px] text-[var(--color-muted)] font-light">{gate.description}</span>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-[9px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </span>
        {gate.action && (
          <span className="text-[9px] text-[var(--color-accent)] flex items-center gap-0.5">
            {gate.action} <ArrowRight size={9} />
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Build QA gates from project data ── */
function buildQAGates(consultants, riskFlags, project) {
  const gates = []

  // 1. Drawing set QA
  gates.push({
    name: 'Drawing Set Coordination',
    description: 'Title blocks, drawing numbers, cross-references, keynotes verified',
    status: 'not_started',
    action: 'Run review',
  })

  // 2. Consultant reports
  const totalConsultants = consultants.length
  const receivedCount = consultants.filter(c => c.brief_status === 'received').length
  const engagedCount = consultants.filter(c => c.brief_status === 'engaged' || c.brief_status === 'received').length
  gates.push({
    name: 'Consultant Deliverables',
    description: `${receivedCount}/${totalConsultants} reports received, ${engagedCount}/${totalConsultants} engaged`,
    status: totalConsultants === 0 ? 'not_started' :
            receivedCount === totalConsultants ? 'passed' :
            engagedCount > 0 ? 'in_progress' : 'not_started',
  })

  // 3. Selection completeness
  gates.push({
    name: 'Selection Completeness',
    description: 'All materials, finishes and fittings confirmed or provisional-summed',
    status: 'passed',
  })

  // 4. Specification
  gates.push({
    name: 'Specification Sections',
    description: 'NATSPEC worksections edited, prompts completed, guidance stripped',
    status: 'in_progress',
    action: 'Continue',
  })

  // 5. Risk flags
  const highRisks = riskFlags.filter(r => r.severity === 'HIGH').length
  const medRisks = riskFlags.filter(r => r.severity === 'MED').length
  gates.push({
    name: 'Risk Flags',
    description: `${riskFlags.length} open flags (${highRisks} high, ${medRisks} medium)`,
    status: highRisks > 0 ? 'blocked' : medRisks > 0 ? 'warning' : riskFlags.length === 0 ? 'passed' : 'in_progress',
  })

  // 6. NCC compliance
  gates.push({
    name: 'NCC Compliance Check',
    description: 'Building code review for Class 1a — ventilation, light, energy, fire',
    status: 'in_progress',
  })

  // 7. Budget alignment
  gates.push({
    name: 'Budget Alignment',
    description: 'BoQ estimate vs client budget, provisional sums reconciled',
    status: 'warning',
    action: 'Review BoQ',
  })

  return gates
}
