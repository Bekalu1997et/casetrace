# CASETRACE — Component Inventory

**Branch:** `refactor/interface`
**Scope:** All frontend components as of Refactor 09. Maps proposed redesign onto existing architecture.

All paths relative to `apps/web/`.

---

## 1. Components That Can Be Reused Without Changes

These components are correct, well-scoped, and should not be modified during the redesign.

| Component | File | Notes |
|---|---|---|
| `SourcePanel` | `features/evidence/components/source-panel.tsx` | Correct patient-scoped retrieval, anchor display, version mismatch warning. Reuse as-is. |
| `SourceHighlight` | `features/evidence/components/source-highlight.tsx` | Unicode code-point span highlighting. Correct and tested. |
| `EvidenceExplorer` | `features/evidence/components/evidence-explorer.tsx` | Finding navigator, relationship filter, anchor restoration. Reuse as-is. |
| `HospitalSource` | `features/evidence/components/hospital-source.tsx` | Patient-scoped source inspection page. Reuse as-is. |
| `TaskActivity` | `features/investigations/components/task-activity.tsx` | Task/lead projection with deduplication. Reuse as-is. |
| `Hypotheses` | `features/investigations/components/hypotheses.tsx` | Hypothesis cards with verdict, anchors, alternatives. Reuse as-is. |
| `WorkflowRail` | `features/investigations/components/workflow.tsx` | Stage event projection. Reuse; add status icons in redesign. |
| `ActivitySummary` | `features/investigations/components/activity-summary.tsx` | Recent events panel. Reuse; increase slice count. |
| `ClinicalContext` | `features/investigations/components/clinical-context.tsx` | Record inventory counts. Reuse as-is. |
| `StartInvestigation` | `features/investigations/components/start-investigation.tsx` | Idempotent launch control. Reuse as-is. |
| `InvestigationHistory` | `features/investigations/components/history.tsx` | Paginated history for patient/case. Reuse as-is. |
| `DocumentAsset` | `features/documents/components/document-asset.tsx` | PDF.js + image viewer. Reuse as-is. |
| `ImagingAssets` | `features/imaging/components/imaging-assets.tsx` | Study asset listing. Reuse as-is. |
| `RecordCard` | `features/records/components/record-card.tsx` | Generic clinical record fallback. Reuse as-is. |
| `RecordLinks` | `features/records/components/record-links.tsx` | Source navigation links. Reuse as-is. |
| `EnvironmentBanner` | `components/shared/environment-banner.tsx` | Synthetic data label. Reuse as-is. |
| `LoadingState` | `components/shared/resource-state.tsx` | Reuse; add skeleton variant. |
| `EmptyState` | `components/shared/resource-state.tsx` | Reuse as-is. |
| `ErrorState` | `components/shared/resource-state.tsx` | Reuse as-is. |
| `Panel` | `components/shared/presentation.tsx` | Section wrapper. Reuse as-is. |
| `useInvestigation` | `features/investigations/hooks/use-investigation.ts` | SSE + REST reconciliation. Do not modify. |
| `useEvidenceSelection` | `features/evidence/hooks/use-evidence-selection.ts` | URL-based source selection. Do not modify. |
| `useSource` | `features/evidence/hooks/use-source.ts` | Patient-scoped source retrieval. Do not modify. |
| `useReport` | `features/investigations/hooks/use-report.ts` | Report + state + events. Do not modify. |
| `useChart` | `features/patients/hooks/use-chart.ts` | Patient identity + summary. Do not modify. |
| `useHistory` | `features/investigations/hooks/use-history.ts` | Paginated investigation history. Do not modify. |
| `useResource` | `lib/api/use-resource.ts` | Scoped cancellable reads. Do not modify. |
| `investigationsApi` | `lib/api/investigations.ts` | Typed investigation client. Do not modify. |
| `hospitalApi` | `lib/api/hospital.ts` | Typed hospital client. Do not modify. |
| `toolAuditApi` | `lib/api/tool-audit.ts` | Paginated tool audit client. Do not modify. |
| `catalogApi` | `lib/api/catalog.ts` | Case/patient catalog client. Do not modify. |
| `readInvestigationStream` | `lib/sse/investigation-stream.ts` | SSE reader with CRLF handling. Do not modify. |
| `mergeEvents` | `lib/sse/investigation-stream.ts` | Event deduplication. Do not modify. |
| `evidence/navigation.ts` | `features/evidence/navigation.ts` | Source selection model and grouping. Do not modify. |
| `records/navigation.ts` | `features/records/navigation.ts` | Hospital source href builder. Do not modify. |

