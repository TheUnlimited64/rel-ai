# T041: Encryption Key File Written Without Restrictive Permissions

## Phase: 5 — Security Hardening
## Depends on: T028
## Estimated effort: XS

## Description

`core/auth/encryption.ts:45` writes encryption key file without `mode` parameter:

```ts
fs.writeFileSync(KEY_FILE_PATH, keyMaterial, "utf-8");
```

Default umask applies — other users/processes on host can read the AES-256 encryption key.

## Acceptance Criteria

- [ ] Add `{ mode: 0o600 }` to `writeFileSync` call
- [ ] Key file created with owner-read-write only (`-rw-------`)
- [ ] Test: verify file permissions after creation

## Implementation Notes

- Single-line fix: `fs.writeFileSync(KEY_FILE_PATH, keyMaterial, { mode: 0o600 })`
- Also verify existing key file permissions on startup — warn if too permissive
