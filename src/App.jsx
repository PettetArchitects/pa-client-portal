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

// ── Physics constants ────────────────────────────────────────
const GRAVITY = 980          // px/s²
const GROUND_Y = 155         // ground line inside 200×200 scene
const RAIN_SPAWN_Y = -30
const DRAG = 0.0004          // air drag coefficient
const BOUNCE_RESTITUTION = 0.25
const SPLASH_SPEED_MIN = 40
const SPLASH_SPEED_MAX = 120
const SPLASH_GRAVITY = 420
const LOGO_SPRING = 18       // spring stiffness
const LOGO_DAMPING = 3.2     // damping ratio
const WIND_MAX = 30          // max horizontal wind px/s
const SCENE_W = 200
const SCENE_H = 200

function createDrop(time) {
  return {
    x: Math.random() * SCENE_W,
    y: RAIN_SPAWN_Y,
    vy: 120 + Math.random() * 200,       // initial downward velocity
    vx: (Math.random() - 0.5) * WIND_MAX,
    length: 10 + Math.random() * 18,
    opacity: 0.15 + Math.random() * 0.3,
    alive: true,
    spawnTime: time,
  }
}

function createSplash(x, impactVy) {
  const count = 2 + Math.floor(Math.random() * 3)
  const particles = []
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI * (0.15 + Math.random() * 0.7)
    const speed = SPLASH_SPEED_MIN + Math.random() * (SPLASH_SPEED_MAX - SPLASH_SPEED_MIN)
    particles.push({
      x,
      y: GROUND_Y,
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: Math.sin(angle) * speed,
      radius: 1 + Math.random() * 1.5,
      opacity: 0.3 + Math.random() * 0.2,
      alive: true,
    })
  }
  return particles
}

