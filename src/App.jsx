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

function createSplash(x, y, impactVy, direction) {
  // direction: 'down' (ground/top of logo), 'left', 'right'
  const count = 2 + Math.floor(Math.random() * 3)
  const particles = []
  for (let i = 0; i < count; i++) {
    let angle, speed
    speed = SPLASH_SPEED_MIN + Math.random() * (SPLASH_SPEED_MAX - SPLASH_SPEED_MIN)
    if (direction === 'left') {
      angle = Math.PI * (0.5 + Math.random() * 0.5)   // spray left+up
    } else if (direction === 'right') {
      angle = Math.PI * (0.0 + Math.random() * 0.5)    // spray right+up
    } else {
      angle = -Math.PI * (0.15 + Math.random() * 0.7)  // spray up
    }
    particles.push({
      x,
      y: y,
      vx: Math.cos(angle) * speed * (direction === 'down' ? (Math.random() > 0.5 ? 1 : -1) : 1),
      vy: direction === 'down' ? Math.sin(angle) * speed : -Math.abs(Math.sin(angle) * speed),
      radius: 1 + Math.random() * 1.5,
      opacity: 0.3 + Math.random() * 0.2,
      alive: true,
    })
  }
  return particles
}

// Logo collision box (updated each frame based on logo state)
const LOGO_SIZE = 72
const LOGO_REST_X = (SCENE_W - LOGO_SIZE) / 2
const LOGO_REST_Y = 45  // top of logo at rest

