# T077: Port 3000 Bound to All Interfaces

## Phase: 5 — Security Hardening
## Depends on: T024
## Estimated effort: XS

## Description

`docker-compose.yml` — port `3000:3000` binds to `0.0.0.0:3000` by default. If host has public IP, API proxy + admin panel exposed to internet.

## Acceptance Criteria

- [ ] Bind to `127.0.0.1:3000:3000` unless behind reverse proxy
- [ ] Document expected deployment topology in README
- [ ] Add env var option for bind address

## Implementation Notes

- Default: `127.0.0.1:3000:3000`
- If reverse proxy used, keep `0.0.0.0` or configure as needed
