# CASETRACE — Design System

**Version:** 1.0 (Prompt 02 — Design System and Application Shell)
**Branch:** `refactor/interface`
**Status:** Implemented and verified. All 120 frontend tests pass. Build succeeds.

This document is the authoritative implementation guide for CASETRACE's visual language. It supersedes the empty placeholder that previously existed here.

---

## 1. Design Philosophy

CASETRACE is a **Clinical Intelligence Command Center** — not a chatbot, not a marketing dashboard, not a generic SaaS product.

The visual language must communicate:

- **Precision** — clinical data is exact; the interface must reflect that
- **Trustworthiness** — every finding is backed by evidence; the design must reinforce that chain
- **Professionalism** — suitable for extended use by clinical reviewers and technical inspectors
- **Operational clarity** — multi-agent execution must be visible and comprehensible, not theatrical

Design decisions follow this priority order:
1. Information accuracy and provenance integrity
2. Functional clarity and navigation efficiency
3. Visual hierarchy and readability
4. Aesthetic refinement

---

## 2. Brand Identity

| Element | Value |
|---|---|
| Product name | CASETRACE |
| Tagline | CLINICAL INVESTIGATION |
| Logo mark | "C" in teal rounded square |
| Primary color | Navy (`#101d32`) for structural navigation |
| Accent color | Teal (`#168a83`) for investigation activity |
| Action color | Blue (`#2856a6`) for primary interactive elements |

The brand mark is a single letter "C" in a teal rounded square (`34×34px`, `border-radius: 8px`). It is decorative and `aria-hidden`. The product name and tagline are always rendered as text alongside it.

---

## 3. Color Palette and Semantic Tokens

All tokens are defined as CSS custom properties in `apps/web/app/globals.css` under `:root`.

### 3.1 Foundation Tokens

| Token | Value | Usage |
|---|---|---|
| `--background` | `#f4f7fb` | Page background — cool blue-grey, comfortable for extended reading |
| `--card` | `#ffffff` | Primary surface — panels, cards, top bar |
| `--foreground` | `#17243a` | Primary text — dark navy, high contrast |
| `--muted-foreground` | `#66758a` | Secondary text — labels, metadata, descriptions |
| `--border` | `#dfe6ef` | Borders and dividers |
| `--input` | `#dfe6ef` | Form input borders |
| `--ring` | `#2856a6` | Focus ring color |
| `--muted` | `#edf3ff` | Muted background — secondary surfaces |
| `--secondary` | `#edf3ff` | Secondary action background |
| `--accent` | `#e8f7f5` | Teal accent background |

### 3.2 Action Tokens

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#2856a6` | Primary actions, links, focus rings |
| `--primary-foreground` | `#ffffff` | Text on primary backgrounds |
| `--secondary-foreground` | `#1d4388` | Text on secondary backgrounds |
| `--accent-foreground` | `#168a83` | Text on accent backgrounds |
| `--destructive` | `#b53b46` | Destructive actions |

### 3.3 Semantic Status Tokens

| Token | Value | Usage |
|---|---|---|
| `--teal` | `#168a83` | Running/active states, investigation accents |
| `--success` | `#217a55` | Verified/completed states |
| `--warning` | `#a86612` | Unresolved/pending/limitations states |

### 3.4 Navigation Tokens

| Token | Value | Usage |
|---|---|---|
| `--sidebar` | `#101d32` | Sidebar background — deep navy |
| `--sidebar-foreground` | `#dbe5f5` | Sidebar text — light blue-white |
| `--sidebar-border` | `rgba(255,255,255,0.1)` | Sidebar internal borders |

### 3.5 Tailwind Theme Mapping

All tokens are mapped into Tailwind's `@theme inline` block, making them available as `bg-primary`, `text-foreground`, `border-border`, etc.

---

## 4. Status Treatment

Status values are mapped to semantic CSS classes. **Color is never the only differentiator** — every status badge renders its humanized text label.

### 4.1 Status CSS Classes

