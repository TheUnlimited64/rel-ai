# T043: Unpinned Docker Base Image

## Phase: 5 — Security Hardening
## Depends on: T024
## Estimated effort: XS

## Description

`Dockerfile:2,25` uses `oven/bun:1` — major version tag only. No SHA256 digest pin. Attacker could push malicious `1.x` image. No reproducibility guarantee across builds.

## Acceptance Criteria

- [ ] Pin base image to specific digest: `oven/bun:1.2.x@sha256:...`
- [ ] Document how to update pinned version
- [ ] Both `FROM` lines (build + production) pinned consistently
- [ ] Test: build is reproducible with same digest

## Implementation Notes

- Get current digest: `docker pull oven/bun:1 && docker inspect --format='{{index .RepoDigests 0}}' oven/bun:1`
- Add comment in Dockerfile with version + date of pin
- Consider `hadolint` for Dockerfile linting
