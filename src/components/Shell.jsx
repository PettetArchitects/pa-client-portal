import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Z } from '../layers'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../hooks/useProject'
import { usePractice } from '../hooks/usePractice'
import ProjectHero from './ProjectHero'
import {
  LayoutGrid, CheckSquare, FileText,
  Clock, MessageCircle, LogOut, ChevronDown, Settings, Users, Database
} from 'lucide-react'

const baseNavItems = [
  { to: '/', icon: LayoutGrid, label: 'Overview' },
  { to: '/selections', icon: CheckSquare, label: 'Selections' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/profile', icon: Settings, label: 'Profile' },
]

const architectNavItems = [
  { to: '/data', icon: Database, label: 'Project Data' },
  { to: '/admin', icon: Users, label: 'Clients' },
]

export default function Shell({ projectName }) {
  const { user, signOut } = useAuth()
  const { projects, project, switchProject, isArchitect } = useProject()
  const { practice } = usePractice()
  const [showSwitcher, setShowSwitcher] = useState(false)
  const switcherBtnRef = useRef(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (showSwitcher && switcherBtnRef.current) {
      const rect = switcherBtnRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [showSwitcher])

  const navItems = isArchitect ? [...baseNavItems, ...architectNavItems] : baseNavItems
  const practiceName = practice?.practice_name || 'Pettet Architects'
  const logoUrl = practice?.logo_url
  const accreditations = practice?.accreditations || {}

  return (
    <div className="min-h-screen flex flex-col">
      {/* Full-bleed satellite background */}
      <ProjectHero project={project} />

      {/* Top bar — glass */}
      <header className="h-14 border-b border-white/20 backdrop-blur-xl bg-white/20 flex items-center px-6 shrink-0" style={{ position: 'relative', zIndex: Z.CHROME }}>
        <div className="flex items-center gap-3 flex-1">
          {/* Logo + practice name */}
          {logoUrl && (
            <img src={logoUrl} alt={practiceName} className="h-7 w-7 object-contain" />
          )}
          <span className="text-[11px] font-medium tracking-[3px] uppercase text-[var(--color-text)]">
            {practiceName}
          </span>

          {/* Project name / switcher */}
          <span className="text-[var(--color-border)]">·</span>

          {isArchitect && projects.length > 1 ? (
            <>
              <button
                ref={switcherBtnRef}
                onClick={() => setShowSwitcher(s => !s)}
                className="flex items-center gap-1.5 text-[11px] font-light tracking-[2px] uppercase text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                {projectName}
                <ChevronDown size={12} />
              </button>

              {showSwitcher && createPortal(
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: Z.OVERLAY }}
                    onClick={() => setShowSwitcher(false)}
                  />
                  <div
                    style={{
                      position: 'fixed',
                      zIndex: Z.DROPDOWN,
                      top: dropdownPos.top,
                      left: dropdownPos.left,
                      minWidth: 260,
                      background: 'rgba(255,255,255,0.97)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '1px solid rgba(255,255,255,0.6)',
                      borderRadius: 12,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      padding: '6px 0',
                    }}
                  >
                    {projects.map(p => (
                      <button
                        key={p.project_id}
                        onClick={() => { switchProject(p.project_id); setShowSwitcher(false) }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 16px',
                          background: p.project_id === project?.project_id ? 'rgba(255,255,255,0.6)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.7)'}
                        onMouseLeave={e => e.currentTarget.style.background = p.project_id === project?.project_id ? 'rgba(255,255,255,0.6)' : 'transparent'}
                      >
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 400, color: 'var(--color-text)' }}>
                          {p.display_name || p.name}
                        </span>
                        {p.client_display && (
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--color-muted)', marginTop: 2 }}>
                            {p.client_display}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>,
                document.body
              )}
            </>
          ) : (
            <span className="text-[11px] font-light tracking-[2px] uppercase text-[var(--color-muted)]">
              {projectName}
            </span>
          )}

          {isArchitect && (
            <span className="text-[9px] tracking-[1.5px] bg-[var(--color-text)] text-white px-2 py-0.5 rounded-full font-medium">
              Architect
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--color-muted)] hidden sm:inline">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-1" style={{ position: 'relative', zIndex: Z.CHROME }}>
        {/* Sidebar — glass */}
        <nav className="w-52 border-r border-white/20 backdrop-blur-xl bg-white/20 py-6 px-3 shrink-0 hidden md:flex md:flex-col md:justify-between">
          <div className="space-y-0.5">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-light transition-all ${
                    isActive
                      ? 'bg-[var(--color-accent)] text-white font-normal shadow-sm'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/50'
                  }`
                }
              >
                <Icon size={16} strokeWidth={1.5} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Practice details at bottom of sidebar */}
          <div className="pt-4 mt-4 border-t border-[var(--color-border)]">
            <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
              {practiceName}
              {accreditations.nominated_architect && (
                <><br />{accreditations.nominated_architect}</>
              )}
              {accreditations.arb_registration && (
                <><br />{accreditations.arb_registration}</>
              )}
              {accreditations.abn && (
                <><br />ABN {accreditations.abn}</>
              )}
            </p>
            <p className="text-[9px] text-[var(--color-border)] mt-3 font-light tracking-[0.5px]">Client Portal v0.3.0</p>
          </div>
        </nav>

        {/* Mobile nav — glass */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-white/20 border-t border-white/20 z-50 flex justify-around py-2 px-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 py-1 text-[10px] ${
                  isActive ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-muted)]'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Main content — transparent so satellite shows through */}
        <main className="flex-1 p-6 md:pl-14 md:pr-10 md:pt-10 md:pb-10 pb-24 overflow-y-auto bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
