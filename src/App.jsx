import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useProject } from './hooks/useProject'
import Shell from './components/Shell'
import LoginPage from './components/LoginPage'
import Overview from './pages/Overview'
import Selections from './pages/Selections'
import Documents from './pages/Documents'
import Timeline from './pages/Timeline'
import Messages from './pages/Messages'

function ProtectedApp() {
  const { user, loading: authLoading } = useAuth()
  const { project, loading: projLoading } = useProject()

  if (authLoading) return <LoadingScreen />
  if (!user) return <LoginPage />
  if (projLoading) return <LoadingScreen />

  const pid = project?.project_id || 'P003'
  const pname = project?.title || 'Your Project'

  return (
    <Routes>
      <Route element={<Shell projectName={pname} />}>
        <Route index element={<Overview projectId={pid} />} />
        <Route path="selections" element={<Selections projectId={pid} />} />
        <Route path="documents" element={<Documents projectId={pid} />} />
        <Route path="timeline" element={<Timeline projectId={pid} />} />
        <Route path="messages" element={<Messages projectId={pid} />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="text-center">
        <p className="text-[11px] font-medium tracking-[4px] uppercase text-[var(--color-text)] mb-4">
          Pettet Architects
        </p>
        <div className="w-6 h-6 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
}
