# T036: SQL Injection via sql.raw() in Log Purge

## Phase: 5 — Security Hardening
## Depends on: T016
## Estimated effort: S

## Description

`core/logging/logger.ts:68` uses `sql.raw()` to interpolate `retentionDays` into SQL. `sql.raw()` bypasses parameterization — values go directly into the query string.

```ts
const cutoffExpr = sql`(datetime('now', '-${sql.raw(String(this.retentionDays))} days'))`;
```

While `retentionDays` is `number` (runtime exploit requires malicious caller), this pattern violates security principles and sets a dangerous precedent.

## Acceptance Criteria

- [ ] Replace `sql.raw()` with parameterized Drizzle alternative
- [ ] Suggested fix: `sql`(datetime('now', '-' || ${this.retentionDays} || ' days'))``
- [ ] Test: log purge still works correctly
- [ ] Grep codebase for other `sql.raw()` usages — audit all

## Implementation Notes

- Drizzle's tagged template `sql` supports parameterized bindings via `${var}` (no `.raw()`)
- `sql.raw()` is the escape hatch — only use when truly necessary