function LoadingScreen() {
  const [quote] = useState(() => LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)])
  const canvasRef = useRef(null)
  const textShownRef = useRef(false)
  const [textVisible, setTextVisible] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = SCENE_W * dpr
    canvas.height = SCENE_H * dpr
    ctx.scale(dpr, dpr)

    const logoImg = new Image()
    logoImg.crossOrigin = 'anonymous'
    logoImg.src = 'https://mmfhjlpsumhyxjqhyirw.supabase.co/storage/v1/object/public/image-library/practice/pa-logo.png'

    const S = {
      drops: [], splashes: [],
      puddle: { opacity: 0, scaleX: 0.2 },
      logo: { y: 0, vy: 0, rot: 0, vr: 0, scale: 1 },
      sun: { opacity: 0, scale: 0.3 },
      rays: { opacity: 0 },
      refl: { opacity: 0, shimmer: 0 },
      bg: { warmth: 0 },
      phase: 'rain', // rain → storm → clearing → sun → calm
      t: 0, nextDrop: 0,
      wind: 0, windTarget: 0, windTimer: 0,
    }

    let prev = null, rafId

    /* ── PHASES (7s total) ──
       0.0–2.2  rain      Heavy rain, drops hit logo, logo shakes
       2.2–3.8  storm     Wind builds, rain sideways, logo nearly tips over
       3.8–4.6  clearing  Wind dies, spring snaps logo upright, rain thins
       4.6–6.0  sun       Warm glow, golden reflection, puddle evaporates, logo lifts
       6.0–7.0  calm      Gentle bob, everything settled
    */

    function tick(now) {
      try {
        if (!prev) prev = now
        const dt = Math.min((now - prev) / 1000, 0.05)
        prev = now
        S.t += dt

        // Phase transitions
        if (S.t > 2.2 && S.phase === 'rain') S.phase = 'storm'
        if (S.t > 3.8 && S.phase === 'storm') S.phase = 'clearing'
        if (S.t > 4.6 && S.phase === 'clearing') S.phase = 'sun'
        if (S.t > 6.0 && S.phase === 'sun') S.phase = 'calm'

        // Show text once (ref avoids re-render spam)
        if (S.t > 0.3 && !textShownRef.current) {
          textShownRef.current = true
          setTextVisible(true)
        }

        // ── Wind gusts (ambient) ──
        S.windTimer -= dt
        if (S.windTimer <= 0) {
          S.windTarget = (Math.random() - 0.5) * WIND_MAX * 2
          S.windTimer = 0.5 + Math.random() * 1.5
        }
        S.wind += (S.windTarget - S.wind) * dt * 3

        // ── Storm wind override ──
        if (S.phase === 'storm') {
          const st = S.t - 2.2
          const build = Math.min(st / 1.0, 1)
          const ease = st > 1.3 ? Math.max(0, 1 - (st - 1.3) / 0.3) : 1
          const gust = build * ease * 45 + Math.sin(st * 5) * 12 * build
          S.logo.vr += gust * dt
          S.logo.vy -= build * ease * 8 * dt
          S.windTarget = 80 * build * ease // push rain sideways
        }

        // ── Calm gentle bob ──
        if (S.phase === 'calm') {
          const ct = S.t - 6.0
          S.logo.vr += Math.sin(ct * 2.5) * dt * 3
          S.logo.vy += Math.sin(ct * 1.8) * dt * 2
        }

        // ── Spawn rain ──
        const rate = S.phase === 'rain' ? 0.022 : S.phase === 'storm' ? 0.035 : S.phase === 'clearing' ? 0.12 : 9999
        if (S.t >= S.nextDrop) {
          S.drops.push(createDrop(S.t))
          S.nextDrop = S.t + rate + Math.random() * rate * 0.5
        }

        // ── Logo hitbox ──
        const ly = LOGO_REST_Y + S.logo.y
        const lx = LOGO_REST_X
        const cx = lx + LOGO_SIZE / 2
        const peakY = ly + LOGO_SIZE * 0.18
        const baseY = ly + LOGO_SIZE * 0.55
        const halfW = LOGO_SIZE * 0.42
        const chevH = baseY - peakY

        // ── Update drops ──
        for (const d of S.drops) {
          if (!d.alive) continue
          d.vy += GRAVITY * dt
          d.vy *= Math.max(0, 1 - DRAG * Math.abs(d.vy) * dt)
          d.vx += (S.wind - d.vx) * dt * 2
          d.y += d.vy * dt
          d.x += d.vx * dt

          // Logo collision
          if (d.x >= lx && d.x <= lx + LOGO_SIZE && d.y >= peakY && d.y <= ly + LOGO_SIZE) {
            const rx = d.x - cx
            const ry = d.y - peakY
            const hwAtY = chevH > 0 ? (ry / chevH) * halfW : 0
            const inChev = d.y <= baseY && Math.abs(rx) <= hwAtY
            const inBody = d.y > baseY && d.y <= ly + LOGO_SIZE * 0.85
            if (inChev || inBody) {
              d.alive = false
              if (inChev) {
                S.splashes.push(...createSplash(d.x, d.y, d.vy, rx < 0 ? 'left' : 'right'))
                S.logo.vy += 2.5 + Math.random() * 2
                S.logo.vr += rx * 0.08
              } else {
                S.splashes.push(...createSplash(d.x, d.y, d.vy, 'down'))
                S.logo.vy += 1.5
              }
              if (Math.random() > 0.6) {
                S.splashes.push({ x: d.x + (Math.random() - 0.5) * 6, y: ly + LOGO_SIZE,
                  vx: (Math.random() - 0.5) * 15, vy: 40 + Math.random() * 60,
                  radius: 1.2 + Math.random(), opacity: 0.25, alive: true })
              }
              continue
            }
          }

          // Ground collision
          if (d.y >= GROUND_Y) {
            d.alive = false
            S.splashes.push(...createSplash(d.x, GROUND_Y, d.vy, 'down'))
            S.puddle.opacity = Math.min(0.6, S.puddle.opacity + 0.015)
            S.puddle.scaleX = Math.min(1.6, S.puddle.scaleX + 0.012)
          }
          if (d.x < -20 || d.x > SCENE_W + 20) d.alive = false
        }

        // ── Splashes ──
        for (const s of S.splashes) {
          if (!s.alive) continue
          s.vy += SPLASH_GRAVITY * dt
          s.x += s.vx * dt
          s.y += s.vy * dt
          s.opacity -= dt * 0.8
          if (s.opacity <= 0 || s.y > GROUND_Y + 10) s.alive = false
        }
        S.drops = S.drops.filter(d => d.alive)
        S.splashes = S.splashes.filter(s => s.alive)

        // ── Logo spring ──
        const yTarget = (S.phase === 'sun' || S.phase === 'calm') ? -8 : 0
        const sTarget = (S.phase === 'sun' || S.phase === 'calm') ? 1.06 : 1
        S.logo.vy += (-LOGO_SPRING * (S.logo.y - yTarget) - LOGO_DAMPING * S.logo.vy) * dt
        S.logo.y += S.logo.vy * dt
        S.logo.scale += (sTarget - S.logo.scale) * dt * 3

        // Rotation spring — soft in storm, snappy in clearing
        const rk = S.phase === 'storm' ? 3.5 : S.phase === 'clearing' ? 24 : 12
        const rd = S.phase === 'storm' ? 1.2 : S.phase === 'clearing' ? 5.5 : 2.5
        S.logo.vr += (-rk * S.logo.rot - rd * S.logo.vr) * dt
        S.logo.rot += S.logo.vr * dt

        // ── Sun / clearing atmosphere ──
        if (S.phase === 'sun' || S.phase === 'calm') {
          S.sun.opacity += (0.85 - S.sun.opacity) * dt * 1.8
          S.sun.scale += (1.15 - S.sun.scale) * dt * 1.5
          S.rays.opacity += (0.22 - S.rays.opacity) * dt * 1.5
          S.bg.warmth += (1 - S.bg.warmth) * dt * 1.2
          S.refl.opacity += (0.6 - S.refl.opacity) * dt * 2
          S.refl.shimmer = Math.sin(S.t * 3) * 0.15 + 0.85
          S.puddle.opacity *= (1 - dt * 0.6)
        } else if (S.phase === 'clearing') {
          S.sun.opacity += (0.3 - S.sun.opacity) * dt * 2
          S.sun.scale += (0.6 - S.sun.scale) * dt * 2
        }

        // ══════════════ DRAW ══════════════
        ctx.clearRect(0, 0, SCENE_W, SCENE_H)

        // BG warmth
        if (S.bg.warmth > 0.01) {
          ctx.fillStyle = `rgba(255,240,210,${S.bg.warmth * 0.1})`
          ctx.fillRect(0, 0, SCENE_W, SCENE_H)
        }

        // Sun glow
        if (S.sun.opacity > 0.01) {
          const g = ctx.createRadialGradient(SCENE_W / 2, 20, 0, SCENE_W / 2, 20, 110 * S.sun.scale)
          g.addColorStop(0, `rgba(255,215,110,${S.sun.opacity * 0.45})`)
          g.addColorStop(0.35, `rgba(255,195,70,${S.sun.opacity * 0.18})`)
          g.addColorStop(1, 'transparent')
          ctx.fillStyle = g
          ctx.fillRect(0, 0, SCENE_W, SCENE_H)
        }

        // Sun rays
        if (S.rays.opacity > 0.01) {
          ctx.save()
          ctx.translate(SCENE_W / 2, 60)
          for (let i = 0; i < 12; i++) {
            ctx.save()
            ctx.rotate((i * 30 * Math.PI) / 180)
            ctx.fillStyle = `rgba(255,205,90,${S.rays.opacity})`
            ctx.fillRect(-0.5, -30, 1, 30)
            ctx.restore()
          }
          ctx.restore()
        }

        // Rain
        ctx.lineCap = 'round'
        for (const d of S.drops) {
          ctx.strokeStyle = `rgba(100,130,155,${d.opacity})`
          ctx.lineWidth = 1.5
          ctx.beginPath()
          const a = Math.atan2(d.vy, d.vx)
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - Math.cos(a) * d.length * 0.3, d.y - Math.sin(a) * d.length * 0.3)
          ctx.stroke()
        }

        // Splashes
        for (const s of S.splashes) {
          ctx.fillStyle = `rgba(100,130,155,${Math.max(0, s.opacity)})`
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
          ctx.fill()
        }

        // Puddle
        if (S.puddle.opacity > 0.005) {
          ctx.fillStyle = `rgba(110,140,170,${S.puddle.opacity * 0.15})`
          ctx.save()
          ctx.translate(SCENE_W / 2, GROUND_Y + 5)
          ctx.scale(S.puddle.scaleX, 1)
          ctx.beginPath()
          ctx.ellipse(0, 0, 45, 4, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Logo
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          const sz = LOGO_SIZE * S.logo.scale
          const dx = (SCENE_W - sz) / 2
          const dy = LOGO_REST_Y + S.logo.y
          ctx.save()
          ctx.translate(dx + sz / 2, dy + sz / 2)
          ctx.rotate(S.logo.rot * Math.PI / 180)
          ctx.shadowColor = 'rgba(0,0,0,0.08)'
          ctx.shadowBlur = 8
          ctx.shadowOffsetX = S.logo.rot * 0.3
          ctx.shadowOffsetY = 2
          ctx.drawImage(logoImg, -sz / 2, -sz / 2, sz, sz)
          ctx.restore()

          // Sun reflection on chevron
          if (S.refl.opacity > 0.02) {
            ctx.save()
            ctx.translate(dx + sz / 2, dy + sz * 0.3)
            ctx.rotate(S.logo.rot * Math.PI / 180)
            const ra = S.refl.opacity * (S.refl.shimmer || 1) * 0.5
            const hg = ctx.createRadialGradient(0, -8, 0, 0, -8, sz * 0.35)
            hg.addColorStop(0, `rgba(255,225,140,${ra})`)
            hg.addColorStop(0.4, `rgba(255,210,100,${ra * 0.5})`)
            hg.addColorStop(1, 'transparent')
            ctx.fillStyle = hg
            ctx.beginPath()
            ctx.ellipse(0, -8, sz * 0.3, sz * 0.15, 0, 0, Math.PI * 2)
            ctx.fill()
            const sg = ctx.createRadialGradient(2, -12, 0, 2, -12, 6)
            sg.addColorStop(0, `rgba(255,255,220,${ra * 1.4})`)
            sg.addColorStop(1, 'transparent')
            ctx.fillStyle = sg
            ctx.beginPath()
            ctx.arc(2, -12, 6, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
        }
      } catch (e) {
        // Swallow errors so animation doesn't die
        console.warn('LoadingScreen tick error:', e)
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E8E8E5]" style={{ overflow: 'hidden' }}>
      <div className="text-center max-w-lg px-6" style={{ position: 'relative', zIndex: 2 }}>

        <div style={{ width: SCENE_W, height: SCENE_H, margin: '0 auto 40px' }}>
          <canvas ref={canvasRef} style={{ width: SCENE_W, height: SCENE_H, display: 'block' }} />
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
