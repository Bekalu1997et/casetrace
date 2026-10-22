# CASETRACE — UX Audit

**Branch verified:** `refactor/interface`
**Scope:** All implemented frontend routes and components as of Refactor 09.
**Method:** Source code inspection + contract analysis. No live browser session was available.

Finding labels:
- **[V]** Verified implementation issue — confirmed in source code
- **[C]** Code-based UX concern — inferred from implementation pattern
- **[D]** Documentation inconsistency — contract vs. implementation mismatch
- **[H]** Hypothesis — requires visual or user testing to confirm

---

## 1. Screen-by-Screen Audit

### 1.1 Overview Dashboard (`/` → `features/dashboard/components/overview.tsx`)

**Purpose:** Entry point. Shows hospital inventory, recent cases, recent investigations, and a workflow explanation.

**Implemented functionality:**
- Loads case list and investigation history counts from real API
- Shows a featured first case card
- Embeds the patient directory
- Shows API status widget
- Three-step workflow explanation (static)

**Information architecture:**
- Header with CTA buttons ("Start Investigation", "Browse Cases")
- Metric cards (cases, patients, active/completed investigations)
- Featured case card
- Two-column grid: investigation history + API status
- Workflow explanation section
- Patient directory (embedded)

**Strengths:**
- Real backend counts, not hardcoded
- Clear primary action
- Synthetic data label present

**Issues:**

**[V] Metric cards are partially derived, not all from dedicated endpoints.**
`overview.tsx` derives encounter/document totals by summing `cases.data` array entries only when `!has_more`. When more than one page of cases exists, these counts silently show 0 or partial values. Source: `overview.tsx` lines computing `Available-case encounters`.
*User impact:* Misleading summary numbers for larger datasets.
*Fix:* Either paginate all cases before summing (expensive) or remove derived counts and show only what the API directly provides.

**[V] Patient directory is embedded inside the dashboard with a separate heading level.**
`PatientDirectory` renders an `<h2>` when `embedded=true`, but the dashboard already has an `<h1>`. The directory section has no visible section label distinguishing it from the rest of the page.
*User impact:* Cognitive confusion — the page feels like two separate pages stacked.
*Fix:* Add a clear section heading ("Synthetic Patient Directory") above the embedded directory, or move the directory to a collapsible section.

**[C] "Start Investigation" CTA links to `/patients`, not to a direct launch flow.**
A user clicking "Start Investigation" from the dashboard lands on the patient list, not on `/investigations/new`. The intent is clear but the path adds an unnecessary step.
*User impact:* Extra click for the primary demo action.
*Fix:* Link "Start Investigation" to `/investigations/new`.

**[H] The three-step workflow explanation is static and generic.**
It reads "Retrieve records → Investigate → Verify" without connecting to the actual investigation currently visible on the page.
*User impact:* Feels like marketing copy rather than a functional guide.
*Fix:* Consider making the workflow steps contextual — e.g., highlight the step that corresponds to the most recent investigation's current stage.

---

### 1.2 Case Library (`/cases` → `features/cases/components/case-library.tsx`)

**Purpose:** Browse imported synthetic cases and their record availability.

**Implemented functionality:**
- Paginated case list with exact case ID and status filters
- Case cards showing counts, modalities, status badge
- Links to patient chart and investigation launch
- Case detail page with full record inventory

**Strengths:**
- Filters work against real API
- Status badge distinguishes imported vs. not-ready cases
- Modalities list is data-driven

**Issues:**

**[V] Case cards show no encounter chronology or date range.**
A user cannot tell from the case card whether the case spans 6 months or 6 years, or when the most recent encounter occurred. `latest_encounter_at` is shown only in the detail view.
*User impact:* Users cannot assess case complexity or temporal scope from the library.
*Fix:* Add `latest_encounter_at` and a rough date range to the case card summary line.

**[V] "Start Investigation" appears on case cards even when the case has no imported patient.**
The button is conditionally rendered only when `item.imported && item.status === "imported" && item.patient_id`, which is correct. However, the "Open patient chart" link also requires `item.display_name`, meaning a case with a patient ID but no display name silently omits the chart link.
*User impact:* Inconsistent affordances depending on data completeness.
*Fix:* Show a disabled/greyed "Patient chart unavailable" state rather than silently omitting the link.

**[C] No visual distinction between CASE-001 (the hero demo case) and other cases.**
All case cards look identical. The primary demo case has no visual priority.
*User impact:* During a live demo, the presenter must manually scroll to find CASE-001.
*Fix:* Pin or visually highlight the primary demo case, or sort imported cases before non-imported ones.

