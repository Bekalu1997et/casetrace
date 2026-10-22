# CASETRACE — UI/UX Refinement Roadmap

**Branch:** `refactor/interface`
**Sequence:** 10 implementation phases following the completed audit (Prompt 01).

---

## Phase 1 — UI/UX Audit and Design Blueprint ✓ COMPLETE

**Objective:** Establish the complete design architecture before any implementation.

**Deliverables (this prompt):**
- `ui-design/ux-audit.md` — prioritized findings matrix
- `ui-design/information-architecture.md` — navigation hierarchy and screen map
- `ui-design/screen-specifications.md` — per-screen layout and interaction specs
- `ui-design/multi-agent-ux.md` — visualization feasibility matrix
- `ui-design/component-inventory.md` — component mapping and sensitive areas
- `ui-design/refinement-roadmap.md` — this document
- `ui-design/ui-design.md` — authoritative design blueprint

**Status:** Complete. No application code was modified.

---

## Phase 2 — Design System and Application Shell

**Objective:** Establish the visual foundation and improve the global shell before touching any feature screens.

**Affected routes:** All routes (shell changes are global).

**Affected components:**
- `components/shared/presentation.tsx` — `StatusBadge`, `Time`
- `components/layout/app-shell.tsx` — shell layout
- `components/layout/workspace-navigation.tsx` — breadcrumbs, active investigation shortcut
- `components/shared/resource-state.tsx` — add skeleton variant
- `app/globals.css` — new status tone CSS classes, skeleton animation

**Planned deliverables:**
1. `StatusBadge` extended with distinct tones for all statuses (running, queued, proposed, cancelled)
2. `Time` component formats ISO timestamps as human-readable strings
3. `WorkspaceBreadcrumbs` builds full path breadcrumb from pathname
4. Active investigation shortcut in sidebar (shown when a running investigation exists — requires a lightweight global check or sessionStorage hint)
5. `SkeletonLoader` component with card, table, metric, and finding variants
6. `PrecisionIndicator` component for timestamp precision icons
7. New CSS classes: `status-active`, `status-neutral`, `status-proposed`

**Dependencies:** Phase 1 (this audit).

**Technical risks:**
- `Time` formatting: `Intl.DateTimeFormat` output varies by locale. Pin to `en-US` with explicit timezone display.
- Breadcrumb: requires parsing the pathname. Must handle encoded IDs correctly.
- Active investigation shortcut: requires a lightweight mechanism to know if an investigation is running. Use `sessionStorage` key set by `useInvestigation` on mount, cleared on terminal state.

**Acceptance criteria:**
- All status badges show distinct visual treatment for each status group
- Timestamps display as "Oct 19, 2026 14:32 UTC" throughout the application
- Breadcrumb shows full path for all routes
- Skeleton loaders replace text loading states in patient chart and investigation workspace
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass

**Verification:** Visual inspection at 1440px and 1024px. Existing 84 frontend tests must pass.

---

## Phase 3 — Case Library and Clinical Dashboard

**Objective:** Improve the overview dashboard and case library to make the demo entry point clear and informative.

**Affected routes:** `/`, `/cases`, `/cases/[caseId]`

**Affected components:**
- `features/dashboard/components/overview.tsx`
- `features/cases/components/case-library.tsx`
- `features/dashboard/hooks/use-overview.ts`

**Planned deliverables:**
1. Dashboard "Start Investigation" CTA links to `/investigations/new`
2. Featured case card pinned to CASE-001 (or first imported case) with visual priority
3. Case cards show `latest_encounter_at` and a rough date range
4. Case cards show modality badges (data-driven, existing field)
5. Case library filter: status filter applies on change (not only on submit)
6. Case detail shows full record inventory with formatted dates
7. Overview metric cards: remove derived encounter/document counts when `has_more` is true; show "N+ cases" instead

**Dependencies:** Phase 2 (design system tokens).

**Technical risks:**
- Pinning CASE-001: if CASE-001 is not imported, the featured card should fall back to the first imported case gracefully.
- Date range on case card: `earliest_encounter_at` is not currently in the `CaseOverview` type. Either add it to the backend response or derive it from `latest_encounter_at` minus a rough span (not ideal). Preferred: add `earliest_encounter_at` to the catalog API response.

