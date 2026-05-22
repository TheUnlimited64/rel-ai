# T034: Premium Dark Mode UI Redesign

## Phase: 4 — Polish
## Depends on: T017, T018, T019, T020, T022
## Estimated effort: L

## Description

Redesign the admin UI into a premium, developer-centric dark mode interface. Replace the current neutral-gray dark theme with a zinc-based dark palette featuring electric violet/indigo accents. Convert text-only actions to icon-based controls, add semantic color badges, and polish navigation with icons and active-state indicators.

## Acceptance Criteria

### Theme
- [ ] Replace `.dark` CSS variables in `index.css` with zinc-based HSL palette:
  - [ ] `--background: 240 10% 3.9%` (deep near-black)
  - [ ] `--foreground: 0 0% 98%`
  - [ ] `--card: 240 10% 5.9%`
  - [ ] `--primary: 263.4 70% 50.4%` (violet accent)
  - [ ] `--ring: 263.4 70% 50.4%` (matching focus ring)
  - [ ] `--secondry: 240 3.7% 15.9%`
  - [ ] `--muted: 240 3.7% 15.9%`
  - [ ] `--muted-foreground: 240 5% 64.9%`
  - [ ] `--border: 240 3.7% 15.9%`
  - [ ] `--input: 240 3.7% 15.9%`
  - [ ] `--destructive: 0 62.8% 30.6%`
  - [ ] All sidebar variables (`--sidebar-*`) updated to match
- [ ] Apply `.dark` class on `<html>` in `main.tsx` (force dark mode always)
- [ ] All page areas render correctly with new theme — no visual breakage

### Layout & Sidebar (`Layout.tsx`)
- [ ] Nav items: add `lucide-react` icons alongside labels:
  - [ ] Providers → `<Server />` or `<Layers />`
  - [ ] Endpoints → `<Radio />` or `<Cable />`
  - [ ] Models → `<Cpu />` or `<Box />`
  - [ ] Logs → `<FileText />` or `<Terminal />`
  - [ ] Tokens → `<KeyRound />`
- [ ] Active nav route: left border accent line (`border-l-2 border-primary`) + subtle background (`bg-muted/50`)
- [ ] Footer "Sign Out" button: replace with user profile card block containing:
  - [ ] Placeholder avatar circle (`UserRound` icon in muted circle, `size-8`)
  - [ ] Mock user name/email text area
  - [ ] `LogOut` icon button adjacent to info
  - [ ] Positioned at sidebar bottom, properly separated from nav

### Providers Table (`ProviderTable.tsx`)
- [ ] Table header text: lowercase → uppercase, `text-xs`, `tracking-wider`, `text-muted-foreground`
- [ ] Use thin horizontal dividers (`border-b border-border/40`) — no vertical borders
- [ ] Adapter type badges: color-coded per type:
  - [ ] `openai` → emerald/green tint (`bg-emerald-950/50 text-emerald-400 border-emerald-800`)
  - [ ] `anthropic` → amber/orange tint (`bg-amber-950/50 text-amber-400 border-amber-800`)
  - [ ] Other/unknown → default secondary
- [ ] Replace text "Delete" button with icon button:
  - [ ] `<Trash2 />` icon, `variant="ghost"`, `size="icon"`
  - [ ] Hover state: `hover:text-destructive` transition

### Endpoints Table (`EndpointTable.tsx`)
- [ ] Table header text: uppercase, `text-xs`, `tracking-wider`, `text-muted-foreground`
- [ ] Path column: render `/path` in inline-code style (`bg-muted px-2 py-0.5 rounded font-mono text-xs`)
- [ ] Replace "Copy URL" with `<Copy />` icon button, `size="icon"`, `variant="ghost"`
- [ ] Replace "Delete" with `<Trash2 />` icon button, `size="icon"`, `variant="ghost"`, `hover:text-destructive`
- [ ] Add tooltip or brief confirmation on copy (e.g., `setTimeout` to toggle `Check` icon briefly)