**[H] Filter form submits on button click only, not on Enter or field change.**
The case ID filter uses a `<form>` with a submit button. Status filter uses `onChange`. This inconsistency may confuse users.
*Fix:* Standardize: either all filters apply on change, or all require explicit submit.

---

### 1.3 Patient Directory (`/patients` → `features/patients/components/patient-directory.tsx`)

**Purpose:** Search and browse imported synthetic patients.

**Implemented functionality:**
- Search by name or patient identifier
- Paginated list
- Links to patient chart

**Strengths:**
- Simple, functional
- Real-time search

**Issues:**

**[V] No record count or case association shown in the directory list.**
Each patient entry shows only name, synthetic identifier, patient ID, and case ID. There is no encounter count, date range, or modality summary.
*User impact:* Users cannot assess which patient to select without opening each chart.
*Fix:* Add encounter count and latest encounter date to each directory row.

**[C] The directory has no "Start Investigation" shortcut.**
Users must open the patient chart first, then click "Start Investigation" from the chart header. This adds a navigation step.
*Fix:* Add a secondary "Investigate" action to each directory row.

---

### 1.4 Patient Chart (`/patients/[patientId]` → `features/patients/components/chart-layout.tsx`)

**Purpose:** Hospital-style longitudinal record view for a synthetic patient.

**Implemented functionality:**
- Patient identity header with demographics
- Tab navigation: Overview, Timeline, Encounters, Laboratory, Medications, Documents, Imaging
- "Start Investigation" button in header
- Each tab loads the corresponding clinical section via `ClinicalList`

**Strengths:**
- Real API data throughout
- Tab navigation is keyboard accessible
- Synthetic data label present
- `StartInvestigation` component handles idempotency

**Issues:**

**[V] The patient header shows `latest_encounter_at` but not the earliest encounter date.**
Users cannot determine the full temporal span of the record from the header.
*User impact:* Clinicians reviewing a case need to know the record's time range immediately.
*Fix:* Add earliest encounter date or a "Record spans X months/years" summary.

**[V] The Overview tab (`chart-overview.tsx`) renders all clinical sections as compact lists in a two-column grid.**
Six compact `ClinicalList` components load simultaneously on mount. Each makes an independent API call. On slow connections this produces six simultaneous loading spinners.
*User impact:* Visually noisy loading state; no sense of priority.
*Fix:* Load the most important sections first (encounters, observations) and defer others, or use a skeleton layout.

**[V] `ClinicalList` compact mode shows only 5 records per section.**
The limit is hardcoded as `limit: "5"` in compact mode. There is no "Show more" link within the compact view — users must navigate to the full tab.
*User impact:* Users may not realize more records exist.
*Fix:* Add a "View all N records →" link at the bottom of each compact section.

**[C] The clinical tabs use `aria-current="page"` but the tab bar is not a `<nav>` with `role="tablist"`.**
The tabs are `<a>` links styled as tabs. This is semantically valid (they navigate to sub-routes) but the visual tab metaphor implies `role="tab"` semantics.
*User impact:* Screen reader users may not understand the tab relationship.
*Fix:* Either use proper `role="tablist"` / `role="tab"` with JavaScript state, or ensure the link-based navigation is clearly labeled as section navigation.

**[V] The Timeline tab includes a disclaimer about "known instants only" but does not visually distinguish date-only events from timestamped events in the rendered list.**
Source: `clinical-list.tsx` timeline disclaimer text. The `ClinicalList` renders all timeline records in the same table format regardless of precision.
*User impact:* Users cannot quickly identify which events have precise timestamps vs. date-only precision — critical for CASE-001's contradiction.
*Fix:* Add a precision indicator (e.g., a clock icon for instants, a calendar icon for date-only) to each timeline row.

**[D] The `documents` tab shows `has_asset` as a boolean column in the table.**
The column header reads "has asset" and the value is `true`/`false`. This is an internal field name exposed directly.
*User impact:* Clinically confusing; users expect "PDF available" or a document icon.
*Fix:* Replace `has_asset` column with a document-type icon or "PDF" badge.

---

### 1.5 Encounter Detail (`/patients/[patientId]/encounters/[encounterId]`)

**Purpose:** Show a single encounter with its associated records.

**Implemented functionality:**
- Encounter metadata
- Associated documents, observations, medications via `ClinicalList` with `encounterId` filter