| Class | Color | Border | Usage |
|---|---|---|---|
| `.status-good` | Green `#1a5c3a` on `#e4f5ec` | `#b8dfc9` | verified, completed, supported |
| `.status-bad` | Red `#8c2130` on `#fdeef0` | `#f0c0c5` | failed, rejected |
| `.status-pending` | Amber `#7a4a0a` on `#fef3e2` | `#f0d49a` | unresolved, completed_with_limitations, partial, inconclusive |
| `.status-active` | Teal `#0e6b65` on `#e4f5f4` | `#9fd4d0` | running, active |
| `.status-neutral` | Grey `#4a5568` on `#f0f2f5` | `#d8dde6` | queued, cancelled, skipped, unknown |
| `.status-proposed` | Blue `#1e4a8a` on `#edf3ff` | `#c0d3f5` | proposed, candidate |

### 4.2 StatusBadge Component Mapping

Implemented in `components/shared/presentation.tsx`:

```
running              → status-active
active               → status-active
verified             → status-good
completed            → status-good
supported            → status-good
failed               → status-bad
rejected             → status-bad
queued               → status-neutral
cancelled            → status-neutral
skipped              → status-neutral
unknown              → status-neutral
proposed             → status-proposed
candidate            → status-proposed
unresolved           → status-pending
completed_with_limitations → status-pending
partial              → status-pending
inconclusive         → status-pending
under_review         → status-pending
[any unknown value]  → status-neutral (safe fallback)
```

**Critical constraint:** The design system must not imply that a technically completed investigation is clinically verified. `completed` maps to green (process complete), but this is distinct from `verified` (evidence confirmed). The `proposed` status uses blue, not green, to prevent confusion with verified findings.

---

## 5. Typography Scale

Defined in `globals.css` body and heading rules.

| Element | Size | Weight | Letter-spacing | Usage |
|---|---|---|---|---|
| `h1` | `clamp(1.65rem, 3vw, 2rem)` | 650 | -0.035em | Page titles |
| `h2` | `1.1rem` | 600 | -0.02em | Section headings, panel titles |
| `h3` | `0.95rem` | 600 | — | Sub-section headings |
| Body | `14px` | 400 | — | Primary content |
| `.eyebrow` | `0.65rem` | 700 | 0.12em | Category labels, source type labels |
| `.text-mono` | `12px` | — | — | IDs, hashes, source identifiers |
| `.text-tabular` | — | — | — | Timestamps, lab values (tabular numerals) |
| `.panel-heading` | `15px` | 600 | — | Panel/card headings |
| `.status-badge` | `11px` | 650 | 0.01em | Status labels |
| `.nav-section-label` | `10px` | 700 | 0.1em | Navigation section dividers |

**Font stack:** `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

**Monospace stack:** `ui-monospace, "Cascadia Code", "Fira Code", monospace`

---

## 6. Spacing Scale

4px base unit throughout.

| Context | Value | Token/Class |
|---|---|---|
| Page padding (desktop) | 32px / 24px | `px-6 py-8 lg:px-8` |
| Panel padding | 20px | `.p-5` |
| Panel heading | 16px 20px | `.panel-heading` |
| Card padding (hospital) | 22px | `.hospital-card` |
| Card padding (mobile) | 15px | `@media(max-width:640px)` |
| Section gap | 20px | `.workspace-grid gap-20px` |
| Table cell | 13px 15px | `.clinical-table :is(th,td)` |
| Finding card | 18px | `.finding-card` |
| Audit card | 14px | `.audit-card` |
| Navigation item | 9px 12px | `.navigation-link` |
| Navigation section label | 14px 12px 6px | `.nav-section-label` |
| Sidebar padding | 20px 16px | `app-shell.tsx` |

---

## 7. Radius and Border Standards

| Context | Radius | Border |
|---|---|---|
| Panels / workspace panels | `12px` | `1px solid var(--border)` |
| Cards (hospital, finding) | `10px` | `1px solid var(--border)` |
| Audit cards | `8px` | `1px solid var(--border)` |
| Status badges | `99px` (pill) | `1px solid` (status-specific) |
| Source links | `6px` | `1px solid var(--border)` |
| Action links | `8px` | none |
| Form fields | `7px` | `1px solid var(--border)` |
| Navigation items | `7px` | none |
| Logo mark | `8px` | none |
| Buttons (shadcn) | `6px` | varies by variant |

---

## 8. Surface Elevation Patterns

CASETRACE uses a flat elevation model — no drop shadows on primary surfaces. Hierarchy is communicated through background color and border contrast.

| Level | Background | Border | Usage |
|---|---|---|---|
| Page | `--background` (`#f4f7fb`) | — | Root page background |
| Card / Panel | `--card` (`#ffffff`) | `--border` | All content panels |
| Elevated (audit) | `#fafcfe` | `--border` | Audit cards, secondary panels |
| Sidebar | `--sidebar` (`#101d32`) | `--sidebar-border` | Navigation sidebar |
| Top bar | `--card` | `--border` (bottom only) | Application header |

