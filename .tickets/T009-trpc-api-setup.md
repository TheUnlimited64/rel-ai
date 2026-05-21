# T009: tRPC API Setup

## Phase: 2 — Proxy Core
## Depends on: T001, T002
## Estimated effort: M

## Description

Set up tRPC server on the backend with Hono integration. Define the base router, procedure builders, and middleware. Create the tRPC client setup for the frontend.

## Acceptance Criteria

- [ ] tRPC server configured with Hono adapter
- [ ] Base procedure builder with:
  - [ ] Zod input validation
  - [ ] Error formatting (never leak internals)
  - [ ] Logging middleware (request timing)
- [ ] Auth middleware for protected procedures:
  - [ ] Validates bearer token from `Authorization` header
  - [ ] Attaches auth context to procedure
  - [ ] Public procedures skip auth
- [ ] Router structure:
  - [ ] Root router merges: `auth`, `providers`, `endpoints`, `models`, `logs`
  - [ ] Each sub-router in its own file
- [ ] tRPC client setup in `packages/frontend/src/lib/trpc.ts`:
  - [ ] Uses `@trpc/client` with fetch links
  - [ ] Type-safe — imports `AppRouter` type from shared
- [ ] Test: tRPC procedure with Zod validation (valid/invalid input)
- [ ] Test: auth middleware blocks unauthenticated requests
- [ ] Test: error formatting doesn't leak stack traces

## Implementation Notes

- Use `@trpc/server` with `@hono/trpc-server`
- Shared router type in `packages/shared` — both FE and BE import from there
- Actually, router definitions live in backend, but types are inferred and shared via `inferRouterValues`/`inferRouterErrors`
- Keep API layer thin — business logic in core modules