**Issues:**

**[C] No visual grouping between encounter metadata and its associated records.**
The encounter detail page renders the encounter card followed by multiple `ClinicalList` sections. There is no clear visual hierarchy separating "what happened in this encounter" from "records associated with this encounter."
*Fix:* Use a clear section heading structure: encounter summary at top, then "Associated records" section below.

**[H] No "Back to timeline" or "Back to encounters list" navigation within the encounter detail.**
Users navigating from the timeline to an encounter detail have no contextual back link.
*Fix:* Add breadcrumb or back link to the encounter detail page.

---

### 1.6 Document Detail (`/patients/[patientId]/documents/[documentId]`)

**Purpose:** View a specific clinical document with its content and asset.

**Implemented functionality:**
- Document metadata
- Text content rendering
- PDF/image asset viewer via `DocumentAsset`
- Three-column layout: document list, main viewer, metadata panel

**Strengths:**
- Three-column layout matches the spec
- PDF.js integration for PDF assets
- Synthetic image watermark

**Issues:**

**[V] The document list column (left panel) is not implemented in the current route.**
`features/documents/components/document-detail.tsx` exists but the left column showing a document list within the same encounter is not populated. The three-column layout CSS exists (`document-workspace`) but the left column is empty.
*User impact:* Users cannot navigate between documents in the same encounter without going back to the patient chart.
*Fix:* Populate the left column with documents from the same encounter, or from the same patient filtered by type.

**[C] Long `text_content` fields are rendered as raw `<pre>` or plain text without section parsing.**
Clinical notes have structured sections (Chief Complaint, HPI, Assessment, Plan) but these are rendered as a single text block.
*User impact:* Reading clinical notes is harder than necessary; the CASE-001 contradiction is buried in unstructured text.
*Fix:* Parse common clinical note sections and render them with visual hierarchy.

---

### 1.7 Investigation Directory (`/investigations` → `features/investigations/components/directory.tsx`)

**Purpose:** List all investigations with filters and navigation.

**Implemented functionality:**
- Paginated table with patient/case/status filters
- Links to workbench and report
- "New investigation" CTA

**Strengths:**
- Real paginated data
- Status badge in table
- Report link only shown for completed investigations

**Issues:**

**[V] The table has no visual differentiation between running and completed investigations.**
Both use the same row style. A running investigation is the most important one to surface.
*User impact:* Users scanning the list cannot immediately identify active investigations.
*Fix:* Add a subtle left border or background tint to running investigation rows.

**[C] The "New investigation" button is in the page header, far from the empty state.**
When no investigations exist, the empty state message appears in the middle of the page while the CTA is at the top.
*Fix:* Repeat the "New investigation" CTA inside the empty state.

---

### 1.8 New Investigation (`/investigations/new` → `features/investigations/components/new-investigation.tsx`)

**Purpose:** Select a patient and launch an investigation.

**Implemented functionality:**
- Patient search and selection
- Record inventory summary for selected patient
- `StartInvestigation` component for submission

**Strengths:**
- Patient selection persists while reviewing inventory
- Idempotency key prevents duplicate submissions
- Real record counts shown before launch

**Issues:**

**[C] No investigation objective selector is shown.**
The `StartInvestigation` component submits with a hardcoded `full_record_investigation` objective. The contract supports multiple objectives but the UI exposes none.
*User impact:* Users cannot choose a focused investigation type.
*Fix:* Add an objective selector with the supported values, defaulting to `full_record_investigation`.

**[C] No confirmation step before submission.**
Clicking "Start Investigation" immediately POSTs and navigates. There is no review of what will be investigated.
*User impact:* Accidental launches during a demo.
*Fix:* Add a brief confirmation summary (patient, case, objective) before the final submit button.

---

### 1.9 Investigation Workspace (`/investigations/[id]` → `features/investigations/components/workspace.tsx`)

**Purpose:** The primary investigation command center. Shows live agent activity, findings, timeline, evidence.

**Implemented functionality:**
- Three-column layout: context/workflow (left), tabbed center, evidence inspector (right)
- Header with progress bar, status, timestamps, connection state
- Five center tabs: Findings, Timeline, Activity, Tasks & leads, Hypotheses
- Collapsible left and right panels via `<details>`
- SSE + REST reconciliation via `useInvestigation`
- Source comparison panel
- Finding filters (type, status)

