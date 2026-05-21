# T019: Endpoints UI

## Phase: 3 — Admin UI
## Depends on: T012, T017
## Estimated effort: M

## Description

Endpoint management UI: list, create, edit, delete, regenerate token, manage model assignments.

## Acceptance Criteria

- [ ] Endpoints list page:
  - [ ] Table: name, path, model count, enabled status, actions
  - [ ] Toggle enabled/disabled
  - [ ] Delete with confirmation
  - [ ] Copy endpoint URL to clipboard
- [ ] Create endpoint form:
  - [ ] Fields: name, path, models (multi-select from available models)
  - [ ] Path validation (lowercase, no spaces)
  - [ ] Token auto-generated, shown once with copy button
  - [ ] Redirects to endpoint detail
- [ ] Endpoint detail page:
  - [ ] Shows all fields (token masked with copy button)
  - [ ] Edit name/path
  - [ ] Model assignment manager (add/remove models)
  - [ ] "Regenerate Token" with confirmation
  - [ ] Shows proxy URL: `http://host:port/v1/{path}/chat/completions`
- [ ] All components under 100 lines
- [ ] Test: component renders
- [ ] Test: form validation
- [ ] Test: CRUD operations (mocked tRPC)

## Implementation Notes

- Model multi-select: checkbox list or dual-list picker
- Token display: show once on create/regenerate, then masked
- Use shadcn components consistent with providers UI pattern
