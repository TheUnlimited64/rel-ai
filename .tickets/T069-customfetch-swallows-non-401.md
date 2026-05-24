# T069: customFetch Silently Swallows Non-401 HTTP Errors

## Phase: 3 — Frontend
## Depends on: T017
## Estimated effort: XS

## Description

`src/lib/trpc.ts:8-18` — `customFetch` only handles 401 and network failure. All other HTTP error statuses pass through as successful `Response` objects. Non-JSON 5xx responses cause confusing downstream errors. No retry on 5xx.

## Acceptance Criteria

- [ ] Log `response.ok === false` non-401 cases for debugging
- [ ] Consider 5xx retry with exponential backoff
- [ ] Test: 503 response → logged, retried or clear error

## Implementation Notes

- React Query handles retries at query level — check if sufficient
- At minimum: add `console.warn` for non-ok responses