**Strengths:**
- Real backend data throughout — no fabricated activity
- SSE reconnection with bounded retry
- Evidence comparison with side-by-side source panels
- Finding lifecycle clearly distinguished (proposed/verified/rejected/unresolved)
- Tool audit inspector with paginated results

**Issues:**

**[V] The "Recent investigation activity" panel (`ActivitySummary`) shows only the last 4 events.**
Source: `activity-summary.tsx` — `events.slice(-4)`. During active investigation this panel cycles through events too quickly to read.
*User impact:* Users miss important events (e.g., `finding.proposed`) because they scroll off.
*Fix:* Show last 6–8 events, or make the count configurable. Add a "View all activity" link to the Activity tab.

**[V] The progress bar shows `completed_stages / total_stages` but the stage names are not shown in the header.**
The header shows "contradiction_investigation" as a humanized string but does not show the full stage sequence.
*User impact:* Users cannot tell how far through the investigation they are without counting.
*Fix:* Show the workflow rail stages in the header or link the progress bar to the workflow rail.

**[V] The left panel "Agent status" section shows agent names and status badges only.**
There is no tool call count, last action, or timing information in the agent status summary.
*User impact:* The agent status panel communicates almost nothing beyond "running" or "completed."
*Fix:* Add tool call count and last recorded action to each agent status row.

**[V] The five center tabs have no visual indicator of new content.**
When a new finding arrives via SSE, the "Findings" tab does not show a badge or highlight.
*User impact:* Users watching the Activity tab miss new findings.
*Fix:* Add a count badge to the Findings tab when new findings arrive.

**[C] The "Tasks & leads" tab is only useful for adaptive strategy runs.**
For baseline runs, it shows "No agent tasks and handoffs recorded in this run. Baseline execution may not create adaptive tasks." This is accurate but confusing for users who don't know the difference between strategies.
*User impact:* Users see an empty tab with a technical explanation.
*Fix:* Hide the Tasks & leads tab entirely for baseline runs, or rename it "Adaptive workflow" and explain it only appears for adaptive strategy investigations.

**[V] The right evidence panel shows finding cards as a fallback when no source is selected.**
Source: `workspace.tsx` — the right panel renders `findings.slice(0, 6)` as audit cards when `sources.length === 0`. These cards duplicate the findings already visible in the center panel.
*User impact:* Redundant information; the right panel's purpose is unclear when no source is selected.
*Fix:* Replace the fallback with a clear instruction: "Select a source reference from a finding or timeline event to inspect the original record here."

**[C] The workspace breadcrumb shows only "Investigation" without the investigation ID.**
Source: `workspace.tsx` — the breadcrumb reads `Hospital overview / {patient_id} / Investigation`.
*User impact:* Users with multiple investigations open cannot distinguish them from the breadcrumb.
*Fix:* Include the investigation ID in the breadcrumb.

**[H] The three-column layout collapses to a single column below 1280px.**
The CSS grid switches from three columns to one column at the 1280px breakpoint. At 1024–1279px (common laptop resolution), all three panels stack vertically, making the workspace very long.
*Fix:* Consider a two-column layout at 1024–1279px (context + main, with evidence as a drawer).

---

### 1.10 Evidence Explorer (`/investigations/[id]/evidence` → `features/evidence/components/evidence-explorer.tsx`)

**Purpose:** Dedicated finding-to-source navigation with relationship filtering.

**Implemented functionality:**
- Findings navigator (left)
- Selected finding card with verification details
- Relationship filter (supports/contradicts/contextualizes/derived_from)
- Source anchor buttons
- SourcePanel for original record inspection
- Side-by-side comparison

**Strengths:**
- Anchor restoration from persisted finding membership (not URL content)
- Foreign finding detection
- Relationship filter
- Deep-link support via URL params

**Issues:**

**[V] The findings navigator uses `<button>` elements styled as cards but has no keyboard focus indicator beyond the browser default.**
Source: `evidence-explorer.tsx` — `aria-pressed` is set correctly but no custom focus style is applied to the audit-card buttons.
*User impact:* Keyboard users cannot easily see which finding is focused.
*Fix:* Add a visible focus ring to the finding navigator buttons.

**[C] The evidence explorer has no "back to workbench" breadcrumb in the page header.**
The nav shows "Return to workbench" and "Investigation report" links, but these are inside the page content, not in the shell breadcrumb.
*User impact:* Users lose orientation when navigating deep into evidence.
*Fix:* Update the shell breadcrumb to reflect the evidence explorer context.