---

## 2. Components Needing UX Refinement

These components are functionally correct but need visual or interaction improvements.

### `StatusBadge` — `components/shared/presentation.tsx`

**Current issue:** Only three tones (good/bad/pending) for 10+ distinct statuses. `running`, `queued`, `proposed`, `unresolved`, `cancelled` all render amber.

**Proposed change:** Add distinct tone mapping:
```
running       → blue/teal (new CSS class: status-active)
queued        → neutral grey (new CSS class: status-neutral)
cancelled     → neutral grey with strikethrough text
proposed      → soft blue (new CSS class: status-proposed)
unresolved    → amber (existing status-pending)
verified      → green (existing status-good)
completed     → green (existing status-good)
completed_with_limitations → amber (existing status-pending)
failed        → red (existing status-bad)
rejected      → red (existing status-bad)
```

**Affected routes:** All routes. Low risk — purely additive CSS classes.

---

### `Time` — `components/shared/presentation.tsx`

**Current issue:** Renders raw ISO 8601 strings in monospace font. `2026-10-19T14:32:00Z` is hard to read.

**Proposed change:** Format as `Oct 19, 2026 14:32 UTC` using `Intl.DateTimeFormat`. Keep ISO value in `dateTime` attribute. Add a `compact` prop for table cells that shows `Oct 19, 2026` only.

**Affected routes:** All routes. Medium risk — verify that formatted dates still pass existing timestamp tests.

---

### `FindingCard` — `features/investigations/components/finding-card.tsx`

**Current issue:** Source anchor buttons show only `{source.id} · {relationship}`. No source type label or document title.

**Proposed change:** Add source type label to anchor buttons: `DOC-021 · document · supports`. The source type is available from `anchor.source.type`.

**Secondary issue:** No status icon on the card — color is the only differentiator beyond the badge.

**Proposed change:** Add status icon to card header: ✓ verified, ! proposed/unresolved, ✗ rejected.

**Affected routes:** `/investigations/[id]`, `/investigations/[id]/evidence`, `/investigations/[id]/report`.

---

### `WorkflowRail` — `features/investigations/components/workflow.tsx`

**Current issue:** Stage names and status badges only. No icons, no timestamps shown inline.

**Proposed change:** Add status icons (✓ ● ○ ✗ ⊘) before stage names. Show last recorded timestamp below each stage. Keep existing logic.

**Affected routes:** `/investigations/[id]` left panel.

---

### `ActivitySummary` — `features/investigations/components/activity-summary.tsx`

**Current issue:** Shows only last 4 events (`slice(-4)`).

**Proposed change:** Increase to last 6 events. Add "View full activity →" link that sets the center tab to "Activity".

**Affected routes:** `/investigations/[id]`.

---

### `InvestigationTimeline` — `features/timeline/components/investigation-timeline.tsx`

**Current issue:** No visual distinction between instant-precision and date-only events.

**Proposed change:** Add precision indicator icon next to each event's timestamp display. Use the `event.precision` field already available in `TimelineEvent`.

**Affected routes:** `/investigations/[id]` Timeline tab, `/investigations/[id]/report` Timeline section.

---

### `ClinicalList` — `features/patients/components/clinical-list.tsx`

**Current issue (1):** `has_asset` boolean shown as a raw column in the documents table.
**Proposed change:** Replace with a document type icon column. Map `document_type` to an icon.

**Current issue (2):** Compact mode has no "View all N records →" link.
**Proposed change:** Add a link at the bottom of each compact section pointing to the full tab.

**Current issue (3):** Timeline section does not show precision indicators.
**Proposed change:** Add precision icon to the timestamp column in the timeline table.

