# T042: Admin Token Logged to Stdout

## Phase: 5 — Security Hardening
## Depends on: T010
## Estimated effort: S

## Description

`server.ts:162` logs first-run admin token to stdout:

```ts
console.log(`\n🔑 First-run admin token created: ${token}\n`);
```

In containerized production, logs are collected by logging infrastructure (Docker logs, Fluentd, CloudWatch). Token persisted in log storage = credential leak.

## Acceptance Criteria

- [ ] Remove `console.log` with raw token from production code
- [ ] Alternative: write token to a file in data volume (e.g. `/app/data/.initial-token`)
- [ ] Alternative: require explicit token retrieval via CLI command
- [ ] Token file has `0o600` permissions
- [ ] Warning: delete token file after first read
- [ ] Test: `docker compose up` does not leak token in `docker logs`

## Implementation Notes

- Write to file that user can `docker exec cat /app/data/.initial-token` once
- File is deleted after first successful login
- Never log raw credentials — this is a hard security rule
