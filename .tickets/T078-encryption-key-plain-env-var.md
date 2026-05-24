# T078: ENCRYPTION_KEY Passed as Plain Env Var in Docker

## Phase: 5 — Security Hardening
## Depends on: T024
## Estimated effort: S

## Description

`docker-compose.yml` passes `ENCRYPTION_KEY` as plain env var — visible in `docker inspect`, `/proc/<pid>/environ`, process listings. Also: when env var + file both absent, encryption module silently generates ephemeral key, making all previously encrypted data unrecoverable.

## Acceptance Criteria

- [ ] Use Docker secrets or file-based secret mounting
- [ ] Remove silent fallback key generation — fail loudly if no key in production
- [ ] Test: missing ENCRYPTION_KEY in production → server refuses to start

## Implementation Notes

- Docker secrets: `./secrets/encryption_key` mounted as file
- Or: `--env-file` with restricted permissions
- Production: `NODE_ENV=production` + missing key = hard failure