### Models Page & Table (`ModelsPage`, `ModelTable.tsx`)
- [ ] Replace pill-button filter tabs with `shadcn/ui` `Tabs` component:
  - [ ] Add `tabs.tsx` component from shadcn using `@base-ui/react/tabs` (if not available, build minimal equivalent)
  - [ ] Tabs: All / Real / Virtual
  - [ ] Active tab indicator: slide animation or fade transition
- [ ] Type badges: update colors for premium look:
  - [ ] `Real` → indigo-blue tint (`bg-indigo-950/50 text-indigo-400 border-indigo-800`)
  - [ ] `Virtual` → violet-purple tint (`bg-violet-950/50 text-violet-400 border-violet-800`)

### Tokens Page (`TokenTable.tsx`, `auth/page.tsx`)
- [ ] Fix "Invalid Date" bug: ensure `createdAt` and `lastUsedAt` values are properly parsed as ISO strings before passing to `new Date()`
- [ ] Display dates using relative time format (`"2 days ago"`) via a helper, falling back to `toLocaleDateString()` if relative parsing fails
- [ ] Write a utility `formatRelativeTime(date: string): string` in `lib/utils.ts` or `features/auth/format.ts`
- [ ] Delete action: replace text button with `<Trash2 />` icon button, `variant="ghost"`, `size="icon"`, `hover:text-destructive`
- [ ] Add test: relative time formatter returns expected strings for known inputs
- [ ] Add test: TokenTable renders dates without "Invalid Date"

### Modals & Dialogs
- [ ] `DialogOverlay`: upgrade to `bg-black/40 backdrop-blur-sm` (current is `bg-black/10`)
- [ ] `DialogContent`: ensure `ring-1 ring-border` for subtle edge definition
- [ ] All `Input` components inside dialogs: verify they respond to theme focus ring (`focus-visible:ring-primary`)

### Endpoint Model Manager (`EndpointModelManager.tsx`)
- [ ] Replace plain checkbox list with card-based selection grid:
  - [ ] `grid grid-cols-2 gap-2` layout
  - [ ] Each model → clickable card (`rounded-lg border p-3 cursor-pointer transition-colors`)
  - [ ] Selected state: `border-primary bg-primary/5 ring-1 ring-primary`
  - [ ] Unselected state: `border-border hover:border-muted-foreground/30`
  - [ ] Show model name + type badge inside each card
  - [ ] Entire card area is clickable (not just checkbox)

### Global Polish
- [ ] All pages use `bg-background text-foreground` and `border-border` via theme tokens (no hardcoded hex colors)
- [ ] Table headers consistently uppercase, `text-xs`, `tracking-wider` across all screens
- [ ] All text-based action buttons replaced with icon buttons where appropriate
- [ ] No visual regression on light mode (keep `:root` light theme working)
- [ ] All existing tests pass
- [ ] Components under 100 lines each

## Implementation Notes

- Theme: switch `.dark` block from OKLCH to HSL values matching the zinc palette. HSL is used in the spec for easier mental mapping with Tailwind.
- Theme application: add `document.documentElement.classList.add("dark")` in `main.tsx` (or a `useEffect`).
- Icons: import from `lucide-react` (already a dependency, v1.16.0).
- Tabs component: shadcn v4 `base-nova` style may not have native tabs. Build minimal tabs using `button` group + `data-[state=active]` attributes with border-bottom indicator. Do NOT install extra dependencies.
- Copy confirmation: on Copy click, change icon to `<Check />` for 1.5s via `useState` + `setTimeout`.
- Relative time util: parse ISO 8601 strings, compute diff in seconds/minutes/hours/days, return human-readable string. Handle null/undefined gracefully.
- Follow existing feature-based structure: keep changes scoped to their feature directories and `src/components/ui/`.
- Run `bun check` (tsc --noEmit) and `bun test` after changes.
