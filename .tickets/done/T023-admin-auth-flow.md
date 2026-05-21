# T023: Admin UI Auth Flow

## Phase: 3 — Admin UI
## Depends on: T010, T017
## Estimated effort: M

## Description

Login flow for the admin UI. Bearer token stored in localStorage. Protected routes redirect to login.

## Acceptance Criteria

- [ ] Login page:
  - [ ] Single input: bearer token
  - [ ] "Sign In" button
  - [ ] Validates token against backend
  - [ ] On success: stores token, redirects to dashboard
  - [ ] On failure: shows error
- [ ] Auth context provider:
  - [ ] Stores token in localStorage
  - [ ] Provides token via context to tRPC client
  - [ ] `isAuthenticated` state
  - [ ] `logout()` clears token, redirects to login
- [ ] Route protection:
  - [ ] Unauthenticated → redirect to `/login`
  - [ ] All routes except `/login` protected
- [ ] tRPC client integration:
  - [ ] Attaches `Authorization: Bearer {token}` header to all requests
  - [ ] On 401 response → clear token, redirect to login
- [ ] Test: login page renders
- [ ] Test: successful login stores token
- [ ] Test: failed login shows error
- [ ] Test: protected route redirects unauthenticated user

## Implementation Notes

- Use React context for auth state
- Token in localStorage (homelab — acceptable security posture)
- Could add "remember me" but overkill for homelab
