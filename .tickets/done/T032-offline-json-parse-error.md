# T032: Backend Offline Shows Raw JSON Parse Error in Tables

## Phase: Bugfix
## Depends on: None
## Estimated effort: M

## Description

When backend is offline, frontend tables show raw error "Unexpected end of JSON input" instead of a user-friendly connection error notification.

## Root Cause

Backend offline → `fetch("/api/trpc/...")` gets network error or empty response → tRPC `httpLink` calls `response.json()` on empty body → throws `SyntaxError: Unexpected end of JSON input` → propagates through React Query → `query.error?.message` rendered raw in page components.

No global error handling exists anywhere:
- `trpc.ts` `customFetch` only handles 401, ignores network failures
- `query-client.ts` has no `onError` callback, no retry for network errors
- No toast/notification library in the project
- All pages render `query.error?.message` as inline red text

## Affected Files

| File | Line | What |
|------|------|------|
| `features/models/page.tsx` | 65 | `{error && <p className="text-sm text-destructive">{error}</p>}` |
| `features/endpoints/page.tsx` | 56 | `{error && <p className="text-sm text-destructive">{error}</p>}` |
| `features/providers/page.tsx` | 55-57 | `{error && <p className="text-sm text-destructive">{error}</p>}` |
| `features/logs/page.tsx` | 69 | `{logsQuery.error && <p ...>{logsQuery.error.message}</p>}` |
| `lib/trpc.ts` | 8-16 | `customFetch` ignores non-401 errors |
| `lib/query-client.ts` | — | no global `onError`, no retry logic |

## Acceptance Criteria

- [ ] Backend offline → friendly "Cannot connect to server" message, not raw JSON error
- [ ] Toast/notification popup shown for connection errors
- [ ] Retry logic for transient network failures (up to 3 attempts)
- [ ] Inline error text replaced with connection-aware component or removed in favor of toast
- [ ] All 4 page files handle errors consistently
- [ ] App logic errors still show their real message (don't mask real errors)

## Implementation Notes

### Step 1: Fix `trpc.ts` `customFetch` — catch network errors at source
```ts
.catch(() => {
  throw new Error("Unable to connect to server. Is the backend running?");
});
```
This stops "Unexpected end of JSON input" before it propagates.

### Step 2: Add retry + `onError` in `query-client.ts`
- Detect connection errors by message pattern: `"Unexpected end of JSON input"`, `"Failed to fetch"`, `"NetworkError"`
- Retry connection errors up to 3 times
- Call toast on persistent connection failure

### Step 3: Add toast library (`sonner`)
- Lightweight, shadcn-compatible
- Add `<Toaster />` to app layout
- Use `toast.error()` for connection errors from global `onError`

### Step 4: Replace inline error paragraphs
- Create `<QueryError error={error} />` component:
  - Connection error → "Cannot connect to server" + retry button
  - App error → original message
- Replace all 4 inline `<p className="text-sm text-destructive">` blocks

## Files

- `packages/frontend/src/lib/trpc.ts:8-16`
- `packages/frontend/src/lib/query-client.ts`
- `packages/frontend/src/features/models/page.tsx:65`
- `packages/frontend/src/features/endpoints/page.tsx:56`
- `packages/frontend/src/features/providers/page.tsx:55-57`
- `packages/frontend/src/features/logs/page.tsx:69`
