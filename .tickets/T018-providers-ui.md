# T018: Providers UI

## Phase: 3 — Admin UI
## Depends on: T011, T017
## Estimated effort: M

## Description

Provider management UI: list, create, edit, delete, test connection.

## Acceptance Criteria

- [ ] Providers list page:
  - [ ] Table: name, adapter type, base URL, enabled status, actions
  - [ ] Toggle enabled/disabled
  - [ ] Delete with confirmation
  - [ ] "Add Provider" button
- [ ] Create provider form:
  - [ ] Fields: name, adapter type (select), base URL, API key (password input), config (JSON editor)
  - [ ] Validates with Zod schema on submit
  - [ ] Shows API key once on success (copy button)
  - [ ] Redirects to provider detail on success
- [ ] Provider detail page:
  - [ ] Shows all fields (API key masked)
  - [ ] Edit mode for all fields
  - [ ] "Test Connection" button → shows result inline
  - [ ] "Regenerate API Key" (for provider — actually just re-enter)
- [ ] All components under 100 lines
- [ ] Feature-based structure: `features/providers/components/`, `features/providers/hooks/`
- [ ] Error states handled (network errors, validation errors)
- [ ] Loading states with skeletons
- [ ] Test: component renders (Vitest + React Testing Library)
- [ ] Test: form validation
- [ ] Test: CRUD operations (mocked tRPC)

## Implementation Notes

- Use shadcn Table, Form, Input, Select, Button, Dialog, Toast components
- Feature module owns its tRPC queries/mutations in `features/providers/api.ts`
- Use React Hook Form + Zod resolver for form validation
