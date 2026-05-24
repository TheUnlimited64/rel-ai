# T052: Provider Type Stores Encrypted apiKey — Type Suggests Plaintext

## Phase: 5 — Quality
## Depends on: T028
## Estimated effort: S

## Description

`ProviderSchema.apiKey: z.string().min(1)` implies plaintext. Actual value stored in DB is encrypted ciphertext. Type confusion risk — developer might treat encrypted blob as usable API key.

`db/schema/providers.ts:13` column named `api_key` but stores encrypted ciphertext. Misleading.

## Acceptance Criteria

- [ ] Add comment on schema field: `// Stored as encrypted ciphertext`
- [ ] Consider rename: `api_key` → `api_key_encrypted` (requires migration)
- [ ] Or: add `encryptedApiKey` field distinct from `apiKey`
- [ ] Resolver doc: clarify which fields are encrypted vs masked

## Implementation Notes

- Column rename requires DB migration — weigh cost vs clarity gain
- Minimum: JSDoc comment on schema field explaining encryption
