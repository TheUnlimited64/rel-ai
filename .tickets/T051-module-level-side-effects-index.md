# T051: Module-Level Side Effects in index.ts

## Phase: 5 — Quality
## Depends on: T001
## Estimated effort: XS

## Description

`packages/backend/src/index.ts:10-12` creates memory DB and app at import time. Importing module triggers DB creation + migration. Breaks test isolation — any test importing from `index.ts` gets side effects.

## Acceptance Criteria

- [ ] Move DB creation and migration inside `import.meta.main` guard
- [ ] Export `createApp()` factory function instead
- [ ] `import.meta.main` block calls `createApp()` and starts server
- [ ] Tests can import without triggering DB

## Implementation Notes

- Pattern: export `createApp()` that returns `{ app, db }`
- `import.meta.main` is Bun's equivalent of `if __name__ == "__main__"`
