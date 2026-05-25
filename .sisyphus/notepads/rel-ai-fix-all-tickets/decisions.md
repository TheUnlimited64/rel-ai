# Decisions

## 2026-05-25 Session Start
- Execute waves sequentially (1→2→3→...→9)
- Within each wave, parallelize tasks that touch different files
- Same-file tickets: execute sequentially within wave
- T048: document-only approach (homelab scale acceptable)
