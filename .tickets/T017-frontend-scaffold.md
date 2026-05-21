# T017: Frontend Scaffold

## Phase: 3 — Admin UI
## Depends on: T001
## Estimated effort: M

## Description

Set up the React frontend with Vite, React Router, Tailwind, shadcn/ui, and the feature-based directory structure.

## Acceptance Criteria

- [ ] Vite + React + TypeScript project in `packages/frontend`
- [ ] Tailwind CSS configured
- [ ] shadcn/ui initialized with component directory
- [ ] React Router set up with layout routes:
  - [ ] `/` — dashboard (redirect)
  - [ ] `/providers` — providers list
  - [ ] `/providers/:id` — provider detail
  - [ ] `/endpoints` — endpoints list
  - [ ] `/endpoints/:id` — endpoint detail
  - [ ] `/models` — models list (real + virtual)
  - [ ] `/models/:id` — model detail
  - [ ] `/logs` — request logs dashboard
  - [ ] `/tokens` — auth token management
- [ ] Feature directory structure created:
  - [ ] `src/features/providers/`
  - [ ] `src/features/endpoints/`
  - [ ] `src/features/models/`
  - [ ] `src/features/logs/`
  - [ ] `src/features/auth/`
- [ ] Shared layout component with sidebar navigation
- [ ] `ErrorBoundary` component at root level
- [ ] tRPC client configured in `src/lib/trpc.ts`
- [ ] All routes render placeholder pages
- [ ] App builds and runs via `bun dev`

## Implementation Notes

- Install shadcn components as needed (Button, Input, etc.) — don't pre-install all
- Use `@rel-ai/shared` for types
- Feature modules empty initially — just directory + index.ts
