# T030: Endpoint View Shows Wrong URL (Frontend Port)

## Phase: Bugfix
## Depends on: None
## Estimated effort: S

## Description

Endpoint detail view and table display the proxy URL with the frontend port (e.g. `:5173`) instead of the backend proxy port (`:3000`). Users copy the wrong URL.

## Root Cause

`packages/frontend/src/features/endpoints/api.ts` line 39:
```typescript
export function getProxyBase(): string {
  return import.meta.env.VITE_PROXY_BASE ?? window.location.origin + "/v1";
}
```

Fallback uses `window.location.origin` — returns frontend dev server origin, not backend. `VITE_PROXY_BASE` is not set anywhere, so the fallback always fires.

Affected consumers:
- `detail.tsx` line 48 — `proxyUrl` displayed in EndpointDetailView
- `EndpointTable.tsx` line 16 — `copyUrl` copies wrong URL

## Acceptance Criteria

- [ ] Endpoint view shows correct backend proxy URL
- [ ] "Copy URL" copies the correct URL
- [ ] Works in both dev and production (behind reverse proxy)

## Implementation Notes

### Quick fix: set environment variable
```
VITE_PROXY_BASE=http://localhost:3000/v1
```
Breaks when deployment topology changes.

### Robust fix: backend provides proxy base URL
- Add `proxyBase` field to endpoint API response, or a dedicated `/api/proxy-base` endpoint
- Backend knows its own port (`server.ts` line 44: `port = opts?.port ?? Number(process.env.PORT || 3000)`)
- Frontend uses server-provided URL instead of guessing from `window.location`

### Alternative: HTML meta injection
In `server.ts` lines 162-166, inject `<meta name="proxy-base" content="...">` into `index.html` before serving. Frontend reads meta tag.

## Files

- `packages/frontend/src/features/endpoints/api.ts:39`
- `packages/frontend/src/features/endpoints/detail.tsx:48`
- `packages/frontend/src/features/endpoints/components/EndpointTable.tsx:16`
