# T027: Startup Wizard & First-Run Experience

## Phase: 4 — Polish
## Depends on: T010, T024
## Estimated effort: S

## Description

First-run experience: when DB is empty, guide user through initial setup (create admin token, add first provider, create first endpoint).

## Acceptance Criteria

- [ ] Backend detects first run (no auth tokens in DB):
  - [ ] Auto-creates initial admin token
  - [ ] Prints token to stdout (one-time)
  - [ ] Logs warning if running in production without ENCRYPTION_KEY
- [ ] Frontend detects first run (no providers):
  - [ ] Shows "Get Started" wizard instead of empty dashboard
  - [ ] Step 1: "Add your first provider" (collapses provider create form)
  - [ ] Step 2: "Add a model" (collapses model create form)
  - [ ] Step 3: "Create an endpoint" (collapses endpoint create form)
  - [ ] After completion → shows "You're all set!" with endpoint URL + token
- [ ] Test: first-run detection
- [ ] Test: wizard steps

## Implementation Notes

- Wizard is just conditional UI — if no data, show wizard flow
- Simple and functional, not production onboarding
