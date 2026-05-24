# T062: New TextEncoder Allocations Per Stream Chunk

## Phase: 5 — Quality
## Depends on: T008
## Estimated effort: XS

## Description

`core/proxy/handler.ts:276,285,286,324` — `new TextEncoder()` created repeatedly inside hot `pull()` loop. Should be reused.

## Acceptance Criteria

- [ ] Create `const encoder = new TextEncoder()` outside `ReadableStream` constructor
- [ ] Reference inside `pull()` callback
- [ ] Test: streaming still works

## Implementation Notes

- Single-line refactor — move allocation out of loop
