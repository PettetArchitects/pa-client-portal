import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ProjectProvider, useProject } from './hooks/useProject'
import { PracticeProvider } from './hooks/usePractice'
import Shell from './components/Shell'
import LoginPage from './components/LoginPage'
import ResetPassword from './pages/ResetPassword'
import Overview from './pages/Overview'
import LogoAnimation from './components/LogoAnimation'
import { ToastProvider } from './components/Toast'

// Lazy-loaded pages: split into separate chunks for faster initial load
const Decisions = lazy(() => import('./pages/decisions'))
const Documents = lazy(() => import('./pages/Documents'))
const Timeline = lazy(() => import('./pages/Timeline'))
const Messages = lazy(() => import('./pages/Messages'))
const Profile = lazy(() => import('./pages/Profile'))
const Admin = lazy(() => import('./pages/Admin'))
const ProjectData = lazy(() => import('./pages/ProjectData'))
const DecisionMap = lazy(() => import('./pages/DecisionMap'))
const ImageManager = lazy(() => import('./pages/ImageManager'))

const MIN_LOADING_MS = 3000

function ProtectedApp() {
  const { user, loading: authLoading } = useAuth()
  const { project, loading: projLoading } = useProject()
  const [minTimePassed, setMinTimePassed] = useState(false)
  const timerStarted = useRef(false)

  // If no image needs preloading, start as ready
  const hasImageToLoad = project
    ? !!(project.satellite_image_url || (project.latitude && project.longitude))
    : false
  const [satelliteReady, setSatelliteReady] = useState(!hasImageToLoad)

  // Start the 3-second minimum timer on first mount
  useEffect(() => {
    if (!timerStarted.current) {
      timerStarted.current = true
      setTimeout(() => setMinTimePassed(true), MIN_LOADING_MS)
    }
  }, [])

  // Preload satellite image â stored URL first (instant), ESRI fallback only if needed
  useEffect(() => {
    if (!project) return
    const storedUrl = project.satellite_image_url
    const hasCoords = project.latitude && project.longitude

    if (!storedUrl && !hasCoords) return

    const primaryUrl = storedUrl || null
    const lat = parseFloat(project.latitude)
    const lng = parseFloat(project.longitude)
    const dLng = 0.004
    const dLat = dLng * (1080 / 1920) * 1.2
    const esriUrl = hasCoords
      ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${[lng - dLng, lat - dLat, lng + dLng, lat + dLat].join(',')}&bboxSR=4326&size=1920,1080&imageSR=4326&format=jpg&f=image`
      : null

    const url = primaryUrl || esriUrl
    if (!url) return

    const img = new Image()
    img.onload = () => setSatelliteReady(true)
    img.onerror = () => {
      // Primary failed â try fallback
      if (primaryUrl && esriUrl) {
        const fb = new Image()
        fb.onload = () => setSatelliteReady(true)
        fb.onerror = () => setSatelliteReady(true)
        fb.src = esriUrl
      } else {
        setSatelliteReady(true)
      }
    }
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
          <p className="text-[13px] text-[var(--color-muted)]">
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
    <Suspense fallback={<div className="max-w-4xl animate-pulse p-6"><div className="h-8 w-64 bg-white/40 rounded mb-4" /><div className="h-3 w-48 bg-white/40 rounded mb-8" /></div>}>
      <Routes>
        <Route element={<Shell projectName={pname} />}>
          <Route index element={<Overview projectId={pid} />} />
          <Route path="selections" element={<Decisions projectId={pid} />} />
          <Route path="documents" element={<Documents projectId={pid} />} />
          <Route path="timeline" element={<Timeline projectId={pid} />} />
          <Route path="messages" element={<Messages projectId={pid} />} />
          <Route path="profile" element={<Profile />} />
          <Route path="data" element={<ProjectData projectId={pid} />} />
          <Route path="decisions" element={<DecisionMap />} />
          <Route path="admin" element={<Admin />} />
          <Route path="images" element={<ImageManager />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ToastProvider>
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
    </ToastProvider>
  )
}

const LOADING_QUOTES = [
  { text: 'God is in the details.', author: 'Mies van der Rohe', year: '1959' },
  { text: 'Less is more.', author: 'Mies van der Rohe', year: '1947' },
  { text: 'The details are not the details. They make the design.', author: 'Charles Eames', year: '1970' },
  { text: 'Architecture should speak of its time and place, but yearn for timelessness.', author: 'Frank Gehry', year: '1999' },
  { text: 'A room is not a room without natural light.', author: 'Louis Kahn', year: '1971' },
  { text: 'Have nothing in your house that you do not know to be useful, or believe to be beautiful.', author: 'William Morris', year: '1880' },
  { text: 'You can use an eraser on the drafting table or a sledgehammer on the construction site.', author: 'Frank Lloyd Wright', year: '1938' },
  { text: 'Light creates ambience and feel of a place, as well as the expression of a structure.', author: 'Le Corbusier', year: '1954' },
  { text: 'Form follows function â that has been misunderstood. Form and function should be one.', author: 'Frank Lloyd Wright', year: '1939' },
  { text: 'To create, one must first question everything.', author: 'Eileen Gray', year: '1929' },
  { text: 'We shape our buildings; thereafter they shape us.', author: 'Winston Churchill', year: '1943' },
  { text: 'Architecture is the thoughtful making of space.', author: 'Louis Kahn', year: '1967' },
  { text: 'The sun does not realise how wonderful it is until after a room is made.', author: 'Louis Kahn', year: '1973' },
  { text: 'Space and light and order. Those are the things that men need just as much as they need bread or a place to sleep.', author: 'Le Corbusier', year: '1948' },
  { text: 'Build for the climate, for the place, for the people.', author: 'Glenn Murcutt', year: '2002' },
  { text: 'Touch the earth lightly.', author: 'Glenn Murcutt', year: '1986' },
  { text: 'I always try to make a building that has something the camera cannot capture.', author: 'Glenn Murcutt', year: '2009' },
  { text: 'In my designs I try to capture the spirit of place.', author: 'Glenn Murcutt', year: '2002' },
  { text: 'Any work of architecture that does not express serenity is a mistake.', author: 'Luis Barrag\u00e1n', year: '1980' },
  { text: 'When you look at a building, you see it for free.', author: 'Steven Holl', year: '2000' },
  { text: 'Architecture is bound to situation.', author: 'Steven Holl', year: '1989' },
  { text: 'Within the depth of water, there is a luminosity.', author: 'Steven Holl', year: '2007' },
  { text: 'Light is the protagonist of our existence.', author: 'Steven Holl', year: '2012' },
  { text: 'I believe the essence of architecture is natural light, materials, and space.', author: 'Alvaro Siza', year: '1992' },
  { text: 'Architecture has a slowness that I have always loved.', author: 'Alvaro Siza', year: '1998' },
  { text: 'Nothing is more fragile than the built environment.', author: 'Alvaro Siza', year: '2005' },
  { text: 'At the point where you give up control, the design becomes interesting.', author: 'Alvaro Siza', year: '1995' },
  { text: 'In all my works, light is an important controlling factor.', author: 'Tadao Ando', year: '1995' },
  { text: 'You cannot simply put something new into a place. You have to absorb what you see around you.', author: 'Tadao Ando', year: '1991' },
  { text: 'To make architecture is to make a frame for the refined perception of reality.', author: 'Tadao Ando', year: '2002' },
  { text: 'I create enclosed spaces mainly by means of thick concrete walls.', author: 'Tadao Ando', year: '1988' },
  { text: 'Architecture is the art of reconciliation between ourselves and the world.', author: 'Juhani Pallasmaa', year: '2005' },
  { text: 'Every touching experience of architecture is multi-sensory.', author: 'Juhani Pallasmaa', year: '2005' },
  { text: 'Quality architecture has to sensitively accommodate the rituals of everyday life.', author: 'Peter Zumthor', year: '2006' },
  { text: 'Material is endless. Take wood. It is alive even after you cut it.', author: 'Peter Zumthor', year: '1999' },
  { text: 'Every material has its own shadow.', author: 'Peter Zumthor', year: '2006' },
  { text: 'The dialogue between client and architect is about as intimate as any conversation you can have.', author: 'Robert A.M. Stern', year: '1986' },
  { text: 'A great building must begin with the immeasurable, must go through measurable means, and in the end must be unmeasurable.', author: 'Louis Kahn', year: '1961' },
  { text: 'The home should be the treasure chest of living.', author: 'Le Corbusier', year: '1948' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci', year: '1500' },
  { text: 'The mother art is architecture.', author: 'Frank Lloyd Wright', year: '1932' },
]

function LoadingScreen() {
  const [quote] = useState(() => LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)])
  const [textVisible, setTextVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTextVisible(true), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E2E0D8]" style={{ overflow: 'hidden' }} role="status" aria-label="Loading application">
      <div className="text-center max-w-lg px-6" style={{ position: 'relative', zIndex: 2 }}>

        <div style={{ marginBottom: 40 }}>
          <LogoAnimation size={200} />
        </div>

        <p className="text-[11px] tracking-[5px] uppercase text-[var(--color-muted)] font-medium mb-8"
          style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease-out, transform 0.8s ease-out' }}>
          Pettet Architects
        </p>
        <p className="text-[15px] text-[var(--color-text)] font-light leading-relaxed italic mb-3"
          style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s' }}>
          "{quote.text}"
        </p>
        <p className="text-[11px] text-[var(--color-muted)] tracking-[2px] uppercase font-medium"
          style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease-out 0.7s, transform 0.8s ease-out 0.7s' }}>
          â {quote.author}{quote.year ? `, ${quote.year}` : ''}
        </p>
      </div>
    </div>
  )
}
