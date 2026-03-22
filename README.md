# Pettet Architects — Client Portal

A client-facing web portal for Pettet Architects that allows homeowners to review, approve, and manage architectural selections (materials, finishes, hardware, fixtures) for their building projects.

## Tech Stack

- **React 19** with Vite 8
- **Tailwind CSS 4** with custom glass morphism design system
- **Supabase** for authentication, database, and storage
- **React Router 7** for client-side routing
- **Lucide React** for icons
- **Deployed on Vercel** with security headers

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your Supabase URL and anon key

# Start development server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
├── pages/
│   ├── decisions/         # Main selections page (refactored into modules)
│   │   ├── index.jsx      # Orchestrator: state, data loading, toolbar
│   │   ├── constants.js   # Config objects and pure helper functions
│   │   ├── components.jsx # Shared UI: SelectionCard, ColourDot, SpecCell
│   │   └── views.jsx      # View layouts: Schedule, BoQ, Room, Code, Plan
│   ├── Overview.jsx       # Project dashboard with satellite hero
│   ├── Admin.jsx          # Team management
│   ├── Documents.jsx      # Document tiers and schedules
│   ├── ImageManager.jsx   # Architect-only image audit tool
│   ├── Timeline.jsx       # Project timeline
│   ├── Messages.jsx       # Messaging
│   ├── Profile.jsx        # User profile
│   └── ProjectData.jsx    # Raw data explorer (architect)
├── components/
│   ├── Shell.jsx           # App shell: sidebar nav, header, project hero
│   ├── LoginPage.jsx       # Auth with Supabase
│   ├── InteractivePlan.jsx # SVG floor plan with room selection
│   ├── SketchIcons.jsx     # Room and group icon maps
│   ├── ConfirmDialog.jsx   # Reusable confirmation modal
│   ├── Toast.jsx           # Toast notification system
│   ├── ProjectHero.jsx     # Satellite imagery background
│   └── LogoAnimation.jsx   # Animated practice logo
├── hooks/
│   ├── useAuth.jsx         # Supabase auth context
│   ├── useProject.jsx      # Project context and access control
│   └── usePractice.jsx     # Practice/firm context
├── lib/
│   └── supabase.jsx        # Supabase client initialization
├── App.jsx                 # Route definitions, loading screen
├── index.css               # Tailwind + glass design system
└── layers.js               # Z-index management
```

## Design System

The portal uses an earthy/vegetation colour palette with three tiers of glass morphism:

- `.glass` — Primary: page headers, hero panels (blur 24px, 78% white)
- `.glass-s` — Secondary: cards, expandable sections (blur 20px, 65% white)
- `.glass-t` — Tertiary: rows, inline items (blur 16px, 48% white)

Status colours: pending (gold `#C4A265`), approved (green `#5B8A65`), change requested (terracotta `#A07358`), urgent (warm clay `#C47B5C`).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous API key |