**Acceptance criteria:**
- Dashboard CTA navigates directly to `/investigations/new`
- Case cards show encounter date range
- Modality badges are data-driven and only show present categories
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass

---

## Phase 4 — Patient Record and Clinical Source Explorer

**Objective:** Make the patient chart a credible clinical record viewer with readable data and clear navigation.

**Affected routes:** `/patients`, `/patients/[patientId]` and all sub-routes, `/patients/[patientId]/documents/[documentId]`

**Affected components:**
- `features/patients/components/chart-layout.tsx`
- `features/patients/components/chart-overview.tsx`
- `features/patients/components/clinical-list.tsx`
- `features/patients/components/patient-directory.tsx`
- `features/documents/components/document-detail.tsx`

**Planned deliverables:**
1. Patient header shows record date range (earliest + latest encounter)
2. Patient directory rows show encounter count and latest encounter date
3. Patient directory rows have a secondary "Investigate" action
4. Overview tab: two-phase loading (encounters + observations first, rest deferred)
5. Compact sections have "View all N records →" links
6. Timeline tab: precision indicator icons on each event row
7. Documents tab: replace `has_asset` boolean with document type icon
8. Document viewer: left panel populated with same-encounter documents
9. Clinical note viewer: parse and render structured sections (Chief Complaint, HPI, Assessment, Plan) when present
10. Encounter detail: add "Back to encounters" breadcrumb

**Dependencies:** Phase 2 (design system), Phase 3 (case library patterns).

**Technical risks:**
- Clinical note section parsing: use a simple regex-based parser for common section headers. Must not fail on unstructured notes — fall back to plain text rendering.
- Document left panel: requires fetching documents filtered by `encounter_id`. This endpoint already exists (`GET /api/hospital/v1/patients/[id]/documents?encounter_id=X`).
- Two-phase loading: use `useEffect` with a dependency on primary section load completion. Must not break existing `useResource` cancellation.

**Acceptance criteria:**
- Patient header shows full record date range
- Timeline events show precision icons
- Document viewer has populated left panel for documents with an encounter
- Clinical notes with standard sections render with visual hierarchy
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass

---

## Phase 5 — Investigation Command Center

**Objective:** Transform the investigation workbench into a professional command center with clear agent visibility and improved layout.

**Affected routes:** `/investigations`, `/investigations/new`, `/investigations/[id]`

**Affected components:**
- `features/investigations/components/workspace.tsx`
- `features/investigations/components/agent-activity.tsx`
- `features/investigations/components/workflow.tsx`
- `features/investigations/components/activity-summary.tsx`
- `features/investigations/components/directory.tsx`
- `features/investigations/components/new-investigation.tsx`

**New components:**
- `features/investigations/components/agent-board.tsx`

**Planned deliverables:**
1. New `AgentBoard` component: prominent agent cards with tool counts and last action
2. `WorkflowRail` updated with status icons and inline timestamps
3. `ActivitySummary` increased to 6 events with "View full activity →" link
4. Workspace right panel fallback replaced with instruction text only
5. Workspace tab state persisted in URL (`?tab=findings`)
6. Workspace breadcrumb includes investigation ID
7. Two-column layout at 1024–1279px (context + main; evidence as drawer)
8. Investigation directory: running rows have teal left border accent
9. New investigation: objective selector (defaulting to `full_record_investigation`)
10. New investigation: confirmation summary before submit
11. Findings tab: badge count on tab when new findings arrive via SSE

**Dependencies:** Phase 2 (design system), Phase 4 (patient chart patterns).

**Technical risks:**
- `AgentBoard` derived state: tool call counts derived from events array. Must handle large event arrays efficiently (use `useMemo`).
- Tab state in URL: use `useSearchParams` from Next.js. Must not conflict with existing source selection URL params.
- Two-column layout: CSS grid change at 1024–1279px. Must not break the existing three-column layout at 1280px+.
- Findings tab badge: requires tracking "last seen" finding count. Use `useRef` to store previous count.

**Acceptance criteria:**
- Agent cards show tool call counts and last action
- Workflow rail shows status icons
- Tab state survives navigation within the workbench
- Two-column layout works at 1024–1279px without overflow
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass

---

## Phase 6 — Multi-Agent Execution Visualization

**Objective:** Implement the hybrid orchestration visualization (Approach C from `multi-agent-ux.md`).

**Affected routes:** `/investigations/[id]` Activity tab

