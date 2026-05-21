# T001: Monorepo Scaffold

## Phase: 1 — Foundation
## Depends on: None
## Estimated effort: S

## Description

Initialize Bun workspace monorepo with three packages: `shared`, `backend`, `frontend`. Configure strict TypeScript, ESLint, Prettier. Verify workspace resolution works.

## Acceptance Criteria

- [ ] `packages/shared`, `packages/backend`, `packages/frontend` directories exist
- [ ] Root `package.json` with `"workspaces": ["packages/*"]`
- [ ] Each package has its own `tsconfig.json` extending shared base config
- [ ] `strict: true` in all tsconfig files
- [ ] `noUncheckedIndexedAccess: true` in all tsconfig files
- [ ] ESLint config with `@typescript-eslint/strict-type-checked`
- [ ] Prettier config committed
- [ ] `bun install` resolves workspace dependencies
- [ ] `import { something } from "@rel-ai/shared"` works from backend and frontend
- [ ] `bun run check` at root runs typecheck across all packages
- [ ] `bun run lint` at root runs lint across all packages
- [ ] `.gitignore` includes `node_modules`, `.env`, `*.db`

## Implementation Notes

- Use `@rel-ai/shared`, `@rel-ai/backend`, `@rel-ai/frontend` as package names
- Shared tsconfig base in root or `packages/shared/tsconfig.base.json`
- No source code yet — just scaffold and config
