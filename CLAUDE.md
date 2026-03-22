# CLAUDE.md — Pettet Architects Client Portal

## Project Overview

Client-facing web portal for Pettet Architects. Homeowners review, approve, and manage architectural selections (materials, finishes, hardware, fixtures) for their building projects. Architects manage teams, documents, and project data.

## Tech Stack

- **React 19** + **Vite 8** (ES modules, JSX — no TypeScript)
- **React Router 7** (client-side SPA routing)
- **Tailwind CSS 4** with custom glass morphism design system
- **Supabase** — auth (email/password), Postgres database, file storage, edge functions
- **Lucide React** — icon library
- **Vitest 4** — unit testing
- **Vercel** — deployment with security headers

## Commands

```bash
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # ESLint (flat config, eslint.config.js)
npm test             # Vitest run once
npm run test:watch   # Vitest in watch mode
```

## Project Structure

```
src/
├── pages/                    # Route-level page components
│   ├── decisions/            # Main selections page (modular)
│   │   ├── index.jsx         # Orchestrator: state, data loading, toolbar
│   │   ├── constants.js      # Config objects, pure helpers, enums
│   │   ├── components.jsx    # Shared UI: SelectionCard, ColourDot, SpecCell
│   │   ├── views.jsx         # View layouts: Schedule, BoQ, Room, Code, Plan
│   │   └── constants.test.js # Unit tests for pure functions
│   ├── Overview.jsx          # Dashboard with LOD visualization
│   ├── Admin.jsx             # Team/client management
│   ├── Documents.jsx         # Document hierarchy (specs, drawings, schedules)
│   ├── ImageManager.jsx      # Architect-only image audit tool
│   ├── Timeline.jsx          # Project timeline
│   ├── Messages.jsx          # Messaging
│   ├── Profile.jsx           # User profile
│   ├── ProjectData.jsx       # Raw data explorer (architect-only)
│   └── ResetPassword.jsx     # Password reset flow
├── components/               # Shared/reusable components
│   ├── Shell.jsx             # App shell: sidebar nav, mobile bottom nav, header
│   ├── LoginPage.jsx         # Supabase auth (login + forgot password)
│   ├── ProjectHero.jsx       # Satellite imagery background with fallbacks
│   ├── InteractivePlan.jsx   # SVG floor plan with room selection
│   ├── SketchIcons.jsx       # Room and group icon maps
│   ├── ConfirmDialog.jsx     # Reusable confirmation modal
│   ├── Toast.jsx             # Toast notification system (context-based)
│   └── LogoAnimation.jsx     # Animated practice logo
├── hooks/                    # React context providers + hooks
│   ├── useAuth.jsx           # Auth context: user, loading, signOut
│   ├── useProject.jsx        # Project context: projects, selectedProject, accessLevel, isArchitect
│   └── usePractice.jsx       # Practice metadata context
├── lib/
│   └── supabase.jsx          # Supabase client initialization
├── App.jsx                   # Route definitions, lazy loading, error boundary
├── main.jsx                  # React root with BrowserRouter
├── index.css                 # Tailwind config + glass design system + animations
└── layers.js                 # Z-index constants (single source of truth)
```

## Architecture & Patterns

### Routing (App.jsx)
- All page routes are **lazy-loaded** with `React.lazy()` + `Suspense` + `PageErrorBoundary`
- Overview is eagerly loaded (landing page)
- Architect-only routes: `/data`, `/images`
- Unauthenticated route: `/reset-password`

### Authentication & Access Control
- Supabase email/password auth via `useAuth` context
- Role-based access via `homeowner_project_access` table
- Two roles: `architect` (full access) and `homeowner` (client view)
- `isArchitect` flag from `useProject` context gates architect-only features
- Client preview mode: architects can toggle to see the client-restricted view

### Data Layer
- **No ORM** — direct Supabase JS client queries (`.select()`, `.eq()`, `.order()`)
- Pages fetch data on mount via `useEffect`, store in component `useState`
- Auth/project/practice data cached in React Context
- Bulk operations via Supabase Edge Functions (e.g., `manage-client`)
- Environment vars accessed via `import.meta.env.VITE_*`