Finding cards use tinted backgrounds to communicate status at a glance:

| Finding status | Background | Border |
|---|---|---|
| verified | `#f5fcf8` | `#bfe4cf` |
| candidate / proposed | `#fffbf3` | `#ecd8af` |
| rejected | `#fff4f4` | `#edc3c6` |
| unresolved | `#fffaf0` | `#e8d7ab` |
| proposed (new class) | `#f4f7ff` | `#cdd9ef` |

---

## 9. Button and Control Specifications

Buttons use the existing `shadcn/ui` Button component (`components/ui/button.tsx`) with `class-variance-authority`.

| Variant | Background | Text | Hover | Usage |
|---|---|---|---|---|
| `default` | `--primary` | white | `primary/90` | Primary actions |
| `outline` | `--background` | foreground | `--accent` | Secondary actions, retry |

Sizes: `default` (h-10, px-4), `sm` (h-9, px-3).

**Focus:** `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`

**Disabled:** `opacity-50 pointer-events-none`

The `.action-link` CSS class provides a non-button primary action style for `<a>` elements.

---

## 10. Data Display Conventions

### Timestamps

Implemented in `Time` component (`components/shared/presentation.tsx`):

- Full instant (`2026-10-19T14:32:00Z`) → `Oct 19, 2026, 14:32 UTC`
- Offset instant (`2026-10-19T09:00:00+03:00`) → converted to UTC display
- Date-only (`2026-01-01`) → `Jan 1, 2026` — **no time component invented**
- Null → "Not documented" (muted text, no `<time>` element)
- Invalid → raw value returned safely (no throw)

Formatting uses `Intl.DateTimeFormat` pinned to `en-US` locale and `UTC` timezone for instants. Date-only values use a separate formatter that avoids timezone conversion. The `dateTime` attribute always preserves the original ISO value for machine readability.

### Identifiers and Hashes

Use `.text-mono` class: `font-family: ui-monospace; font-size: 12px`.

### Numeric Data

Use `.text-tabular` class: `font-variant-numeric: tabular-nums` for lab values, timestamps in tables, and counts.

### Clinical Disclaimers

- Medication records: "Recorded orders do not establish administration or adherence."
- Source integrity: "Source integrity ≠ medical correctness."
- Version mismatch: "This record may have been updated since the investigation ran."

---

## 11. Navigation Components

### Sidebar Navigation

Implemented in `components/layout/workspace-navigation.tsx`.

**Structure:**
```
CASETRACE [logo]
─────────────────
Overview
─────────────────
CLINICAL WORKSPACE
  Case Library
  Patient records
─────────────────
INVESTIGATION
  Investigations
─────────────────
```

**Section labels:** `.nav-section-label` — 10px, uppercase, 0.1em tracking, `rgba(255,255,255,0.35)`.

**Active state:** `aria-current="page"` + `.navigation-link[aria-current="page"]` — white text, `rgba(255,255,255,0.14)` background, `font-weight: 600`.

