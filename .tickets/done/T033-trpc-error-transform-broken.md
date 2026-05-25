# T033: Server Error Responses Not Human-Readable (Broken tRPC ErrorFormatter)

## Phase: Bugfix
## Depends on: None
## Estimated effort: S

## Description

All create/update actions that trigger backend errors (duplicate model, duplicate endpoint path, etc.) show "Unable to transform response from server" instead of a human-readable error message. Affects every mutation that returns a tRPC error.

## Root Cause

**`packages/backend/src/api/trpc.ts:6-11`** — custom `errorFormatter` strips the tRPC error shape:

```ts
errorFormatter({ shape }) {
  return {
    message: shape.message,
    code: shape.data.code,  // "CONFLICT" (string)
  };
}
```

tRPC client expects `error.code` to be a **numeric** JSON-RPC code. Formatter outputs a **string**. Client validation fails → `TransformResultError` → "Unable to transform response from server".

**Impact chain:**
1. Backend throws `TRPCError({ code: "CONFLICT", message: "..." })` — correct
2. `errorFormatter` mangles response → `{ message, code: "CONFLICT" }` (string code, no `data`)
3. tRPC client `transformResult()` checks `typeof code !== "number"` → true → throws
4. Frontend displays raw `TransformResultError.message`

## Affected Entities

All mutations are affected. Entities with unique constraints that trigger user-facing errors:

| Entity | Backend Route | Constraint | Frontend Form |
|--------|--------------|------------|---------------|
| Real Model | `routers/models.ts:90` | id primary key | `CreateRealModelForm.tsx:32` |
| Virtual Fallback Model | `routers/models.ts:96` | id primary key | `FallbackCreateForm.tsx:31` |
| Virtual Tuned Model | `routers/models.ts:102` | id primary key | `TunedCreateForm.tsx:36` |
| Endpoint | `routers/endpoints.ts:48` | path unique | `EndpointForm.tsx:27` |
| Provider | `routers/providers.ts:59` | none explicit | `ProviderForm.tsx:29` |
| Auth Token | `routers/auth.ts:16` | tokenHash unique index | `auth/page.tsx:24` |

## Acceptance Criteria

- [ ] tRPC error responses transform correctly on the client
- [ ] Duplicate model → shows "A model with this ID already exists" (or similar)
- [ ] Duplicate endpoint path → shows "An endpoint with this path already exists"
- [ ] Any backend error surfaces the actual server message, not "Unable to transform response"
- [ ] All 6 entity create forms display meaningful error messages

## Implementation Notes

### Fix the errorFormatter (root cause — single file fix)

**Option A: Remove it entirely** (recommended)
```ts
const t = initTRPC.context<tRPCContext>().create();
// Default formatter preserves correct shape
```

**Option B: Keep custom formatter, preserve numeric code**
```ts
errorFormatter({ shape }) {
  return shape; // passthrough — or customize while keeping code numeric
}
```

### After fixing the formatter — improve error messages on frontend

Once tRPC errors arrive correctly, update mutation `onError` handlers to show user-friendly messages based on `error.data.code`:

- `CONFLICT` → "A [entity] with this [field] already exists"
- `BAD_REQUEST` → validation message from server
- `INTERNAL_SERVER_ERROR` → "Something went wrong. Please try again."

### Frontend error display upgrades (optional but recommended)

Replace raw `mutation.error.message` in forms with a helper:
```ts
function formatMutationError(error: TRPCClientError): string {
  if (error.data?.code === "CONFLICT") return "An item with this name already exists.";
  return error.message;
}
```

## Files

- `packages/backend/src/api/trpc.ts:5-12` — **broken errorFormatter (root cause)**
- `packages/frontend/src/features/models/components/CreateRealModelForm.tsx:80`
- `packages/frontend/src/features/models/components/FallbackCreateForm.tsx:33`
- `packages/frontend/src/features/models/components/TunedCreateForm.tsx:38`
- `packages/frontend/src/features/endpoints/components/EndpointForm.tsx:27`
- `packages/frontend/src/features/providers/components/ProviderForm.tsx:29`
- `packages/frontend/src/features/auth/page.tsx:24`
