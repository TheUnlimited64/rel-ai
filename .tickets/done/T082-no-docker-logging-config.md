# T082: No Docker Logging Configuration

## Phase: 4 — Polish
## Depends on: T024
## Estimated effort: XS

## Description

`docker-compose.yml` has no logging configuration — unbounded log growth on host.

## Acceptance Criteria

- [ ] Add: `logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }`

## Implementation Notes

- Single addition to compose service definition
