# T063: mergeUsage Prompt/Completion Token Arithmetic Inconsistency

## Phase: 5 — Quality
## Depends on: T008
## Estimated effort: XS

## Description

`core/proxy/handler.ts:489-497` — `promptTokens: Math.max(...)`, `completionTokens: ... + ...`. Assumption: prompt tokens cumulative, completion tokens incremental. If any provider reports cumulative completion tokens, total will be wrong.

## Acceptance Criteria

- [ ] Document assumption per provider: which reports cumulative vs incremental
- [ ] OR: normalize at adapter level — always report incremental
- [ ] Test: verify prompt/completion token counting consistency across providers

## Implementation Notes

- OpenAI reports incremental. Anthropic may differ. Check per provider.
