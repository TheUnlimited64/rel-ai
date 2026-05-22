# T029: Docker Build Failure — Invalid COPY Syntax

## Phase: Bugfix
## Depends on: None
## Estimated effort: S

## Description

`docker compose up --build` fails with:
```
failed to solve: failed to compute cache key: failed to calculate checksum of ref chrp3z2194efj383pyvh2h542::go83urkzvoqs4650r8d9w46ld: "/||": not found
```

## Root Cause

Dockerfile line 36 uses shell syntax inside a `COPY` instruction:
```dockerfile
COPY packages/backend/drizzle.config.ts packages/backend/ 2>/dev/null || true
```

`COPY` is not a shell command. Docker interprets `2>/dev/null || true` as additional path arguments, tokenizing into `/||` which it tries to resolve as a file path.

## Acceptance Criteria

- [ ] `docker compose up --build` succeeds
- [ ] No shell redirects/operators in COPY instructions
- [ ] drizzle.config.ts is copied correctly into the image

## Implementation Notes

- Fix: remove `2>/dev/null || true` from the COPY line
- If the file might not exist, use a multi-stage build or conditional build arg — shell syntax is never valid in COPY
- Scan for any other COPY instructions with similar shell syntax

## Files

- `Dockerfile` line 36
