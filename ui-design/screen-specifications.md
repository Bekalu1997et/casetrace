# CASETRACE — Screen Specifications

**Branch:** `refactor/interface`
**Scope:** Desktop-first specifications at 1440px. Behavior at narrower sizes noted per screen.

---

## Part I — Clinical Case Workspace

---

### Screen 1: Overview Dashboard (`/`)

**Primary user goal:** Understand what CASETRACE is, find the demo case, and start or resume an investigation.

**Layout (1440px):**
```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: "Hospital Overview" + subtitle + [Start Investigation]  │
│         [Browse Cases]                                          │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Available    │ Imported     │ Active       │ Completed          │
│ Cases        │ Patients     │ Investigations│ Investigations     │
├──────────────┴──────────────┴──────────────┴────────────────────┤
│ FEATURED CASE CARD (CASE-001 or first imported case)            │
├─────────────────────────────┬───────────────────────────────────┤
│ Recent Investigations        │ API / System Status              │
├─────────────────────────────┴───────────────────────────────────┤
│ WORKFLOW EXPLANATION (3 steps: Retrieve → Investigate → Verify) │
├─────────────────────────────────────────────────────────────────┤
│ PATIENT DIRECTORY (embedded, compact)                           │
└─────────────────────────────────────────────────────────────────┘
```

**Primary information:** Available cases count, active investigations, featured case.
**Secondary information:** Patient directory, workflow explanation, system status.

**Interactive controls:**
- "Start Investigation" → `/investigations/new`
- "Browse Cases" → `/cases`
- Featured case "Open patient chart" → `/patients/[patientId]`
- Featured case "Start Investigation" → `/investigations/new?patient=[id]`

**Empty state:** "No cases imported yet. Import a validated canonical case to begin."
**Loading state:** Skeleton metric cards (4 grey rectangles), skeleton case card.
**Error state:** "Hospital inventory unavailable. [Retry]" — metric cards show "—".

**Responsive behavior:**
- 1024–1279px: metric cards wrap to 2×2 grid; featured case full width
- 768–1023px: metric cards 2×2; workflow steps stack vertically
- <768px: metric cards 2×2; patient directory hidden (link to `/patients` instead)

**Accessibility:** Metric cards use `<dl>/<dt>/<dd>`. Workflow steps use `<ol>`. Featured case uses `<article>`.

**Data dependencies:** `GET /api/hospital/v1/cases`, `GET /api/investigations` (for counts), `GET /api/health`.

---

### Screen 2: Case Library (`/cases`)

**Primary user goal:** Find a specific synthetic case and understand its available records.

**Layout (1440px):**
```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: "Case Library" + subtitle                               │
├─────────────────────────────────────────────────────────────────┤
│ FILTERS: [Case ID input] [Status select] [Search button]        │
├─────────────────────────────────────────────────────────────────┤
│ CASE GRID (2 columns)                                           │
│ ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│ │ CASE-001 ● Imported     │  │ CASE-002 ● Imported         │   │
│ │ Patient name            │  │ Patient name                │   │
│ │ 8 encounters · 17 docs  │  │ ...                         │   │
│ │ Modalities: Labs/Meds/  │  │                             │   │
│ │ Radiology/Imaging       │  │                             │   │
│ │ Last encounter: Oct 2026│  │                             │   │
│ │ [Open case] [Open chart]│  │                             │   │
│ │ [Start Investigation]   │  │                             │   │
│ └─────────────────────────┘  └─────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ [Previous] [Next] · N cases total                               │
└─────────────────────────────────────────────────────────────────┘
```

**Primary information:** Case ID, status, patient name, record counts, modalities.
**Secondary information:** Latest encounter date, investigation history.

**Case card modality badges:** Small inline labels — `Labs` · `Medications` · `Radiology` · `Imaging` · `Referrals`. Only show categories that exist in the case.

**Empty state:** "No cases match this selection. Clear filters or import a canonical case."
**Loading state:** 4 skeleton case cards.
**Error state:** "Case library unavailable. [Retry]"

**Responsive:** Single column below 1024px.

**Data dependencies:** `GET /api/hospital/v1/cases?limit=20&offset=N`

---

### Screen 3: Patient Chart (`/patients/[patientId]`)

**Primary user goal:** Review a patient's longitudinal clinical history before or during an investigation.