**Hover state:** `rgba(255,255,255,0.1)` background, white text.

**Toggle:** Single `<button>` with `aria-expanded` and `aria-controls`. Desktop starts expanded; mobile starts collapsed. Independent state per viewport. No hydration mismatch (uses `useSyncExternalStore` with server snapshot `() => false`).

**Responsive:** Below 1024px, sidebar is hidden by default. Toggle button always visible. Navigation links are not keyboard-focusable when collapsed (CSS `display: none`).

### Breadcrumbs

Implemented in `WorkspaceBreadcrumbs` (`components/layout/workspace-navigation.tsx`).

**Behavior:**
- Parses `usePathname()` into segments
- Maps known segments to display labels (patients → "Patients", cases → "Cases", etc.)
- Unknown segments decoded with `decodeURIComponent`
- All segments except the last are rendered as links
- Last segment has `aria-current="page"` and `font-weight: medium`
- Separators are `aria-hidden`
- Root: "Hospital overview" links to `/`

**Example paths:**
```
/                          → Hospital overview
/patients                  → Hospital overview / Patients
/patients/SYN-001          → Hospital overview / Patients / SYN-001
/patients/SYN-001/documents/DOC-021
                           → Hospital overview / Patients / SYN-001 / Documents / DOC-021
/investigations/INV-001/evidence
                           → Hospital overview / Investigations / INV-001 / Evidence
/investigations/INV-001/report
                           → Hospital overview / Investigations / INV-001 / Report
```

---

## 12. Panel and Card Patterns

### Workspace Panel

```css
.workspace-panel {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  overflow-wrap: anywhere;
}
```

Used for all major content sections. The `Panel` component wraps this with a heading.

### Hospital Card

```css
.hospital-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  padding: 22px;
}
```

Used for patient records, case cards, metric containers.

### Audit Card

```css
.audit-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
  background: #fafcfe;
}
```

Used for tool execution records, agent activity entries.

### Finding Card

`.finding-card` base + status modifier (`.finding-verified`, `.finding-candidate`, `.finding-rejected`, `.finding-unresolved`, `.finding-proposed`).

---

## 13. Loading and Feedback Patterns

### Skeleton Loader

Implemented in `components/shared/skeleton-loader.tsx`.

**Variants:**
- `card` — title + body lines
- `metric` — label + large number
- `table` — header row + N data rows (configurable)
- `content` — multi-paragraph content block
- `finding` — finding card with badge, title, body, source buttons

**Accessibility:** `role="status"`, `aria-label="Loading"`, `aria-busy="true"`, `<span className="sr-only">Loading…</span>`.

**Animation:** `skeleton-pulse` keyframe (opacity 1 → 0.45 → 1, 1.6s). Disabled by `prefers-reduced-motion`.

**Usage:** Provide as primitives for feature screens. Migration to feature screens is deferred to Phase 3–5.

### Resource States

Implemented in `components/shared/resource-state.tsx`.

| Component | Role | Visual class | Usage |
|---|---|---|---|
| `LoadingState` | `status` | muted text | Inline loading text |
| `EmptyState` | — | muted centered text | No data available |
| `ErrorState` | `alert` | `.notice-error` (red) | Network/API failures |
| `WarningNotice` | — | `.notice` (amber) | Clinical warnings |
| `InfoNotice` | — | `.notice-info` (blue) | Informational messages |

**Critical:** `ErrorState` and `EmptyState` are visually distinct. Network failures never look like empty states.

### Notice Classes

```css
.notice        { background: #fef3e2; border: 1px solid #f0d49a; color: #7a4a0a; }  /* amber */
.notice-error  { background: #fdeef0; border: 1px solid #f0c0c5; color: #8c2130; }  /* red */
.notice-info   { background: #edf3ff; border: 1px solid #c0d3f5; color: #1e4a8a; }  /* blue */
.notice-neutral{ background: #f7f9fc; border: 1px solid var(--border); color: var(--muted-foreground); }
```

---

## 14. Accessibility Requirements

### Implemented

