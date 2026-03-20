import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutGrid, CheckSquare, FileText,
  Clock, MessageCircle, LogOut, User
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutGrid, label: 'Overview' },
  { to: '/selections', icon: CheckSquare, label: 'Selections' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/timeline', icon: Clock, label: 'Timeline' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
]

export default function Shell({ projectName }) {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-[var(--color-border)] bg-white flex items-center px-6 shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-[11px] font-medium tracking-[3px] uppercase text-[var(--color-text)]">
            Pettet Architects
          </span>
          {projectName && (
            <>
              <span className="text-[var(--color-border)]">·</span>
              <span className="text-[11px] font-light tracking-[2px] uppercase text-[var(--color-muted)]">
                {projectName}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--color-muted)]">{user?.email}</span>
          <button
            onClick={signOut}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="w-52 border-r border-[var(--color-border)] bg-white py-6 px-3 shrink-0 hidden md:block">
          <div className="space-y-0.5">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-light transition-all ${
                    isActive
                      ? 'bg-[var(--color-accent)] text-white font-normal'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[#F0F0EE]'
                  }`
                }
              >
                <Icon size={16} strokeWidth={1.5} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Mobile nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] z-50 flex justify-around py-2 px-4">
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

        {/* Main content */}
        <main className="flex-1 p-6 md:p-10 pb-24 md:pb-10 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