**Layout (1440px):**
```
┌─────────────────────────────────────────────────────────────────┐
│ PATIENT HEADER                                                  │
│ ┌───────────────────────────────────────┐  ┌──────────────────┐│
│ │ SYNTHETIC PATIENT · CASE-001          │  │ [Start           ││
│ │ Samuel Bekele                         │  │  Investigation]  ││
│ │ SYN-001 · DOB: 1984-05-12 · M        │  │                  ││
│ │ 8 encounters · Last: Oct 19, 2026     │  │                  ││
│ │ Record spans: Mar 2026 – Oct 2026     │  │                  ││
│ └───────────────────────────────────────┘  └──────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ TAB NAV: Overview | Timeline | Encounters | Laboratory |        │
│          Medications | Documents | Imaging                      │
├─────────────────────────────────────────────────────────────────┤
│ TAB CONTENT (varies by tab — see below)                         │
└─────────────────────────────────────────────────────────────────┘
```

**Patient header — required fields:**
- Synthetic patient label (eyebrow)
- Display name (h1)
- Synthetic identifier, patient ID, case ID link
- Date of birth, sex
- Encounter count, last encounter date
- Record date range (earliest to latest encounter)
- "Start Investigation" button

**Phase 04 contract alignment:** The implementation uses the authoritative latest
encounter value and explicitly labels earliest encounter as unavailable because the
current patient summary contract does not expose it. It does not derive a date range
from a partial or unsorted record page. Compact previews retain patient-scoped source
links and provide route links to full sections where those routes exist.

**Tab: Overview**
```
┌──────────────────────────────────────────────────────────────┐
│ RECORD SUMMARY METRICS (encounter_count, document_count,     │
│ observation_count, medication_count, imaging_study_count)    │
├──────────────────────────────────────────────────────────────┤
│ RECENT ENCOUNTERS (compact, 5 rows) [View all →]             │
│ RECENT LABORATORY (compact, 5 rows) [View all →]             │
│ ACTIVE MEDICATIONS (compact, 5 rows) [View all →]            │
│ RECENT DOCUMENTS (compact, 5 rows) [View all →]              │
├──────────────────────────────────────────────────────────────┤
│ INVESTIGATION HISTORY for this patient                       │
└──────────────────────────────────────────────────────────────┘
```

Each compact section must include a "View all N records →" link to the full tab.

**Tab: Timeline**
- Chronological event list with left-border timeline rail
- Each event: event type (eyebrow), title, timestamp with precision indicator
- Precision indicator: `⏱` for instant, `📅` for date-only, `?` for unknown
- Named timestamps shown in a compact `<dl>` (occurred_at, documented_at, etc.)
- "Open source" button per event
- Filters: event category, from date, through date
- Disclaimer: "Named timestamps retain their original meaning and precision."

**Tab: Encounters**
- Table: encounter type, department, started_at (formatted), ended_at, provider, status
- Each row links to encounter detail
- Filters: department, encounter type, date range

**Tab: Laboratory**
- Table: test name, value + unit, reference range, collection date, report date, status
- Abnormal values highlighted (value outside reference range)
- Longitudinal trend chart below table (existing `LabTrend` component, improved)
- Filters: test code, date range

**Tab: Medications**
- Table: medication name, dose + route + frequency, start date, end date, status, prescriber
- Status badge per row
- Disclaimer: "Recorded orders do not establish administration or adherence."
- Filters: status, date range

**Tab: Documents**
- Table: title, document type (with icon), author, event date, authored date
- Document type icons: 📋 clinical note, 🧪 lab report, 💊 prescription, 🔬 radiology, 📎 other
- "Open document" link per row
- Filters: document type, text search, date range

**Tab: Imaging**
- Cards per study: modality badge, body region, performed date, status
- Inline synthetic image thumbnails
- "Open report" link to associated document
- Synthetic image watermark label

**Empty states:** Per-tab: "No [encounters/labs/medications/documents/imaging] recorded for this patient."
**Loading states:** Skeleton table rows (5 grey rows).
**Error states:** "Records unavailable. [Retry]" — other tabs remain functional.

**Responsive:**
- 1024–1279px: Patient header stacks vertically; tabs scroll horizontally
- <768px: Compact sections in overview become single-column; tables become card lists

**Data dependencies:** `GET /api/hospital/v1/patients/[id]`, `GET /api/hospital/v1/patients/[id]/[section]`

---

### Screen 4: Document Viewer (`/patients/[patientId]/documents/[documentId]`)

**Primary user goal:** Read a clinical document and understand its provenance.

