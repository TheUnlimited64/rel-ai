# T022: Auth Token Management UI

## Phase: 4 — Polish
## Depends on: T010, T017
## Estimated effort: S

## Description

Admin token management: create, list, delete tokens for admin UI access.

## Acceptance Criteria

- [ ] Token list page:
  - [ ] Table: name, created date, last used, actions
  - [ ] Token values never shown (only on creation)
- [ ] Create token dialog:
  - [ ] Input: name (e.g., "my-laptop", "phone")
  - [ ] On success: shows token value once with copy button
  - [ ] Warning: "This token will not be shown again"
- [ ] Delete token with confirmation
- [ ] Test: token list renders
- [ ] Test: create token dialog
- [ ] Test: delete token

## Implementation Notes

- Simple CRUD — follows same pattern as providers/endpoints
- This is for admin UI access, not proxy endpoint tokens
