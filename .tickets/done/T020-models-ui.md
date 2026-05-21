# T020: Models UI

## Phase: 3 — Admin UI
## Depends on: T013, T017
## Estimated effort: L

## Description

Model management UI for both real and virtual models. Includes fallback chain builder and tuned variant editor.

## Acceptance Criteria

- [ ] Models list page:
  - [ ] Table: ID, display name, type (real/virtual), variant, provider, actions
  - [ ] Filter by type (real/virtual)
  - [ ] "Add Real Model" / "Add Virtual Model" buttons
- [ ] Create real model form:
  - [ ] Fields: ID, display name, provider (select), provider model name
  - [ ] Validates provider exists
- [ ] Create virtual model form:
  - [ ] Toggle: fallback / tuned
  - [ ] Fallback: ordered model list builder (drag to reorder)
  - [ ] Tuned: base model selector + JSON overrides editor
  - [ ] Circular dependency warning before save
- [ ] Model detail page:
  - [ ] Shows all fields, type-specific details
  - [ ] "Test Resolution" button → shows resolved chain
  - [ ] Edit mode
  - [ ] Delete with dependency check warning
- [ ] Fallback chain builder:
  - [ ] Draggable list of model IDs
  - [ ] Add/remove items
  - [ ] Visual order = fallback priority
- [ ] Overrides editor:
  - [ ] JSON editor for overrides (e.g., `{ "thinking_effort": "high" }`)
  - [ ] Syntax validation
- [ ] All components under 100 lines
- [ ] Test: components render
- [ ] Test: create real model form
- [ ] Test: create virtual model (both variants)
- [ ] Test: test resolution displays chain

## Implementation Notes

- Drag-and-drop: use `@dnd-kit/core` or simple up/down buttons
- JSON editor: shadcn Textarea with Zod JSON validation on blur
- Most complex UI — split into many small components
