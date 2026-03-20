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
import LogoAnimation from './components/LogoAnimation'

const MIN_LOADING_MS = 7500

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
  { text: 'Architecture is the thoughtful making of space.', author: 'Louis Kahn' },
  { text: 'The mother art is architecture. Without an architecture of our own we have no soul of our own civilization.', author: 'Frank Lloyd Wright' },
  { text: 'In pure architecture the smallest detail should have a meaning or serve a purpose.', author: 'Augustus W. N. Pugin' },
  { text: 'Space and light and order. Those are the things that men need just as much as they need bread or a place to sleep.', author: 'Le Corbusier' },
  { text: 'I think one can achieve a very pleasant environment without necessarily going the whole way to a tropical garden.', author: 'Harry Seidler' },
  { text: 'The dialogue between client and architect is about as intimate as any conversation you can have, because when you are talking about building a house, you are talking about dreams.', author: 'Robert A.M. Stern' },
  { text: 'I believe that architecture, as anything else in life, is evolutionary. Ideas evolve; they don\'t come from outer space and land in the drawing board.', author: 'Zaha Hadid' },
  { text: 'When I am working on a problem, I never think about beauty but when I have finished, if the solution is not beautiful, I know it is wrong.', author: 'R. Buckminster Fuller' },
  { text: 'The sun does not realise how wonderful it is until after a room is made.', author: 'Louis Kahn' },
  { text: 'Build for the climate, for the place, for the people.', author: 'Glenn Murcutt' },
  { text: 'Touch the earth lightly.', author: 'Glenn Murcutt' },
  { text: 'Architecture is basically the design of interiors, the art of organising interior space.', author: 'Philip Johnson' },
  { text: 'Any work of architecture that does not express serenity is a mistake.', author: 'Luis Barragán' },
  { text: 'A house is a machine for living in.', author: 'Le Corbusier' },
  { text: 'The home should be the treasure chest of living.', author: 'Le Corbusier' },
]

function LoadingScreen() {
  const [quote] = useState(() => LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)])
  const [textVisible, setTextVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTextVisible(true), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E8E8E5]" style={{ overflow: 'hidden' }}>
      <div className="text-center max-w-lg px-6" style={{ position: 'relative', zIndex: 2 }}>

        <div style={{ marginBottom: 40 }}>
          <LogoAnimation size={200} />
        </div>

        <p className="text-[11px] tracking-[5px] uppercase text-[var(--color-muted)] font-medium mb-8"
          style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease-out, transform 0.8s ease-out' }}>
          Pettet Architects
        </p>
        <p className="text-base text-[var(--color-text)] font-light leading-relaxed italic mb-3"
          style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s' }}>
          "{quote.text}"
        </p>
        <p className="text-[11px] text-[var(--color-muted)] tracking-[2px] uppercase font-medium"
          style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease-out 0.7s, transform 0.8s ease-out 0.7s' }}>
          — {quote.author}
        </p>
      </div>
    </div>
  )
}