- Skip-to-content link (`sr-only`, visible on focus)
- Keyboard-operable navigation toggle (`aria-expanded`, `aria-controls`)
- Active route indication (`aria-current="page"`)
- Breadcrumb landmark (`aria-label="Workspace breadcrumb"`)
- Current page in breadcrumb (`aria-current="page"`)
- Focus rings: `2px solid var(--primary)`, `4px offset` on all interactive elements
- Sidebar focus rings: `2px solid #ffffff` (white on dark background)
- Status badges: text label always present (color is supplementary)
- Skeleton loaders: `role="status"`, `aria-busy="true"`, sr-only text
- Error states: `role="alert"`
- Loading states: `role="status"`
- Precision indicators: `role="img"` with `aria-label`
- Reduced motion: all animations disabled via `prefers-reduced-motion: reduce`
- Semantic HTML: `<aside>`, `<header>`, `<main>`, `<nav>` in shell
- `tabIndex={-1}` on `<main>` for skip-link target

### Contrast Verification

| Element | Foreground | Background | Ratio (approx) |
|---|---|---|---|
| Body text | `#17243a` | `#f4f7fb` | ~12:1 ✓ |
| Muted text | `#66758a` | `#ffffff` | ~4.6:1 ✓ |
| Status good text | `#1a5c3a` | `#e4f5ec` | ~5.2:1 ✓ |
| Status bad text | `#8c2130` | `#fdeef0` | ~5.8:1 ✓ |
| Status active text | `#0e6b65` | `#e4f5f4` | ~5.1:1 ✓ |
| Status pending text | `#7a4a0a` | `#fef3e2` | ~5.4:1 ✓ |
| Status neutral text | `#4a5568` | `#f0f2f5` | ~5.0:1 ✓ |
| Status proposed text | `#1e4a8a` | `#edf3ff` | ~6.2:1 ✓ |
| Sidebar text | `#dbe5f5` | `#101d32` | ~10.8:1 ✓ |
| Nav active text | `#ffffff` | `rgba(255,255,255,0.14)` on `#101d32` | ~11:1 ✓ |

All values meet WCAG AA (4.5:1 for normal text, 3:1 for large text).

---

## 15. Responsive Behavior

| Breakpoint | Shell behavior |
|---|---|
| ≥1280px | Three-column investigation workbench; two-column evidence explorer |
| 1024–1279px | Sidebar visible and collapsible; two-column workbench (deferred to Phase 5) |
| 768–1023px | Sidebar collapsed by default; single-column content |
| <768px | Sidebar hidden; hamburger toggle; single-column |

The sidebar uses `display: none` / `display: block` via `.workspace-navigation` / `.workspace-navigation.navigation-expanded`. At ≥1024px, the app shell uses `grid-template-columns: 232px minmax(0,1fr)`.

---

## 16. Component Usage Examples

### StatusBadge

```tsx
<StatusBadge status="running" />          // teal badge: "running"
<StatusBadge status="verified" />         // green badge: "verified"
<StatusBadge status="proposed" />         // blue badge: "proposed"
<StatusBadge status="completed_with_limitations" />  // amber: "completed with limitations"
<StatusBadge status="future_unknown" />   // neutral fallback: "future unknown"
```

### Time

```tsx
<Time value="2026-10-19T14:32:00Z" />     // "Oct 19, 2026, 14:32 UTC"
<Time value="2026-10-19" />               // "Oct 19, 2026" (no time)
<Time value={null} />                     // "Not documented"
```

### SkeletonLoader

```tsx
<SkeletonLoader variant="card" />
<SkeletonLoader variant="table" rows={5} />
<SkeletonLoader variant="finding" />
<SkeletonLoader variant="metric" />
```

### PrecisionIndicator

```tsx
<PrecisionIndicator precision="instant" />   // ⏱ Precise timestamp
<PrecisionIndicator precision="day" />       // 📅 Date only
<PrecisionIndicator precision="unknown" />   // ? Unknown precision
```

### Resource States