**Affected components:**
- `features/investigations/components/agent-activity.tsx` (restructured)
- `features/investigations/components/agent-board.tsx` (from Phase 5)

**Planned deliverables:**
1. `AgentActivity` restructured: role summaries moved to `AgentBoard` (left panel); `AgentActivity` becomes Activity tab content only
2. Activity tab layout: Tool Inspector (paginated) → Individual executions → Full event history
3. Individual execution cards: show agent run ID, tool call count, start/end times, error details
4. Full event history: bounded to last 50 with "Show earlier" control and shown/total count
5. Tasks & leads tab: hidden for baseline runs (show "Deterministic rules mode — adaptive task planning was not active")
6. Tool inspector: improve parameter display (key-value pairs, not raw object)

**Dependencies:** Phase 5 (agent board, workspace restructure).

**Technical risks:**
- Restructuring `AgentActivity`: must preserve all existing event correlation logic (starts/ends maps, call counts). Extract carefully.
- Tasks & leads visibility: detect baseline vs. adaptive by checking for presence of `task.*` events. If none exist after investigation completes, hide the tab.

**Acceptance criteria:**
- Activity tab shows three clear sections: tool inspector, individual executions, event history
- Tasks & leads tab hidden for baseline runs
- All existing agent activity tests pass
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass

---

## Phase 7 — Agent Activity and Tool Inspector

**Objective:** Make tool execution details readable and useful for demo inspection.

**Affected routes:** `/investigations/[id]` Activity tab

**Affected components:**
- `features/investigations/components/tool-inspector.tsx`
- `features/investigations/components/agent-activity.tsx`

**Planned deliverables:**
1. Tool inspector: format duration as "412 ms" or "1.2 s" (not raw milliseconds for long durations)
2. Tool inspector: group tool calls by agent execution (collapsible per agent run)
3. Tool inspector: source reference buttons show source type label alongside ID
4. Individual execution cards: show agent role description (e.g., "Contradiction Investigator — targeted evidence retrieval")
5. Event history: event type icons (✓ completed, ● started, ✗ failed, ! finding)
6. Event history: filter by event category (agent events, tool events, finding events, stage events)

**Dependencies:** Phase 6 (activity restructure).

**Technical risks:**
- Agent role descriptions: map agent names to descriptions. Hardcode for the known 6 agents. Must not fail for unknown agent names.
- Tool grouping by agent run: requires grouping the paginated tool list by `agent_run_id`. Handle pagination correctly — a group may span pages.

**Acceptance criteria:**
- Tool durations display in human-readable format
- Tool calls are grouped by agent execution
- Event history has category filter
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass

---

## Phase 8 — Findings, Evidence, and Investigation Timeline

**Objective:** Make the finding-to-evidence-to-source navigation seamless and visually clear.

**Affected routes:** `/investigations/[id]`, `/investigations/[id]/evidence`

**Affected components:**
- `features/investigations/components/finding-card.tsx`
- `features/evidence/components/evidence-explorer.tsx`
- `features/timeline/components/investigation-timeline.tsx`

**Planned deliverables:**
1. `FindingCard`: source anchor buttons show type label (`DOC-021 · document · supports`)
2. `FindingCard`: status icon added to card header (✓ ✗ ! ?)
3. `FindingCard`: verification checks rendered as a checklist with pass/fail icons
4. Evidence explorer: relationship filter defaults to "contradicts" for verified timeline_contradiction findings
5. Evidence explorer: findings navigator has visible focus ring for keyboard users
6. Evidence explorer: shell breadcrumb updated to reflect evidence explorer context
7. Investigation timeline: precision indicator icons on each event
8. Investigation timeline: "Compare evidence" button more prominent for findings with multiple anchors
9. `SourcePanel`: version mismatch warning reworded for clarity

**Dependencies:** Phase 5 (workspace layout), Phase 2 (precision indicator component).

**Technical risks:**
- Default relationship filter: must not override user's explicit filter selection. Only apply default on initial finding selection.
- Source panel wording: must preserve the technical accuracy of the version/hash mismatch notice while making it readable.

**Acceptance criteria:**
- Source anchor buttons show type labels
- Finding cards have status icons
- Evidence explorer relationship filter defaults correctly for timeline_contradiction findings
- Timeline events show precision icons
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass

---