**[V] The relationship filter defaults to "all" but the most important relationship for CASE-001 is "contradicts".**
Users must manually change the filter to see the contradicting evidence.
*Fix:* When a finding has `status: "verified"` and type `timeline_contradiction`, default the relationship filter to "contradicts".

---

### 1.11 Investigation Report (`/investigations/[id]/report` → `features/investigations/components/report.tsx`)

**Purpose:** Final evidence-backed investigation report.

**Implemented functionality:**
- Executive summary
- Verified/unresolved/rejected findings with `FindingCard`
- Reconstructed timeline
- Hypothesis comparison
- Limitations
- Source index
- Collapsible execution provenance
- Print CSS

**Strengths:**
- Findings sorted with `timeline_contradiction` first
- Source index deduplicates by type+ID
- Print CSS with A4 margins
- Synthetic disclaimer prominent
- Execution mode shown

**Issues:**

**[V] The report has no section anchors or table of contents.**
The report can be very long (verified findings + timeline + hypotheses + limitations + source index). There is no way to jump to a specific section.
*User impact:* During a demo, scrolling to the verified finding takes time.
*Fix:* Add a sticky table of contents or section anchor links at the top of the report.

**[C] The "Inspect execution provenance" section is a `<details>` element that is closed by default.**
This means the agent activity history is hidden. For a demo, showing that real agents ran is important.
*Fix:* Consider opening this section by default, or moving a summary (agent names, tool call count) into the report header.

**[V] The report header shows `execution_mode` as a raw string (e.g., "rules").**
This is an internal implementation detail.
*User impact:* Confusing to non-technical users.
*Fix:* Map execution mode to a human-readable label: "rules" → "Deterministic rules mode", "gemini" → "AI-assisted investigation".

---

## 2. Cross-Cutting Issues

### 2.1 Navigation

**[V] The sidebar navigation has only four items: Overview, Patient records, Case Library, Investigations.**
There is no direct link to a running investigation from the sidebar. Users must navigate to Investigations → find the running one → open it.
*User impact:* During a live demo, finding the active investigation requires multiple clicks.
*Fix:* Add a "Active investigation" shortcut in the sidebar when an investigation is running, or show a notification badge on the Investigations link.

**[V] The `WorkspaceBreadcrumbs` component only shows two levels: "Hospital overview / {area}".**
Deep routes like `/patients/SYN-001/documents/DOC-021` show only "Hospital overview / Patient records".
*User impact:* Users lose context when navigating deep into clinical records.
*Fix:* Build a proper breadcrumb that reflects the full path.

### 2.2 Empty and Loading States

**[V] `LoadingState` renders as a plain `<p role="status">` with no visual skeleton.**
Every loading state across the application is a plain text paragraph.
*User impact:* The interface feels unpolished and gives no sense of the content structure that will appear.
*Fix:* Implement skeleton loading states for the most important views (patient chart, investigation workspace, findings list).

**[C] Error states use the `.notice` class (amber background) for all errors.**
This means a "No records found" empty state and a "Network error" look visually similar.
*Fix:* Distinguish empty states (neutral) from error states (amber/red).

### 2.3 Typography and Visual Hierarchy

**[V] `<Time>` component renders ISO timestamps in monospace font without any formatting.**
Source: `presentation.tsx` — `<time dateTime={value} className="break-words font-mono text-xs">{value}</time>`.
Raw ISO strings like `2026-10-19T14:32:00Z` are shown everywhere.
*User impact:* Hard to read at a glance; clinical users expect formatted dates.
*Fix:* Format timestamps as "Oct 19, 2026 14:32 UTC" with the ISO value in `dateTime` for accessibility.

**[V] `humanize()` converts underscores to spaces and capitalizes, but does not handle all cases.**
Source: `lib/formatters/text.ts`. Values like `completed_with_limitations` become "Completed with limitations" which is acceptable, but `timeline_contradiction` becomes "Timeline contradiction" — losing the clinical significance.
*Fix:* Add a display name map for known domain terms: `timeline_contradiction` → "Timeline Contradiction", `full_record_investigation` → "Full Record Investigation".

**[C] The `StatusBadge` component maps only three tones: good, bad, pending.**
All statuses not in `["verified", "completed", "supported"]` or `["failed", "rejected"]` get the amber "pending" treatment. This means `running`, `queued`, `proposed`, `unresolved`, and `cancelled` all look the same.
*Fix:* Add distinct tones: blue/teal for `running`, neutral for `queued`/`cancelled`, amber for `proposed`/`unresolved`.