function LoadingScreen() {
  const [quote] = useState(() => LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)])
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const [textVisible, setTextVisible] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = SCENE_W * dpr
    canvas.height = SCENE_H * dpr
    ctx.scale(dpr, dpr)

    // Logo image
    const logoImg = new Image()
    logoImg.crossOrigin = 'anonymous'
    logoImg.src = 'https://mmfhjlpsumhyxjqhyirw.supabase.co/storage/v1/object/public/image-library/practice/pa-logo.png'

    // State
    const state = {
      drops: [],
      splashes: [],
      puddle: { opacity: 0, scaleX: 0.2 },
      logo: { y: 0, vy: 0, rotation: 0, vr: 0, scale: 1 },
      sun: { opacity: 0, scale: 0.3 },
      rays: { opacity: 0 },
      bg: { warmth: 0 },
      phase: 'rain',         // 'rain' → 'clearing' → 'sun'
      elapsed: 0,
      nextDrop: 0,
      wind: 0,
      windTarget: 0,
      windTimer: 0,
    }
    stateRef.current = state

    let lastTime = null
    let rafId

    function tick(now) {
      if (!lastTime) lastTime = now
      const dt = Math.min((now - lastTime) / 1000, 0.05) // cap at 50ms
      lastTime = now
      state.elapsed += dt

      // ── Phase transitions ──
      if (state.elapsed > 2.0 && state.phase === 'rain') state.phase = 'clearing'
      if (state.elapsed > 2.8 && state.phase === 'clearing') state.phase = 'sun'

      // Show text after 0.3s
      if (state.elapsed > 0.3 && !textVisible) setTextVisible(true)

      // ── Wind gusts ──
      state.windTimer -= dt
      if (state.windTimer <= 0) {
        state.windTarget = (Math.random() - 0.5) * WIND_MAX * 2
        state.windTimer = 0.5 + Math.random() * 1.5
      }
      state.wind += (state.windTarget - state.wind) * dt * 3

      // ── Spawn rain ──
      const rainRate = state.phase === 'rain' ? 0.025 : state.phase === 'clearing' ? 0.08 : 999
      if (state.elapsed >= state.nextDrop) {
        state.drops.push(createDrop(state.elapsed))
        state.nextDrop = state.elapsed + rainRate + Math.random() * rainRate * 0.5
      }

      // ── Update drops (Verlet-ish with drag) ──
      for (const d of state.drops) {
        if (!d.alive) continue
        d.vy += GRAVITY * dt
        d.vy *= (1 - DRAG * d.vy * dt)  // simple quadratic drag
        d.vx += (state.wind - d.vx) * dt * 2
        d.y += d.vy * dt
        d.x += d.vx * dt

        // Ground collision → splash
        if (d.y >= GROUND_Y) {
          d.alive = false
          state.splashes.push(...createSplash(d.x, d.vy))
          // Puddle grows
          state.puddle.opacity = Math.min(0.6, state.puddle.opacity + 0.015)
          state.puddle.scaleX = Math.min(1.6, state.puddle.scaleX + 0.012)
          // Logo gets hit — spring impulse
          if (Math.abs(d.x - SCENE_W / 2) < 40) {
            state.logo.vy += 1.5 + Math.random() * 2
            state.logo.vr += (Math.random() - 0.5) * 4
          }
        }
        // Off-screen
        if (d.x < -20 || d.x > SCENE_W + 20) d.alive = false
      }

      // ── Update splashes (ballistic) ──
      for (const s of state.splashes) {
        if (!s.alive) continue
        s.vy += SPLASH_GRAVITY * dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.opacity -= dt * 0.8
        if (s.opacity <= 0 || s.y > GROUND_Y + 10) s.alive = false
      }

      // Prune dead particles
      state.drops = state.drops.filter(d => d.alive)
      state.splashes = state.splashes.filter(s => s.alive)

      // ── Logo spring physics ──
      const logoTarget = state.phase === 'sun' ? -10 : 0
      const scaleTarget = state.phase === 'sun' ? 1.06 : 1
      const springForce = -LOGO_SPRING * (state.logo.y - logoTarget)
      const dampForce = -LOGO_DAMPING * state.logo.vy
      state.logo.vy += (springForce + dampForce) * dt
      state.logo.y += state.logo.vy * dt
      state.logo.scale += (scaleTarget - state.logo.scale) * dt * 3

      // Rotation spring (lighter)
      const rotSpring = -12 * state.logo.rotation - 2.5 * state.logo.vr
      state.logo.vr += rotSpring * dt
      state.logo.rotation += state.logo.vr * dt

      // ── Sun phase ──
      if (state.phase === 'sun') {
        state.sun.opacity += (0.85 - state.sun.opacity) * dt * 1.8
        state.sun.scale += (1.15 - state.sun.scale) * dt * 1.5
        state.rays.opacity += (0.22 - state.rays.opacity) * dt * 1.5
        state.bg.warmth += (1 - state.bg.warmth) * dt * 1.2
        // Puddle evaporates
        state.puddle.opacity *= (1 - dt * 0.6)
      } else if (state.phase === 'clearing') {
        state.sun.opacity += (0.3 - state.sun.opacity) * dt * 2
        state.sun.scale += (0.6 - state.sun.scale) * dt * 2
      }

      // ── Draw ──
      ctx.clearRect(0, 0, SCENE_W, SCENE_H)

      // Background warmth tint
      if (state.bg.warmth > 0.01) {
        ctx.fillStyle = `rgba(255,240,210,${state.bg.warmth * 0.1})`
        ctx.fillRect(0, 0, SCENE_W, SCENE_H)
      }

      // Sun glow
      if (state.sun.opacity > 0.01) {
        const grd = ctx.createRadialGradient(SCENE_W / 2, 20, 0, SCENE_W / 2, 20, 110 * state.sun.scale)
        grd.addColorStop(0, `rgba(255,215,110,${state.sun.opacity * 0.45})`)
        grd.addColorStop(0.35, `rgba(255,195,70,${state.sun.opacity * 0.18})`)
        grd.addColorStop(1, 'transparent')
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, SCENE_W, SCENE_H)
      }

      // Sun rays
      if (state.rays.opacity > 0.01) {
        ctx.save()
        ctx.translate(SCENE_W / 2, 60)
        for (let i = 0; i < 12; i++) {
          ctx.save()
          ctx.rotate((i * 30 * Math.PI) / 180)
          ctx.fillStyle = `rgba(255,205,90,${state.rays.opacity})`
          ctx.fillRect(-0.5, -30, 1, 30)
          ctx.restore()
        }
        ctx.restore()
      }

      // Rain drops
      ctx.lineCap = 'round'
      for (const d of state.drops) {
        ctx.strokeStyle = `rgba(100,130,155,${d.opacity})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        const angle = Math.atan2(d.vy, d.vx)
        const dx = Math.cos(angle) * d.length
        const dy = Math.sin(angle) * d.length
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - dx * 0.3, d.y - dy * 0.3)
        ctx.stroke()
      }

      // Splash particles
      for (const s of state.splashes) {
        ctx.fillStyle = `rgba(100,130,155,${Math.max(0, s.opacity)})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Puddle
      if (state.puddle.opacity > 0.005) {
        ctx.fillStyle = `rgba(110,140,170,${state.puddle.opacity * 0.15})`
        ctx.save()
        ctx.translate(SCENE_W / 2, GROUND_Y + 5)
        ctx.scale(state.puddle.scaleX, 1)
        ctx.beginPath()
        ctx.ellipse(0, 0, 45, 4, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Logo
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.save()
        const logoSize = 72 * state.logo.scale
        const logoX = (SCENE_W - logoSize) / 2
        const logoY = 45 + state.logo.y
        ctx.translate(logoX + logoSize / 2, logoY + logoSize / 2)
        ctx.rotate(state.logo.rotation * Math.PI / 180)
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.08)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetY = 2
        ctx.drawImage(logoImg, -logoSize / 2, -logoSize / 2, logoSize, logoSize)
        ctx.restore()
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E8E8E5]" style={{ overflow: 'hidden' }}>
      <div className="text-center max-w-lg px-6" style={{ position: 'relative', zIndex: 2 }}>

        {/* Physics canvas */}
        <div style={{ width: SCENE_W, height: SCENE_H, margin: '0 auto 40px' }}>
          <canvas
            ref={canvasRef}
            style={{ width: SCENE_W, height: SCENE_H, display: 'block' }}
          />
        </div>

        {/* Practice name */}
        <p
          className="text-[11px] tracking-[5px] uppercase text-[var(--color-muted)] font-medium mb-8"
          style={{
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
          }}
        >
          Pettet Architects
        </p>

        {/* Quote */}
        <p
          className="text-base text-[var(--color-text)] font-light leading-relaxed italic mb-3"
          style={{
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s',
          }}
        >
          "{quote.text}"
        </p>
        <p
          className="text-[11px] text-[var(--color-muted)] tracking-[2px] uppercase font-medium"
          style={{
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease-out 0.7s, transform 0.8s ease-out 0.7s',
          }}
        >
          — {quote.author}
        </p>
      </div>
    </div>
  )
}
