# T003: Database Schema & Migrations

## Phase: 1 — Foundation
## Depends on: T001, T002
## Estimated effort: M

## Description

Set up Drizzle ORM with SQLite. Define all table schemas matching the Zod schemas. Create initial migration. Verify with in-memory SQLite tests.

## Acceptance Criteria

- [ ] Drizzle configured with SQLite driver (`bun:sqlite` or `better-sqlite3`)
- [ ] Table definitions in `packages/backend/src/db/schema/`:
  - [ ] `providers` table
  - [ ] `models` table
  - [ ] `endpoints` table
  - [ ] `endpoint_models` junction table
  - [ ] `auth_tokens` table
  - [ ] `request_logs` table
- [ ] All columns match SPEC.md schema (types, constraints, indexes)
- [ ] Foreign key constraints defined
- [ ] `drizzle-kit generate` produces initial migration
- [ ] `drizzle-kit push` works against in-memory SQLite
- [ ] Test: seed DB → query → assert row exists
- [ ] Test: foreign key enforcement (insert model with invalid provider_id fails)
- [ ] Test: endpoint_models junction CRUD
- [ ] DB path configurable via `DATABASE_URL` env var (default: `./data/rel-ai.db`)
- [ ] Migration runner script

## Implementation Notes

- Use Drizzle's `sqliteTable` builder
- API keys stored as encrypted — encryption not this ticket, just column exists
- `request_logs.created_at` indexed for time-range queries