**Affected routes:** All patient chart tabs.

---

### `ChartOverview` — `features/patients/components/chart-overview.tsx`

**Current issue:** Six `ClinicalList` components load simultaneously, producing six loading spinners.

**Proposed change:** Load encounters and observations first (most important). Defer medications, documents, diagnoses/symptoms/referrals. Use a two-phase load: primary sections load immediately, secondary sections load after primary sections complete.

**Affected routes:** `/patients/[patientId]` overview tab.

---

### `WorkspaceBreadcrumbs` — `components/layout/workspace-navigation.tsx`

**Current issue:** Only shows two levels: "Hospital overview / {area}".

**Proposed change:** Build a proper breadcrumb that reflects the full path. For `/patients/SYN-001/documents/DOC-021`, show: `Hospital overview / Patient records / SYN-001 / Documents / DOC-021`.

**Affected routes:** All routes.

---

### `InvestigationReportView` — `features/investigations/components/report.tsx`

**Current issue (1):** No table of contents or section anchors.
**Proposed change:** Add a TOC with anchor links at the top of the report. Add `id` attributes to each section heading.

**Current issue (2):** Execution provenance is closed by default.
**Proposed change:** Open by default. Move agent summary (names + tool counts) into the report header.

**Current issue (3):** `execution_mode` shown as raw string.
**Proposed change:** Map to human-readable label.

**Affected routes:** `/investigations/[id]/report`.

---

### `InvestigationDirectory` — `features/investigations/components/directory.tsx`

**Current issue:** Running investigations have no visual differentiation from completed ones.

**Proposed change:** Add a left border accent (teal) to running investigation rows. Add a pulsing dot indicator next to the status badge for running investigations.

**Affected routes:** `/investigations`.

---

## 3. Components Requiring Significant Restructuring

### `InvestigationWorkspace` — `features/investigations/components/workspace.tsx`

**Current issues:**
1. Agent status section in left panel shows only name + badge (no tool counts, no last action)
2. Right panel fallback duplicates findings from center panel
3. No tab state persistence in URL
4. Three-column layout collapses to single column at 1280px (should be two columns at 1024–1279px)

**Proposed restructuring:**
1. Replace the agent status section with a new `AgentBoard` component (see new components below)
2. Replace right panel fallback content with instruction text only
3. Add `?tab=findings` URL parameter for tab state
4. Add intermediate two-column layout at 1024–1279px

**Sensitive areas:** `useInvestigation` hook must not be modified. SSE event handling must not be changed. Evidence selection state must be preserved.

---

### `AgentActivity` — `features/investigations/components/agent-activity.tsx`

**Current issues:**
1. Mixes role summaries (agent cards) with individual execution history and full event log in one component
2. The role summary cards are minimal (name + badge only)
3. The full event log is in the same view as the role summaries

**Proposed restructuring:**
1. Extract role summary cards into new `AgentBoard` component (used in left panel)
2. Keep individual execution history and event log in `AgentActivity` (used in Activity tab only)
3. `AgentActivity` becomes the Activity tab content only

**Sensitive areas:** Event correlation by `agent_run_id` must be preserved. Tool call counting logic must be preserved.

---

### `ChartLayout` — `features/patients/components/chart-layout.tsx`

**Current issue:** Patient header does not show record date range (earliest encounter date).

**Proposed change:** Add earliest encounter date to the header. This requires either a new API field or deriving it from the encounter list. Preferred: add `earliest_encounter_at` to the `PatientSummary` type and backend response.

**Note:** This is a minor backend addition. If not available, derive from the encounter list on the frontend (acceptable for the demo).

---

## 4. New Components Required

### `AgentBoard` (new)

**File:** `features/investigations/components/agent-board.tsx`

**Purpose:** Prominent agent execution status display for the investigation workbench left panel.

**Props:**
```typescript
interface AgentBoardProps {
  agents: Investigation["agents"];
  events: InvestigationEvent[];
}
```

**Renders:** One card per agent with:
- Agent name (humanized, e.g., "Contradiction Investigator")
- Status badge (with new distinct tones)
- Tool call count (derived from events filtered by agent_run_id)
- Last action (most recent tool name from events, humanized)
- Started/completed timestamps (derived from agent.started/completed events)