**Layout (1440px):**
```
┌──────────────┬──────────────────────────────┬──────────────────┐
│ DOCUMENT     │ DOCUMENT CONTENT             │ METADATA         │
│ LIST         │                              │ PANEL            │
│              │ [Document title]             │                  │
│ Same-        │ [Author · Date]              │ Document ID      │
│ encounter    │                              │ Patient          │
│ documents    │ [Structured sections or      │ Encounter        │
│              │  plain text content]         │ Event date       │
│ [DOC-021]    │                              │ Authored date    │
│ [DOC-022]    │ [PDF viewer if asset]        │ Document type    │
│ ...          │                              │ MIME type        │
│              │                              │                  │
│              │                              │ [Open encounter] │
│              │                              │ [Return to       │
│              │                              │  investigation]  │
│              │                              │ (if from=inv)    │
└──────────────┴──────────────────────────────┴──────────────────┘
```

**Clinical note section parsing:** If `document_type === "clinical_note"` and `text_content` contains recognizable section headers (Chief Complaint, HPI, Assessment, Plan), render each section with a bold heading. Otherwise render as formatted text.

**PDF viewer:** Lazy-loaded PDF.js. Controls: page navigation, zoom, fit-to-width.

**Responsive:** Below 1280px, left and right panels collapse into drawers triggered by buttons.

---

## Part II — Investigation Command Center

---

### Screen 5: Investigation Workbench (`/investigations/[id]`)

**Primary user goal:** Observe and understand the multi-agent investigation as it executes or review it after completion.

