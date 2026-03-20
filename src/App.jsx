import { useState, useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ProjectProvider, useProject } from './hooks/useProject'
import { PracticeProvider } from './hooks/usePractice'
import Shell from './components/Shell'
import LoginPage from './components/LoginPage'
import ResetPassword from './pages/ResetPassword'
import Overview from './pages/Overview'
import Decisions from './pages/Decisions'
import Documents from './pages/Documents'
import Timeline from './pages/Timeline'
import Messages from './pages/Messages'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import ProjectData from './pages/ProjectData'

const MIN_LOADING_MS = 4000

function ProtectedApp() {
  const { user, loading: authLoading } = useAuth()
  const { project, loading: projLoading } = useProject()
  const [minTimePassed, setMinTimePassed] = useState(false)
  const [satelliteReady, setSatelliteReady] = useState(false)
  const timerStarted = useRef(false)

  // Start the 3-second minimum timer on first mount
  useEffect(() => {
    if (!timerStarted.current) {
      timerStarted.current = true
      setTimeout(() => setMinTimePassed(true), MIN_LOADING_MS)
    }
  }, [])

  // Preload satellite image as soon as project data is available
  useEffect(() => {
    const url = project?.satellite_image_url
    if (!url) {
      // No satellite image — don't block on it
      if (project) setSatelliteReady(true)
      return
    }
    const img = new Image()
    img.onload = () => setSatelliteReady(true)
    img.onerror = () => setSatelliteReady(true) // Don't block on failure
    img.src = url
  }, [project])

  const dataReady = !authLoading && user && !projLoading
  const showApp = dataReady && minTimePassed && satelliteReady

  if (!user && !authLoading) return <LoginPage />
  if (!showApp) return <LoadingScreen />

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center max-w-sm">
          <p className="text-[11px] font-medium tracking-[4px] uppercase text-[var(--color-text)] mb-6">
            Pettet Architects
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            No projects have been assigned to your account yet.
            Please contact the studio if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  const pid = project.project_id
  const pname = project.display_name || project.name || 'Your Project'

  return (
    <Routes>
      <Route element={<Shell projectName={pname} />}>
        <Route index element={<Overview projectId={pid} />} />
        <Route path="selections" element={<Decisions projectId={pid} />} />
        <Route path="documents" element={<Documents projectId={pid} />} />
        <Route path="timeline" element={<Timeline projectId={pid} />} />
        <Route path="messages" element={<Messages projectId={pid} />} />
        <Route path="profile" element={<Profile />} />
        <Route path="data" element={<ProjectData projectId={pid} />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <PracticeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/*" element={
            <ProjectProvider>
              <ProtectedApp />
            </ProjectProvider>
          } />
        </Routes>
      </AuthProvider>
    </PracticeProvider>
  )
}

const LOADING_QUOTES = [
  { text: 'God is in the details.', author: 'Mies van der Rohe' },
  { text: 'Less is more.', author: 'Mies van der Rohe' },
  { text: 'Make it simple, but significant.', author: 'Don Draper' },
  { text: 'Every great design begins with an even better story.', author: 'Lorinda Mamo' },
  { text: 'Design is not just what it looks like. Design is how it works.', author: 'Steve Jobs' },
  { text: 'The details are not the details. They make the design.', author: 'Charles Eames' },
  { text: 'Architecture should speak of its time and place, but yearn for timelessness.', author: 'Frank Gehry' },
  { text: 'A room is not a room without natural light.', author: 'Louis Kahn' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Have nothing in your house that you do not know to be useful, or believe to be beautiful.', author: 'William Morris' },
  { text: 'The best rooms have something to say about the people who live in them.', author: 'David Hicks' },
  { text: 'Good buildings come from good people, and all problems are solved by good design.', author: 'Stephen Gardiner' },
  { text: 'You can use an eraser on the drafting table or a sledgehammer on the construction site.', author: 'Frank Lloyd Wright' },
  { text: 'Light creates ambience and feel of a place, as well as the expression of a structure.', author: 'Le Corbusier' },
  { text: 'Form follows function — that has been misunderstood. Form and function should be one.', author: 'Frank Lloyd Wright' },
  { text: 'To create, one must first question everything.', author: 'Eileen Gray' },
  { text: 'We shape our buildings; thereafter they shape us.', author: 'Winston Churchill' },
  { text: 'A great building must begin with the immeasurable, must go through measurable means when it is being designed, and in the end must be unmeasurable.', author: 'Louis Kahn' },
]

function LoadingScreen() {
  const [quote] = useState(() => LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)])

  // Generate raindrops with random positions and delays
  const drops = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 0.4 + Math.random() * 0.3,
    height: 8 + Math.random() * 14,
    opacity: 0.15 + Math.random() * 0.25,
  }))

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F3]" style={{ overflow: 'hidden' }}>
      <div className="text-center max-w-md px-6" style={{ position: 'relative', zIndex: 2 }}>

        {/* Logo scene container */}
        <div style={{ position: 'relative', width: 120, height: 100, margin: '0 auto 32px' }}>

          {/* Rain drops — visible 0s to 2.5s */}
          {drops.map(d => (
            <div
              key={d.id}
              style={{
                position: 'absolute',
                left: `${d.left}%`,
                top: -20,
                width: 1.5,
                height: d.height,
                borderRadius: 1,
                background: `rgba(120,140,160,${d.opacity})`,
                animation: `rainFall ${d.duration}s linear ${d.delay}s infinite`,
                opacity: 0,
              }}
            />
          ))}

          {/* Splash particles at logo base — during rain */}
          {[...Array(6)].map((_, i) => (
            <div
              key={`splash-${i}`}
              style={{
                position: 'absolute',
                bottom: 8,
                left: 30 + i * 12,
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: 'rgba(120,140,160,0.2)',
                animation: `splash 0.6s ease-out ${0.3 + i * 0.25}s infinite`,
                opacity: 0,
              }}
            />
          ))}

          {/* Sun glow — fades in from 2s, full by 3s */}
          <div style={{
            position: 'absolute',
            top: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,220,120,0.35) 0%, rgba(255,200,80,0.12) 40%, transparent 70%)',
            animation: 'sunGlow 4s ease-in-out forwards',
            opacity: 0,
          }} />

          {/* Sun rays — appear after rain */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`ray-${i}`}
              style={{
                position: 'absolute',
                top: 10,
                left: '50%',
                width: 1,
                height: 20,
                background: 'rgba(255,210,100,0.25)',
                transformOrigin: '50% 40px',
                transform: `translateX(-50%) rotate(${i * 45}deg)`,
                animation: `rayAppear 4s ease-in-out forwards`,
                opacity: 0,
                borderRadius: 1,
              }}
            />
          ))}

          {/* Logo — slight shelter shake during rain, then settles */}
          <div style={{
            position: 'relative',
            zIndex: 3,
            animation: 'logoWeather 4s ease-in-out forwards',
          }}>
            <img
              src="https://mmfhjlpsumhyxjqhyirw.supabase.co/storage/v1/object/public/image-library/practice/pa-logo.png"
              alt="Pettet Architects"
              width={48}
              height={48}
              style={{ margin: '20px auto 0', display: 'block' }}
            />
          </div>

          {/* Puddle reflection under logo — appears during rain */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 60,
            height: 6,
            borderRadius: '50%',
            background: 'rgba(120,150,180,0.08)',
            animation: 'puddleGrow 4s ease-in-out forwards',
            opacity: 0,
          }} />
        </div>

        {/* Quote */}
        <p className="text-sm text-[var(--color-text)] font-light leading-relaxed italic mb-3"
          style={{ animation: 'fadeIn 0.8s ease-out' }}>
          "{quote.text}"
        </p>
        <p className="text-[11px] text-[var(--color-muted)] tracking-[2px] uppercase font-medium"
          style={{ animation: 'fadeIn 1.2s ease-out' }}>
          — {quote.author}
        </p>
      </div>

      {/* Background colour shift: cool grey during rain → warm during sun */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        animation: 'bgWarm 4s ease-in-out forwards',
        background: 'transparent',
      }} />

      <style>{`
        @keyframes rainFall {
          0% { transform: translateY(0); opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(120px); opacity: 0; }
        }
        @keyframes splash {
          0% { transform: scale(0) translateY(0); opacity: 0.4; }
          50% { transform: scale(1.5) translateY(-6px); opacity: 0.2; }
          100% { transform: scale(0) translateY(-10px); opacity: 0; }
        }
        @keyframes sunGlow {
          0%, 40% { opacity: 0; transform: translateX(-50%) scale(0.5); }
          70% { opacity: 1; transform: translateX(-50%) scale(1); }
          100% { opacity: 0.8; transform: translateX(-50%) scale(1.1); }
        }
        @keyframes rayAppear {
          0%, 50% { opacity: 0; }
          75% { opacity: 0.3; }
          100% { opacity: 0.2; }
        }
        @keyframes logoWeather {
          0%, 5% { transform: translateY(0) rotate(0deg); }
          8% { transform: translateY(1px) rotate(-0.5deg); }
          12% { transform: translateY(-1px) rotate(0.5deg); }
          16% { transform: translateY(1px) rotate(-0.3deg); }
          20% { transform: translateY(0) rotate(0.3deg); }
          24% { transform: translateY(1px) rotate(-0.5deg); }
          28% { transform: translateY(-1px) rotate(0.4deg); }
          32% { transform: translateY(0) rotate(-0.2deg); }
          36% { transform: translateY(1px) rotate(0.3deg); }
          40% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(0) rotate(0deg); }
          65% { transform: translateY(-4px) rotate(0deg); }
          100% { transform: translateY(-4px) rotate(0deg); }
        }
        @keyframes puddleGrow {
          0%, 10% { opacity: 0; transform: translateX(-50%) scaleX(0.3); }
          30% { opacity: 0.6; transform: translateX(-50%) scaleX(1); }
          50% { opacity: 0.5; transform: translateX(-50%) scaleX(1.1); }
          75% { opacity: 0.15; transform: translateX(-50%) scaleX(1.3); }
          100% { opacity: 0; transform: translateX(-50%) scaleX(1.5); }
        }
        @keyframes bgWarm {
          0%, 40% { background: rgba(200,210,220,0.06); }
          100% { background: rgba(255,245,220,0.08); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