**Derives from events:** Tool call counts and last actions. Does not require new API endpoints.

---

### `SkeletonLoader` (new)

**File:** `components/shared/skeleton-loader.tsx`

**Purpose:** Skeleton loading states for key views.

**Variants:**
- `SkeletonLoader variant="card"` — grey rectangle with rounded corners
- `SkeletonLoader variant="table" rows={5}` — 5 grey table rows
- `SkeletonLoader variant="metric"` — metric card skeleton
- `SkeletonLoader variant="finding"` — finding card skeleton

**Usage:** Replace `LoadingState` text in patient chart, investigation workspace, and findings list.

---

### `PrecisionIndicator` (new, small)

**File:** `components/shared/precision-indicator.tsx`

**Purpose:** Icon indicating timestamp precision for timeline events.

**Props:** `precision: "instant" | "day" | "unknown"`

**Renders:** ⏱ for instant, 📅 for date-only, ? for unknown. With `aria-label`.

---

### `SectionAnchor` (new, small)

**File:** `components/shared/section-anchor.tsx`

**Purpose:** Anchor link target for report sections.

**Props:** `id: string; label: string`

**Renders:** `<h2 id={id}>` with a `#` anchor link on hover.

---

## 5. Existing Hooks and API Adapters to Preserve

These must not be modified during the redesign. They are tested and correct.

| Hook/Adapter | File | Why preserve |
|---|---|---|
| `useInvestigation` | `features/investigations/hooks/use-investigation.ts` | SSE + REST reconciliation, bounded retry, event deduplication. Tested. |
| `useEvidenceSelection` | `features/evidence/hooks/use-evidence-selection.ts` | URL state, popstate restoration, identifier-only privacy. Tested. |
| `mergeEvents` | `lib/sse/investigation-stream.ts` | Event deduplication by ID + sequence sort. Tested. |
| `readInvestigationStream` | `lib/sse/investigation-stream.ts` | CRLF normalization, fetch-based SSE. Tested. |
| `parseEvent` | `lib/validation/investigation.ts` | Runtime event validation. Tested. |

---

## 6. State Management Concerns

**No new state library should be added.** The existing pattern (scoped `useResource` + `useInvestigation` as SSE owner) is correct and tested.

**Tab state in URL:** Adding `?tab=findings` to the workbench URL is safe. Use `useSearchParams` (Next.js) to read/write. Do not store tab state in a global store.

**Agent board derived state:** Tool call counts and last actions should be derived inside `AgentBoard` from the `events` prop. Do not add new state to `useInvestigation`.

---

## 7. Sensitive Areas — Do Not Break

These areas have specific correctness requirements. Any UI change touching them must be reviewed carefully.

| Area | File | Risk | Constraint |
|---|---|---|---|
| Evidence anchors | `features/evidence/components/source-panel.tsx` | High | `anchor.source_version` and `anchor.source_hash` must be displayed. Version mismatch warning must remain. |
| Patient-scoped source retrieval | `features/evidence/hooks/use-source.ts` | High | All source fetches must go through patient-scoped hospital API. Never fetch by source ID alone. |
| Investigation state recovery | `features/investigations/hooks/use-investigation.ts` | High | REST reconciliation after SSE disconnect must not be broken. Backfill cursor must be preserved. |
| SSE event handling | `lib/sse/investigation-stream.ts` | High | CRLF normalization, unknown event tolerance, and fetch-based reading must not be changed. |
| Source comparison | `features/evidence/navigation.ts` `comparisonSources()` | Medium | Anchor grouping logic for side-by-side comparison must be preserved. |
| Report provenance | `features/investigations/components/report.tsx` | Medium | Report must use backend data only. No client-side conclusions. |
| Tool audit integrity | `features/investigations/components/tool-inspector.tsx` | Medium | "Full result payload unavailable" notice must remain. Allowlisted parameters only. |
| Finding status lifecycle | `features/investigations/components/finding-card.tsx` | Medium | `proposed` vs `verified` distinction must remain visually clear. |
