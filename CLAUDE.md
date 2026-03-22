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

### Context Provider Nesting (App.jsx)
Providers must be nested in this order (outermost → innermost):
```
ToastProvider → PracticeProvider → AuthProvider → ProjectProvider
```
`ProjectProvider` depends on `AuthProvider` (needs user), `AuthProvider` depends on `PracticeProvider`, and `ToastProvider` is independent. Changing this order will break the app.

### Routing (App.jsx)
- All page routes are **lazy-loaded** with `React.lazy()` + `Suspense` + `PageErrorBoundary`
- Overview is eagerly loaded (landing page)
- Architect-only routes: `/data`, `/images`
- Unauthenticated route: `/reset-password` (outside `ProjectProvider`)
- `DecisionMap.jsx` is a separate top-level page (distinct from `decisions/index.jsx` which it may import)

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

### Build-Time Globals
Vite injects these globals (defined in `vite.config.js`):
- `__BUILD_HASH__` — short git commit hash
- `__BUILD_TIME__` — ISO timestamp (YYYY-MM-DD HH:MM)
These are displayed in the sidebar footer via `Shell.jsx`.

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
Always import `Z` from `src/layers.js` — never hardcode z-index values.
```
Z.SATELLITE    = 0     // background aerial imagery
Z.CHROME       = 10    // header, sidebar, main content panels
Z.ATTRIBUTION  = 11    // Esri satellite attribution text
Z.OVERLAY      = 100   // dropdown backdrops, modal scrims
Z.DROPDOWN     = 110   // dropdown menus, popovers
Z.MODAL        = 200   // modal dialogs
Z.TOAST        = 300   // toast notifications
```

## Linting

- **ESLint flat config** (`eslint.config.js`): `@eslint/js` recommended + `react-hooks` + `react-refresh`
- Custom rule: `no-unused-vars` ignores variables matching `^[A-Z_]` (uppercase constants, React components)
- Run: `npm run lint`
- No Prettier — formatting is not enforced
- No pre-commit hooks — run `npm run lint` and `npm test` manually before pushing

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

## Supabase Data Model

### Data Relationship Map

```
projects
├── homeowner_project_access        — user ↔ project access (access_level)
├── project_services                — stage lifecycle (stage_code, status, dates)
│   └── stage_gate_items            — milestones per stage
├── project_decisions               — decision records
│   └── decision_nodes              — question templates
│       └── decision_node_dependencies — dependency graph (depends_on_node_key, dependency_kind)
├── project_documents               — master document records
│   └── homeowner_document_shares   — shared with clients
├── project_risk_flags              — risk indicators
├── project_selections              — full selection records (kind, manufacturer, model, attributes)
│   └── homeowner_selections_portal — client-visible view (approval_status, priority, schedule_group)
│       └── portal_selection_rooms  — room-to-selection mappings
│   └── project_selection_code_links → master_code_entries (is_primary flag)
│   └── project_selection_natspec_links → natspec_sections (section_ref, section_title)
├── schedule_groups                 — selection grouping/categorisation
│   └── schedule_output_definitions — schedule sheet definitions + element types
│       └── sub_criteria_definitions — sub-criteria fields per element
├── homeowner_messages              — real-time messaging (has realtime subscription)
├── progress_payment_schedule       — payment milestones (homeowner-visible)
├── lod_spec_service_element_targets — LOD targets per service stage
├── lod_spec_elements               — element definitions (uniformat codes)
└── project_consultant_briefs → consultant_disciplines — consultant scope

users (auth.users)
├── homeowner_profiles              — full_name, phone, notification preferences
└── practice_public_profile         — firm branding, logo, accreditations
```

### Tables by Domain

**Core:**
`projects`, `homeowner_project_access`, `practice_public_profile`, `homeowner_profiles`

**Selections & Decisions:**
`project_selections`, `homeowner_selections_portal`, `portal_selection_rooms`, `schedule_groups`, `schedule_output_definitions`, `sub_criteria_definitions`, `project_decisions`, `decision_nodes`, `decision_node_dependencies`

**Codes & Specs:**
`master_code_entries`, `project_selection_code_links`, `project_selection_natspec_links`, `natspec_sections`

**Documents & Timeline:**
`project_documents`, `homeowner_document_shares`, `project_services`, `stage_gate_items`, `progress_payment_schedule`

**Other:**
`homeowner_messages`, `project_risk_flags`, `project_consultant_briefs`, `consultant_disciplines`, `lod_spec_elements`, `lod_spec_service_element_targets`, `v_project_team` (view)

### RPC Functions

| Function | Called from | Purpose |
|----------|-----------|---------|
| `get_project_decisions_with_nodes` | Timeline.jsx | Decisions joined with node details in single call |
| `sync_portal_selections` | ProjectData.jsx | Reconcile portal selections with underlying data |

### Edge Functions

Edge function base URL is constructed from `VITE_SUPABASE_URL + '/functions/v1'`. Used in Documents.jsx for server-side operations.

### Realtime Subscriptions

Messages page subscribes to `postgres_changes` on `homeowner_messages`:
```js
supabase
  .channel('messages-' + projectId)
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public',
    table: 'homeowner_messages',
    filter: `project_id=eq.${projectId}`,
  }, callback)
  .subscribe()
```
Always clean up with `.removeChannel()` in the `useEffect` return.

### Common Query Patterns

**Nested foreign-key selects** (Supabase PostgREST joins):
```js
// Join through foreign key — colon syntax
supabase.from('homeowner_selections_portal')
  .select('*, project_selections:project_selection_id (id, title, ...)')
  .eq('project_id', projectId)

// Inner join with !inner
supabase.from('decision_nodes')
  .select('node_key, ..., project_decisions!inner(decision_status, ...)')
```

**Filters used:** `.eq()`, `.in()`, `.lte()`, `.order()`, `.single()`, `{ count: 'exact' }`

**Mutations:** `.insert()`, `.update()` — always destructure `{ error }` and handle.

### Supabase Query Conventions

1. Always destructure `{ data, error }` and check `error` before using `data`
2. Use `.single()` only when exactly one row is expected (profiles, practice)
3. Prefer nested selects over separate queries when data is related
4. For counts without data, use `.select('id', { count: 'exact', head: true })`
5. Clean up realtime channels in `useEffect` return functions

## Commit Convention

Use conventional commits: `fix(area): description`, `feat(area): description`, `refactor(area): description`.

## Pre-Push Checklist

```bash
npm run lint && npm test && npm run build
```

There are no pre-commit hooks, so always run these manually before pushing. `npm run build` catches import errors and missing exports that lint/tests won't.

## Common Pitfalls

- **Lazy loading blank page bug**: If a lazily-loaded page renders blank, check the `Suspense` fallback and error boundary in `App.jsx`
- **Supabase queries**: Always check for `error` in the destructured response `const { data, error } = await ...`
- **Access control**: Gate architect-only UI with `isArchitect` from `useProject()`, not by checking user email or roles directly
- **Z-index conflicts**: Never use raw numbers — import `Z` from `layers.js`
- **Safari**: Glass morphism uses `-webkit-backdrop-filter` fallback — test on Safari when changing blur effects
- **Provider ordering**: Context providers in `App.jsx` must stay in their current nesting order (see Architecture section)
- **Build globals**: `__BUILD_HASH__` and `__BUILD_TIME__` are injected by Vite — don't treat them as undefined
