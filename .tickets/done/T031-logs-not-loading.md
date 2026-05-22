# T031: Logs Don't Load — Broken Date Default in Schema

## Phase: Bugfix
## Depends on: None
## Estimated effort: S

## Description

Request logs page shows empty. No log entries appear despite requests being proxied.

## Root Cause

`packages/backend/src/db/schema/request_logs.ts` line 26:
```typescript
.default("(datetime('now'))")
```

This is a **string literal**, not a SQL expression. Drizzle generates:
```sql
DEFAULT '(datetime(''now''))'  -- quoted string, not evaluated
```

**Impact chain:**
1. Schema stores literal text `(datetime('now'))` instead of actual timestamp
2. `packages/backend/src/core/logging/logger.ts` lines 36-47 — `log()` omits `createdAt` from insert → SQLite uses broken default → stores literal text
3. `packages/backend/src/api/routers/logs.ts` / query logic — `gte(requestLogs.createdAt, filters.from)` compares literal string vs ISO date → date filter always fails
4. Frontend default filter is `"24h"` → `from` is set → all rows filtered out → **logs appear empty**

## Acceptance Criteria

- [ ] Logs load and display in the dashboard
- [ ] Date range filtering works
- [ ] `createdAt` stores actual ISO timestamp, not literal string
- [ ] Existing rows with broken defaults are handled (migration or cleanup)

## Implementation Notes

### Immediate fix (minimal):
In `logger.ts`, add `createdAt: new Date().toISOString()` to the `.values({...})` call. Bypasses broken default.

### Correct long-term fix:
In `request_logs.ts` line 26, change:
```typescript
.default("(datetime('now'))")
```
to:
```typescript
.default(sql`(datetime('now'))`)
```
(requires `import { sql } from "drizzle-orm"`). Then regenerate migration. Same issue exists across all 8 `.default("(datetime('now'))")` instances in schema files — fix them all.

## Files

- `packages/backend/src/db/schema/request_logs.ts:26`
- `packages/backend/src/core/logging/logger.ts:36-47`
- `packages/backend/src/api/routers/logs.ts` (query with date filter)