**Layout (1440px) — three columns:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ INVESTIGATION HEADER                                                        │
│ CASE-001 · Samuel Bekele · INV-xxxx                                        │
│ [● Running] [60% — Contradiction Investigation]                             │
│ Created: Oct 19, 2026 14:00 · Started: 14:00:02 · Connection: Live         │
│ [All investigations] [Explore evidence] [Refresh] [Open report →]          │
├──────────────────┬──────────────────────────────┬──────────────────────────┤
│ CONTEXT &        │ RECENT ACTIVITY              │ EVIDENCE INSPECTOR       │
│ WORKFLOW         │ (last 6 events)              │                          │
│ (190px)          ├──────────────────────────────┤ [No source selected]     │
│                  │ TAB NAV:                     │                          │
│ [Patient ID]     │ Findings | Timeline |        │ Select a source from a   │
│ [Record counts]  │ Activity | Tasks | Hypotheses│ finding or timeline      │
│ [Objective]      ├──────────────────────────────┤ event to inspect the     │
│ [Open chart →]   │ TAB CONTENT                  │ original record.         │
│                  │                              │                          │
│ ─────────────    │                              │ ─────────────────────    │
│ WORKFLOW STAGES  │                              │ RECENT FINDINGS          │
│                  │                              │ (up to 4 finding cards   │
│ ✓ Record disc.   │                              │  with evidence links)    │
│ ✓ Timeline       │                              │                          │
│ ✓ Lab analysis   │                              │                          │
│ ✓ Med analysis   │                              │                          │
│ ● Contradiction  │                              │                          │
│ ○ Synthesis      │                              │                          │
│                  │                              │                          │
│ ─────────────    │                              │                          │
│ AGENT STATUS     │                              │                          │
│                  │                              │                          │
│ Retrieval ✓      │                              │                          │
│ 12 tool calls    │                              │                          │
│ Timeline ✓       │                              │                          │
│ 8 tool calls     │                              │                          │
│ Contradiction ●  │                              │                          │
│ 3 tool calls     │                              │                          │
└──────────────────┴──────────────────────────────┴──────────────────────────┘
```

**Investigation header — required fields:**
- Case ID and patient display name (eyebrow)
- "Investigation workbench" (h1)
- Patient ID · Investigation ID (small, monospace)
- Status badge
- Progress: stage name + completed/total stages + progress bar
- Timestamps: created, started, completed (formatted, not raw ISO)
- Connection state: "Live" / "Reconnecting" / "History restored" / "Disconnected"
- Actions: All investigations, Explore evidence, Refresh, Open report (only when completed)

**Left column — Context & Workflow:**
- Patient ID and record inventory counts (from `ClinicalContext`)
- Objective (humanized)
- "Open patient record" link
- Workflow stages rail: each stage with status icon and last timestamp
  - ✓ completed (green)
  - ● running (teal, animated dot)
  - ○ pending (grey)
  - ✗ failed (red)
  - ⊘ skipped (grey, strikethrough)
- Agent status section: each agent with name, status badge, tool call count, last action

**Center column — Activity + Tabs:**

Recent activity panel (always visible above tabs):
- Last 6 events, each showing: event type (humanized), agent/tool name, formatted timestamp
- "View full activity →" link to Activity tab

Tab: Findings
- Filter row: category select + status select
- Finding cards sorted: timeline_contradiction first, then by status (verified > proposed > unresolved > rejected)
- Each card: status badge, claim_kind + support_level, title, claim text, verification classification, source anchor buttons, "Inspect evidence" link, "Compare sources" button (if multiple anchors)
- Empty: "No findings yet. Discoveries appear when the backend persists them." (if running) or "No findings match this selection." (if terminal)

Tab: Timeline
- Filters: finding focus select, event category, from/to date
- Timeline rail with events sorted by timestamp
- Each event: source type (eyebrow with precision icon), title, timestamp, named timestamps `<dl>`, "Open source" button, linked finding labels
- Precision icons: ⏱ instant, 📅 date-only, ? unknown

Tab: Activity
- Tool execution inspector (paginated, existing `ToolInspector`)
- Individual agent executions (existing `AgentActivity`)
- Full event history (bounded to last 50, with "Show earlier" control)

Tab: Tasks & Leads
- Only shown when adaptive strategy events are present
- Task and lead cards with objectives, dependencies, outcomes
- If no adaptive events: "This investigation used deterministic rules mode. Adaptive task planning was not active."

Tab: Hypotheses
- Hypothesis cards with verdict badge, explanation, supporting/opposing anchors, alternatives, missing evidence

**Right column — Evidence Inspector:**
- When no source selected: instruction text + recent finding cards (up to 4) with "Review evidence" links
- When source selected: `SourcePanel` with cited field, relationship, excerpt, version/hash
- When multiple sources selected: "Inspect comparison below ↓" link + side-by-side comparison panel (full width, above the three-column grid)
- "Close evidence" button

**Investigation states:**

| State | Header behavior | Center behavior | Right behavior |
|---|---|---|---|
| Queued | Status: Queued; no progress | "Waiting for worker to claim this investigation." | Empty instruction |
| Running | Live status; animated progress | Events stream in; findings appear | Source inspection available |
| Completed | Status: Completed; "Open report →" prominent | All findings visible; timeline complete | Source inspection available |
| Completed with limitations | Status badge + limitations notice | Findings + limitations list | Source inspection available |
| Failed | Status: Failed; alert notice | "Investigation failed. Partial findings remain." | Source inspection available |
| Reconnecting | "Reconnecting — showing persisted state" | Last known state visible | Source inspection available |

**Responsive:**
- 1024–1279px: Two columns (left + center); right panel becomes a slide-in drawer triggered by "Inspect evidence" button
- <1024px: Single column; left panel collapses to `<details>`; right panel is a full-width drawer

**Accessibility:**
- Progress bar: `<progress>` with `aria-label`
- Connection state: `role="status"`
- Error/limitation notices: `role="alert"`
- Tab navigation: `aria-pressed` on tab buttons
- Finding cards: `<article>` with appropriate heading level

**Data dependencies:**
- `GET /api/investigations/[id]` (REST snapshot)
- `GET /api/investigations/[id]/events` (backfill)
- `GET /api/investigations/[id]/findings`
- `GET /api/investigations/[id]/stream` (SSE)
- `GET /api/investigations/[id]/tools` (tool audit)

---

### Screen 6: Evidence Explorer (`/investigations/[id]/evidence`)

**Primary user goal:** Navigate from a specific finding to its original source records and verify the evidence chain.

**Layout (1440px):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NAV: [Return to workbench] [Investigation report]                           │
│ HEADER: "Evidence Explorer" · patient_id · case_id · investigation_id       │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ FINDINGS NAVIGATOR       │ FINDING DETAIL + SOURCE INSPECTION               │
│ (280px)                  │                                                  │
│                          │ [FindingCard — full detail]                      │
│ [● Verified]             │                                                  │
│ Timeline discrepancy     │ EVIDENCE RELATIONSHIPS                           │
│ FND-001                  │ Filter: [All relationships ▼]                    │
│                          │ [DOC-021 · event_at · supports]                  │
│ [○ Unresolved]           │ [LAB-009 · specimen_collected_at · contradicts]  │
│ Lab trend finding        │                                                  │
│ FND-002                  │ ORIGINAL SOURCE EVIDENCE                         │
│                          │ ┌──────────────────────────────────────────────┐│
│                          │ │ SourcePanel for selected anchor              ││
│                          │ │ Cited field, relationship, excerpt,          ││
│                          │ │ version/hash, "Open in hospital workspace"   ││
│                          │ └──────────────────────────────────────────────┘│
└──────────────────────────┴──────────────────────────────────────────────────┘
```

**Findings navigator:**
- Each finding: status badge, title, finding ID
- Selected finding highlighted with left border accent
- `aria-pressed` on selected finding button