### State Management
- **React Context API** for global state (auth, project, practice, toast)
- **Component-local useState** for page-level state
- No Redux/Zustand — keep it simple

### Component Patterns
- Functional components with hooks only (no class components except error boundaries)
- Error boundaries: `PageErrorBoundary` wraps lazy routes
- Toast notifications: context-based, max 3 visible, auto-dismiss

## Code Conventions

### Naming
- **Components/Pages**: PascalCase filenames and exports (`Shell.jsx`, `LoginPage.jsx`)
- **Hooks**: `use` prefix, camelCase (`useAuth.jsx`, `useProject.jsx`)
- **Constants**: UPPER_SNAKE_CASE (`STATUS_STYLES`, `ROOM_CONFIG`)
- **Variables/functions**: camelCase (`selectedProject`, `handleClick`)
- **Files**: match their default export name

### Styling
- **Tailwind classes** for layout and fixed styles
- **CSS variables** for theme colors (`var(--color-text)`, `var(--color-accent)`)
- **Inline styles** only for dynamic values (z-index from `layers.js`, computed colors)
- **Glass morphism tiers** — use the appropriate class:
  - `.glass` — Primary panels (blur 24px, 78% white)
  - `.glass-s` — Secondary cards (blur 20px, 65% white)
  - `.glass-t` — Tertiary/inline items (blur 16px, 48% white)
  - `.glass-nav` — Navigation (blur 24px, 72% white)
- No CSS modules — global styles live in `index.css`

### Color Palette (earthy/vegetation theme)
- `--color-bg`: #FAF9F5 (body background)
- `--color-surface`: #FFFFFF (cards)
- `--color-text`: #33332E (primary text)
- `--color-muted`: #6B6B60 (secondary text)
- `--color-border`: #E2E0D8 (dividers)
- `--color-accent`: #7A9A7E (primary action green)
- Status: pending `#C4A265`, approved `#5B8A65`, change `#A07358`, urgent `#C47B5C`
- Font: **Jost** (400, 500, 600, 700)

### Z-Index
- Always use constants from `src/layers.js` — never hardcode z-index values
- Layers: SATELLITE, CHROME, OVERLAY, etc.

## Testing

- **Framework**: Vitest 4
- **Test files**: co-located with source (e.g., `constants.test.js` alongside `constants.js`)
- **Scope**: Unit tests for pure functions (parsing, derivation, tree building)
- **Run**: `npm test` (once) or `npm run test:watch` (dev)
- Always run `npm test` after modifying logic in `constants.js` or helper functions

## Environment Variables

```
VITE_SUPABASE_URL=<supabase project URL>
VITE_SUPABASE_ANON_KEY=<supabase anon key>
```

- Template in `.env.example`, actual values in `.env` (git-ignored)
- All env vars must be prefixed with `VITE_` for Vite to expose them

## Deployment

- **Vercel** with `vercel.json` config
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- SPA rewrites: all routes → `index.html`
- Build info: git commit hash + timestamp injected via `vite.config.js`, shown in sidebar footer

## Key Supabase Tables

- `projects` — project master data
- `homeowner_project_access` — user-project access mapping + levels
- `practice_public_profile` — firm metadata (logo, accreditations)
- `project_selections` — full selection records (kind, manufacturer, model, attributes)
- `homeowner_selections_portal` — client-visible selections view
- `portal_selection_rooms` — room-to-selection mappings
- `schedule_groups` — selection groupings
- `master_code_entries` — code hierarchy (construction specs)
- `project_selection_code_links` — selection ↔ code links

## Commit Convention

Use conventional commits: `fix(area): description`, `feat(area): description`, `refactor(area): description`.

## Common Pitfalls

- **Lazy loading blank page bug**: If a lazily-loaded page renders blank, check the `Suspense` fallback and error boundary in `App.jsx`
- **Supabase queries**: Always check for `error` in the destructured response `const { data, error } = await ...`
- **Access control**: Gate architect-only UI with `isArchitect` from `useProject()`, not by checking user email or roles directly
- **Z-index conflicts**: Never use raw numbers — import from `layers.js`
- **Safari**: Glass morphism uses `-webkit-backdrop-filter` fallback — test on Safari when changing blur effects