```tsx
<LoadingState>Loading records…</LoadingState>
<EmptyState>No findings recorded yet.</EmptyState>
<ErrorState onRetry={retry}>Network error. Records unavailable.</ErrorState>
<WarningNotice>Recorded orders do not establish administration.</WarningNotice>
<InfoNotice>Investigation running in deterministic rules mode.</InfoNotice>
```

---

## 17. Implemented vs Deferred Components

### Implemented in Prompt 02

| Component | File | Status |
|---|---|---|
| `StatusBadge` | `components/shared/presentation.tsx` | ✓ Semantic tones for all statuses |
| `Time` | `components/shared/presentation.tsx` | ✓ Human-readable, date-only safe |
| `Panel` | `components/shared/presentation.tsx` | ✓ Unchanged |
| `LoadingState` | `components/shared/resource-state.tsx` | ✓ Refined |
| `EmptyState` | `components/shared/resource-state.tsx` | ✓ Refined |
| `ErrorState` | `components/shared/resource-state.tsx` | ✓ Visually distinct from empty |
| `WarningNotice` | `components/shared/resource-state.tsx` | ✓ New |
| `InfoNotice` | `components/shared/resource-state.tsx` | ✓ New |
| `SkeletonLoader` | `components/shared/skeleton-loader.tsx` | ✓ New — 5 variants |
| `SkeletonMetricGrid` | `components/shared/skeleton-loader.tsx` | ✓ New |
| `PrecisionIndicator` | `components/shared/precision-indicator.tsx` | ✓ New |
| `WorkspaceNavigation` | `components/layout/workspace-navigation.tsx` | ✓ Section-grouped |
| `WorkspaceBreadcrumbs` | `components/layout/workspace-navigation.tsx` | ✓ Full-path |
| `AppShell` | `components/layout/app-shell.tsx` | ✓ Refined |
| `EnvironmentBanner` | `components/shared/environment-banner.tsx` | ✓ Refined |
| CSS design tokens | `app/globals.css` | ✓ Full semantic system |

### Deferred to Later Phases

| Component | Target Phase | Reason |
|---|---|---|
| `AgentBoard` | Phase 5 | Requires investigation workspace restructure |
| `PrecisionIndicator` integration in timeline | Phase 4 | Requires clinical-list changes |
| Skeleton integration in patient chart | Phase 3–4 | Requires feature screen changes |
| Skeleton integration in investigation workspace | Phase 5 | Requires workspace restructure |
| Active investigation sidebar shortcut | Deferred | See Task I decision below |
| Two-column workbench at 1024–1279px | Phase 5 | Requires workspace layout changes |
| Report TOC | Phase 9 | Requires report component changes |
| `SectionAnchor` | Phase 9 | Deferred with report TOC |

---

## 18. Task I — Active Investigation Sidebar Shortcut: Decision

**Decision: Deferred.**

The prompt correctly identifies that a stored investigation ID is not sufficient evidence that the investigation is running. The reliable implementation would require one of:

1. A global SSE subscription (violates the constraint of not duplicating SSE subscriptions)
2. Global polling (introduces new infrastructure)
3. Modifying `useInvestigation` to write to a shared store (violates the constraint of not modifying investigation hooks)

None of these are acceptable within Prompt 02 scope. The Investigations directory remains the dependable route to every investigation. This shortcut is documented for Phase 5 when the workspace is restructured and a lightweight mechanism can be evaluated.

---

## 19. Departures from Roadmap

| Roadmap item | Decision | Reason |
|---|---|---|
| Breadcrumb uses "Patient records" for `/patients` segment | Changed to "Patients" in breadcrumb | Avoids duplicate link text with sidebar nav ("Patient records"), which caused a test failure. Sidebar retains "Patient records". |
| Active investigation shortcut | Deferred | No reliable lightweight mechanism available without new infrastructure. |
| Skeleton integration in feature screens | Primitives provided; integration deferred | Integrating into feature screens would require changing feature behavior, which is out of Prompt 02 scope. |