**Finding detail area:**
- Full `FindingCard` with verification checks, alternatives, limitations
- Relationship filter defaulting to "contradicts" for verified timeline_contradiction findings
- Source anchor buttons: `[source_id · field · relationship]`
- Clicking anchor opens `SourcePanel` below

**Source panel:**
- "Original hospital source · {source.type}" eyebrow
- "Open in hospital workspace" link (with investigation/finding context params)
- Cited field with `SourceHighlight` (exact quote highlighted if offsets available)
- Version/hash provenance
- Version mismatch warning (reworded for clarity)

**Side-by-side comparison:**
- Triggered by "Compare source records" button on finding card
- Two `SourcePanel` components side by side
- "Close comparison" button

**Empty states:**
- No findings: "No findings recorded yet."
- Finding not found: "The selected finding is not available in this investigation."
- Source outside finding: "The selected source is not evidence for this finding."

**Responsive:** Below 1280px, findings navigator collapses to a select dropdown above the detail area.

---

### Screen 7: Investigation Report (`/investigations/[id]/report`)

**Primary user goal:** Read the final evidence-backed investigation report and verify its claims.

**Layout (1440px):**
```
┌─────────────────────────────────────────────────────────────────┐
│ NAV: [Investigation workspace] / Report                         │
├─────────────────────────────────────────────────────────────────┤
│ REPORT HEADER                                                   │
│ CASE-001 · Evidence-backed investigation report                 │
│ [Headline finding]                                              │
│ [● Completed] · Patient SYN-001 · INV-xxxx                     │
│ Objective: Full record investigation                            │
│ Generated: Oct 19, 2026 14:04 · Mode: Deterministic rules      │
│ SYNTHETIC DEMO — NOT FOR CLINICAL USE                           │
│ [Open evidence explorer] [Print report]                         │
├─────────────────────────────────────────────────────────────────┤
│ TABLE OF CONTENTS                                               │
│ 1. Executive Summary  2. Verified Findings  3. Unresolved       │
│ 4. Rejected  5. Timeline  6. Hypotheses  7. Limitations         │
│ 8. Source Index  9. Execution Provenance                        │
├─────────────────────────────────────────────────────────────────┤
│ § Executive Summary                                             │
│ [Description text]                                              │
│ Evidence strength note                                          │
├─────────────────────────────────────────────────────────────────┤
│ § Verified Findings                                             │
│ [FindingCard × N — sorted timeline_contradiction first]         │
├─────────────────────────────────────────────────────────────────┤
│ § Unresolved Findings                                           │
│ [FindingCard × N]                                               │
├─────────────────────────────────────────────────────────────────┤
│ § Rejected Findings                                             │
│ [FindingCard × N]                                               │
├─────────────────────────────────────────────────────────────────┤
│ [INLINE SOURCE EVIDENCE — appears when a source is selected]    │
│ [Close evidence] [Side-by-side if multiple]                     │
├─────────────────────────────────────────────────────────────────┤
│ § Reconstructed Clinical Timeline                               │
│ [InvestigationTimeline]                                         │
├─────────────────────────────────────────────────────────────────┤
│ § Hypothesis Comparison                                         │
│ [Hypotheses grid]                                               │
├─────────────────────────────────────────────────────────────────┤
│ § Uncertainty and Limitations                                   │
│ [Limitations list]                                              │
├─────────────────────────────────────────────────────────────────┤
│ § Source Index                                                  │
│ [ReportSourceIndex — deduplicated by type+ID]                   │
├─────────────────────────────────────────────────────────────────┤
│ § Execution Provenance (collapsible, open by default)           │
│ Execution mode · Agent names · Tool call count                  │
│ [AgentActivity — full history]                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Table of contents:** Anchor links to each section. Sticky on desktop (position: sticky, top: 0) within the report content area.

**Execution mode display:** Map raw values to human-readable labels:
- `rules` → "Deterministic rules mode"
- `gemini` → "AI-assisted investigation (Gemini)"

**Execution provenance:** Open by default (changed from current closed default). Shows agent names, tool call counts, and last activity. Full event history is collapsible within this section.

**Print behavior:** TOC hidden in print. Section headings use `break-after: avoid`. Finding cards use `break-inside: avoid`. Source index uses compact table layout.

**Responsive:** Single column at all sizes. TOC becomes a select dropdown on mobile.

**Data dependencies:**
- `GET /api/investigations/[id]` (state)
- `GET /api/investigations/[id]/report`
- `GET /api/investigations/[id]/events` (for provenance)