### 2.4 Evidence and Provenance

**[V] Source links in `FindingCard` show only the source ID (e.g., "DOC-021 · supports").**
There is no document title, record type label, or date shown on the source button.
*User impact:* Users cannot tell what a source is without clicking it.
*Fix:* Show source type and a short label alongside the ID.

**[C] The `SourcePanel` shows a version mismatch warning but does not explain what it means.**
The warning reads: "The current field differs from the investigation anchor. This source may have changed; the earlier verification does not verify the current value."
*User impact:* Non-technical users do not understand "investigation anchor" or "source version."
*Fix:* Rewrite as: "This record may have been updated since the investigation ran. The original verified version is no longer identical to the current record."

### 2.5 Accessibility

**[V] The `<details>/<summary>` pattern is used extensively for collapsible panels.**
While semantically valid, the `summary` elements have no visible expand/collapse indicator beyond the browser default triangle, which varies across browsers and is often invisible.
*Fix:* Add explicit chevron icons to all `<summary>` elements.

**[C] Color is used as the primary differentiator for finding status.**
`finding-verified` (green background), `finding-candidate` (amber), `finding-rejected` (red), `finding-unresolved` (yellow). The status badge provides text, but the card background color is the dominant visual signal.
*Fix:* Add a status icon (✓, !, ✗, ?) to each finding card in addition to the badge and background color.

---

## 3. Prioritized Findings Matrix

| # | Severity | Finding | Affected Route/Component | Evidence | User Impact | Resolution |
|---|---|---|---|---|---|---|
| 1 | High | Raw ISO timestamps everywhere | All routes | `presentation.tsx Time` component | Unreadable dates in clinical context | Format as human-readable with ISO in `dateTime` |
| 2 | High | Agent status panel shows almost no information | `/investigations/[id]` workspace left panel | `workspace.tsx` agent status section | Investigation progress is opaque | Add tool call count and last action to agent rows |
| 3 | High | No skeleton loading states | All data-driven views | `resource-state.tsx LoadingState` | Unpolished; no layout preview | Implement skeleton states for key views |
| 4 | High | ActivitySummary shows only 4 events | `/investigations/[id]` | `activity-summary.tsx slice(-4)` | Key events missed during live investigation | Show 6–8 events; link to full Activity tab |
| 5 | High | No section anchors in report | `/investigations/[id]/report` | `report.tsx` | Demo presenter cannot jump to key finding | Add TOC with anchor links |
| 6 | Medium | StatusBadge has only 3 tones for 10+ statuses | All routes | `presentation.tsx StatusBadge` | `running` and `queued` look identical | Add distinct tones per status group |
| 7 | Medium | Source buttons show ID only, no label | `/investigations/[id]`, evidence explorer | `finding-card.tsx` | Users cannot identify sources without clicking | Add source type and short label |
| 8 | Medium | No visual priority for CASE-001 in case library | `/cases` | `case-library.tsx` | Demo presenter must scroll to find hero case | Pin or highlight primary demo case |
| 9 | Medium | Breadcrumbs only show two levels | All deep routes | `workspace-navigation.tsx WorkspaceBreadcrumbs` | Users lose orientation in deep navigation | Build full path breadcrumb |
| 10 | Medium | Right evidence panel duplicates findings as fallback | `/investigations/[id]` | `workspace.tsx` right panel | Redundant content; panel purpose unclear | Replace with clear instruction text |
| 11 | Medium | Timeline tab does not distinguish date-only vs. instant precision | `/patients/[patientId]/timeline` | `clinical-list.tsx` | Critical for CASE-001 contradiction visibility | Add precision indicator to timeline rows |
| 12 | Medium | Document text content rendered as unstructured block | `/patients/[patientId]/documents/[documentId]` | `document-detail.tsx` | Clinical notes are hard to read | Parse and render common note sections |
| 13 | Low | "Start Investigation" CTA on dashboard links to patient list | `/` | `overview.tsx` | Extra navigation step | Link directly to `/investigations/new` |
| 14 | Low | Tasks & leads tab confusing for baseline runs | `/investigations/[id]` | `workspace.tsx` tab | Technical explanation shown to end users | Hide tab for baseline runs |
| 15 | Low | `has_asset` boolean shown as column in documents table | `/patients/[patientId]/documents` | `clinical-list.tsx` columns config | Internal field name exposed | Replace with document type icon |
