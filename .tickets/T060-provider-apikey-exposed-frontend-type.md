# T060: Provider apiKey Exposed in Frontend Type

## Phase: 3 — Frontend
## Depends on: T018
## Estimated effort: S

## Description

`providers/api.ts:13` — `ProviderResponse` type includes `apiKey: string`. If backend returns actual (unmasked) API key in list/get responses, secrets are in memory and network tab. `maskApiKey` only applies in display (`detail.tsx:69`), not at data layer.

## Acceptance Criteria

- [ ] Backend should return masked key by default (e.g. `sk_****abcd`)
- [ ] Frontend type `apiKey: string` only contains masked value
- [ ] If raw key needed for API calls, use separate field (like `CreateProviderResponse`)
- [ ] Test: network tab shows masked key, not raw

## Implementation Notes

- Backend: `maskApiKey()` at service layer, not just display layer
- `createProvider` can return raw key (one-time display) — already has separate type