## Phase 9 — Investigation Report and Discovery Presentation

**Objective:** Make the final report a professional, navigable evidence document.

**Affected routes:** `/investigations/[id]/report`

**Affected components:**
- `features/investigations/components/report.tsx`
- `features/investigations/components/source-index.tsx`

**Planned deliverables:**
1. Report table of contents with anchor links (sticky on desktop)
2. Section `id` attributes on all report sections
3. Execution provenance open by default; agent summary in report header
4. `execution_mode` mapped to human-readable label
5. Report header shows agent count and total tool calls (derived from events)
6. Source index: show source type icon alongside each entry
7. Print CSS: TOC hidden in print; section headings use `break-after: avoid`
8. `SectionAnchor` component for consistent section heading + anchor pattern

**Dependencies:** Phase 8 (finding card improvements).

**Technical risks:**
- Sticky TOC: must not overlap content on scroll. Use `position: sticky; top: 0` with appropriate z-index. Must be hidden in print.
- Agent summary in header: derive from `events` array (agent.completed events). Must handle investigations with no agent events gracefully.

**Acceptance criteria:**
- Report has working TOC with anchor links
- Execution provenance is open by default
- Execution mode shows human-readable label
- Print layout hides TOC and navigation
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass

---

## Phase 10 — UI/UX Quality Assurance and Demo Polish

**Objective:** Final quality pass before demo. Verify all flows, fix remaining issues, ensure demo reliability.

**Affected routes:** All routes.

**Planned deliverables:**
1. Full demo flow walkthrough: Overview → Case Library → Patient Chart → Start Investigation → Live Workbench → Verified Finding → Evidence Explorer → Report
2. Viewport testing: 1440px, 1280px, 1024px, 768px
3. Keyboard navigation audit: all interactive elements reachable and operable
4. Focus indicator audit: all focusable elements have visible focus rings
5. Color contrast audit: all text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
6. Empty state audit: all data-driven views have appropriate empty states
7. Error state audit: all API calls have error states with retry
8. Loading state audit: skeleton loaders in place for all key views
9. Print audit: report prints correctly on A4
10. SSE reconnection test: disconnect and reconnect during a live investigation
11. Demo reset verification: `scripts/demo_reset.py` produces a clean state

**Dependencies:** All previous phases.

**Technical risks:**
- Keyboard navigation: `<details>/<summary>` elements may have inconsistent keyboard behavior across browsers. Test in Chrome, Firefox, and Edge.
- Color contrast: teal (`#168a83`) on white background may not meet 4.5:1 for small text. Verify and adjust if needed.

**Acceptance criteria:**
- Full demo flow completes without errors in a fresh browser session
- All four viewport sizes render without horizontal overflow
- All interactive elements are keyboard accessible
- `pnpm typecheck`, `pnpm lint`, `pnpm test` pass
- Browser E2E tests pass (when server execution is permitted)

---

## Phase Subdivision Notes

**Phase 5 (Investigation Command Center)** is the most complex phase and may need to be split:
- Phase 5a: `AgentBoard` component + workspace left panel improvements
- Phase 5b: Workspace layout (two-column at 1024px, tab URL state, right panel)
- Phase 5c: Investigation directory and new investigation improvements

**Phase 4 (Patient Record)** may need to be split if clinical note parsing proves complex:
- Phase 4a: Chart layout, overview, and navigation improvements
- Phase 4b: Document viewer and clinical note section parsing

---

## Risk Register

| Risk | Phases Affected | Mitigation |
|---|---|---|
| `Time` formatting breaks existing timestamp tests | 2 | Update tests to expect formatted output; keep ISO in `dateTime` attribute |
| `AgentBoard` derived state is slow for large event arrays | 5, 6 | Use `useMemo` with events array as dependency |
| Tab URL state conflicts with source selection params | 5 | Use distinct param name (`tab`) that does not overlap with `source`, `source_type`, `compare`, `finding` |
| Clinical note section parsing fails on non-standard notes | 4 | Always fall back to plain text rendering; never throw on parse failure |
| Sticky TOC overlaps content on scroll | 9 | Use `position: sticky` with `top: 0` and test at multiple scroll positions |
| Browser E2E tests blocked by server start policy | 10 | Document manual verification steps as fallback |
| `earliest_encounter_at` not in backend response | 3, 4 | Derive from encounter list on frontend as interim solution |
