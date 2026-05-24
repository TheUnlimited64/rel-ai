# T065: regenerateApiKey Hardcoded sk_ Prefix

## Phase: 5 — Quality
## Depends on: T011
## Estimated effort: XS

## Description

`core/provider/service.ts:152` — `const rawKey = \`sk_${crypto.randomUUID().replace(/-/g, "")}\`` — 32-char hex after `sk_`. UUID not designed as key material. If UUID collision occurs (astronomically unlikely), two providers get same key.

## Acceptance Criteria

- [ ] Use `crypto.getRandomValues` like `generateToken()` for key generation
- [ ] Or: append timestamp for uniqueness guarantee
- [ ] Test: generated key is unique across multiple calls

## Implementation Notes

- Pattern already exists: `generateToken()` in auth module uses `crypto.getRandomValues`
- Reuse same pattern for API key generation
