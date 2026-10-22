# CASETRACE — UI Design Blueprint

**Version:** 2.0 (Prompt 01 — Audit and Blueprint)
**Branch:** `refactor/interface`
**Status:** Authoritative design specification for all subsequent implementation prompts.

This document supersedes the placeholder `ui-design/ui-design.md` that previously existed. The detailed design documentation in `docs/casetrace-ui-design/ui-design.md` remains a valid historical reference for the original prototype intent.

---

## 1. Product Experience Vision

CASETRACE is a clinical investigation platform where multiple specialized AI agents investigate synthetic patient records, coordinate their work, retrieve evidence, test hypotheses, and present traceable findings.

The interface must make that process **understandable, efficient, and credible**.

The experience has two connected environments:

**Environment A — Clinical Case Workspace**
Users explore synthetic patient records, review clinical histories, inspect documents and medical data, and initiate investigations. It should feel like professional clinical software: calm, structured, information-dense but readable, efficient to navigate, suitable for extended use, and clinically credible.

**Environment B — Multi-Agent Investigation Command Center**
Users observe and inspect AI agents investigating a patient's longitudinal clinical history. The interface must communicate which agents are participating, their actual responsibilities and execution states, what investigative tasks are underway, which tools have been executed, what records have been retrieved, what findings have emerged, how evidence supports or contradicts those findings, and what uncertainties remain.

**The investigation experience must not resemble a chatbot.** It should resemble a professional combination of an intelligence investigation workspace, a multi-agent orchestration console, an evidence analysis platform, and a clinical decision-support interface.

---

## 2. Primary User Personas

### Persona A — Demo Evaluator
A judge or evaluator watching a live demonstration. They need to understand what the system is doing within 4 minutes. They are not clinical experts. They want to see genuine AI coordination, not theatrical animations.

**Key needs:** Clear progress indicators, visible agent activity, obvious "wow moment" when the contradiction is discovered, traceable evidence.

### Persona B — Clinical Reviewer
A clinician or clinical informaticist reviewing a completed investigation. They need to verify that the findings are supported by actual records. They are comfortable with clinical terminology and dense information.

**Key needs:** Access to original source records, clear distinction between proposed and verified findings, readable clinical data, timestamp precision.

### Persona C — Technical Inspector
A developer or technical evaluator inspecting the multi-agent execution. They want to see which tools were called, what parameters were used, and how findings were verified.

**Key needs:** Tool execution audit, event history, verification check details, source version/hash provenance.

---

## 3. Design Principles

### A. Professionalism over decoration
Use a refined enterprise visual language, thoughtful typography, restrained colors, clear hierarchy, and consistent components. Avoid excessive gradients, unnecessary animations, decorative dashboards, and generic AI chatbot styling.

### B. Information hierarchy
Users must immediately understand: (1) where they are, (2) what the system is doing, (3) what information matters now, (4) what action they can take next, (5) where to inspect supporting details.

### C. Multi-agent execution visibility
The investigation must visibly communicate genuine agent coordination. Distinguish workflow stages, agent roles, individual agent executions, tasks and investigative leads, actual tool executions, retrieved evidence, findings, and verification. Do not visually imply parallel execution, handoffs, or dependencies unless supported by recorded data.

### D. Evidence-first trust
Every significant finding must provide a clear path to its source records. Preserve provenance, source identifiers, verification status, supporting and contradicting evidence, original source access, and clinical uncertainty. Distinguish source integrity from medical correctness.

### E. Efficiency and comfort
Optimize for usability, not only screenshots. Consider cognitive load, navigation depth, reading comfort, consistent layouts, appropriate whitespace, scannable tables, useful filtering, progressive disclosure, minimal unnecessary clicks, and clear visual feedback.

### F. Real system state
Never invent agent actions, tool calls, evidence, findings, statuses, or clinical conclusions. All proposed live views must be driven by actual backend data. Maintain visible synthetic-data indicators.

---

## 4. Clinical Workspace Architecture

### Navigation
- Persistent left sidebar with four primary items: Overview, Case Library, Patients, Investigations
- Active investigation shortcut in sidebar when an investigation is running
- Full-path breadcrumb in top bar
- Patient chart uses secondary tab navigation: Overview, Timeline, Encounters, Laboratory, Medications, Documents, Imaging

### Key screens
See `ui-design/screen-specifications.md` for full specifications.

1. **Overview Dashboard** — entry point, featured case, recent investigations, workflow explanation
2. **Case Library** — browse all synthetic cases with record availability
3. **Patient Directory** — search and select patients
4. **Patient Chart** — longitudinal clinical record with tab navigation
5. **Document Viewer** — three-column layout with document list, content, and metadata

### Clinical data display rules
- Timestamps formatted as "Oct 19, 2026 14:32 UTC" (ISO value in `dateTime` attribute)
- Timeline events show precision indicators: ⏱ instant, 📅 date-only, ? unknown
- Named timestamps (occurred_at, documented_at, specimen_collected_at) always preserved and labeled
- Laboratory values show reference ranges and abnormality indicators
- Medication records include disclaimer: "Recorded orders do not establish administration or adherence"
- Document type icons distinguish clinical notes, lab reports, prescriptions, radiology, and other types
- Clinical notes with standard sections (Chief Complaint, HPI, Assessment, Plan) rendered with visual hierarchy

---

## 5. Investigation Workspace Architecture

### Navigation
- Investigation directory at `/investigations`
- New investigation at `/investigations/new`
- Workbench at `/investigations/[id]`
- Evidence explorer at `/investigations/[id]/evidence`
- Report at `/investigations/[id]/report`

### Workbench layout (1440px — three columns)
```
Left (190px)          Center (flexible)        Right (280px)
─────────────────     ──────────────────────   ──────────────────
Clinical context      Recent activity (6 ev.)  Evidence inspector
Workflow stages       ─────────────────────    (source panel or
Agent board           Tab navigation           instruction text)
                      ─────────────────────
                      Tab content:
                      Findings | Timeline |
                      Activity | Tasks |
                      Hypotheses
```

### Investigation states
| State | Visual treatment |
|---|---|
| Queued | Neutral badge; "Waiting for worker" message |
| Running | Teal badge; animated progress; live activity feed |
| Completed | Green badge; "Open report →" prominent |
| Completed with limitations | Amber badge; limitations notice |
| Failed | Red badge; alert notice; partial findings available |
| Reconnecting | "Reconnecting — showing persisted state" status |

### Agent board (left panel)
One card per agent showing: name (humanized), status badge (distinct tones), tool call count, last action (humanized tool name), started/completed timestamps. Derived from `investigation.agents[]` and events array. No fabricated data.

### Workflow stages rail (left panel)
Stage events from the event stream. Status icons: ✓ completed, ● running, ○ pending, ✗ failed, ⊘ skipped. Last recorded timestamp per stage.

---

## 6. Information Hierarchy

### Global hierarchy
1. Environment identity (CASETRACE logo + synthetic data banner)
2. Current location (breadcrumb)
3. Primary content (patient record or investigation state)
4. Secondary content (related records, evidence)
5. Tertiary content (metadata, provenance, audit details)

### Investigation workbench hierarchy
1. Investigation status and progress (header)
2. Recent activity (above tabs)
3. Findings (primary tab content)
4. Evidence inspector (right panel)
5. Workflow and agent status (left panel)
6. Full activity history (Activity tab)
7. Execution provenance (collapsible)

---

## 7. Core User Journeys

### Journey 1: Demo path (4 minutes)
```
Overview → [Browse Cases] → CASE-001 → [Open patient chart]
→ Review encounters and timeline → [Start Investigation]
→ Investigation workbench (live) → Watch agent activity
→ Finding appears: "Timeline discrepancy detected"
→ Finding verified → [Explore evidence]
→ Side-by-side source comparison (DOC-021 vs LAB-009)
→ [Open investigation report] → Executive summary → Source index
```

### Journey 2: Clinical review path
```
Patient directory → Select patient → Patient chart
→ Timeline tab (review chronology with precision indicators)
→ Laboratory tab (review trends)
→ Documents tab → Open clinical note (structured sections)
→ [Start Investigation] → Wait for completion
→ Investigation report → Verified findings → Open source evidence
```

### Journey 3: Technical inspection path
```
Investigations directory → Select completed investigation
→ Investigation workbench → Activity tab
→ Tool inspector (paginated tool calls with parameters)
→ Individual agent executions (run IDs, tool counts)
→ Evidence explorer → Select finding → Relationship filter
→ Source panel (version/hash, cited field, excerpt)
→ Verification checks (source existence, timestamp, value)
```

---

## 8. Multi-Agent Presentation Philosophy

The investigation must communicate genuine coordination without fabricating it.

**Show:**
- Which agents participated (from `investigation.agents[]`)
- Their execution status (from agent events)
- How many tools each called (derived from events)
- What their last recorded action was (from most recent tool event)
- When they started and completed (from agent events)
- What findings they proposed (from finding events)
- How findings were verified (from verification checks)

**Do not show:**
- Agent "thinking" or reasoning text
- Parallel execution swimlanes with invented timing
- Agent-to-agent message bubbles
- Confidence percentages not in the backend response
- Dependency graph edges not in the API response
- Any fabricated activity

**Visualization model:** Hybrid orchestration (Approach C from `multi-agent-ux.md`):
- Stage level: workflow rail
- Agent level: agent board cards
- Tool level: activity feed + tool inspector

---

## 9. Evidence-First Interaction Model

Every significant finding must provide a clear path to its source records.

### Navigation path
```
Finding card → "Inspect finding evidence" link
→ Evidence explorer (finding pre-selected)
→ Relationship filter (defaults to "contradicts" for timeline_contradiction)
→ Source anchor button (e.g., "DOC-021 · document · contradicts")
→ SourcePanel (cited field, excerpt, version/hash)
→ "Open in hospital workspace" link
→ Document viewer (with "Return to investigation" link)
```

### Evidence display rules
- Source anchor buttons show: `{source_id} · {source_type} · {relationship}`
- SourcePanel shows: cited field, relationship, encounter ID, exact excerpt (highlighted), version/hash
- Version mismatch warning: "This record may have been updated since the investigation ran. The original verified version is no longer identical to the current record."
- Side-by-side comparison: triggered by "Compare source records" on findings with multiple anchors
- Source integrity ≠ medical correctness: always shown as a disclaimer

### Finding status vocabulary
| Status | Meaning | Visual treatment |
|---|---|---|
| Proposed | Agent proposed; not yet verified | Soft blue card, ! icon |
| Verified | Deterministic checks passed | Green card, ✓ icon |
| Unresolved | Insufficient evidence to verify or reject | Amber card, ? icon |
| Rejected | Evidence does not support the claim | Red card, ✗ icon |

---

## 10. Navigation and Layout Standards

### Shell
- Left sidebar: 232px, collapsible, dark navy (`#101d32`)
- Top bar: white, border-bottom, breadcrumb left, environment banner right
- Main content: max-width 1600px, padding 24px (desktop), 16px (mobile)

### Typography
- Font: Inter, ui-sans-serif, system-ui
- h1: clamp(1.65rem, 3vw, 2rem), weight 650, letter-spacing -0.035em
- h2: 1.1rem, weight 600, letter-spacing -0.02em
- Body: 14px, line-height 1.6
- Metadata/labels: 12px
- Monospace (IDs, hashes): ui-monospace
- Timestamps: formatted human-readable (not raw ISO)
- Tabular numerals for lab values and timestamps

### Color tokens (existing, from `globals.css`)
```
--background: #f4f7fb    (page background)
--card: #ffffff          (surface)
--foreground: #17243a    (primary text)
--muted-foreground: #66758a  (secondary text)
--primary: #2856a6       (blue — primary actions)
--teal: #168a83          (teal — active/running states, investigation)
--success: #217a55       (green — verified/completed)
--warning: #a86612       (amber — proposed/unresolved/limitations)
--destructive: #b53b46   (red — failed/rejected)
--border: #dfe6ef        (borders)
--sidebar: #101d32       (sidebar background)
```

### New status tone classes (Phase 2)
```
.status-active    { color: #168a83; background: #e8f7f5; }  /* running */
.status-neutral   { color: #66758a; background: #f0f2f5; }  /* queued/cancelled */
.status-proposed  { color: #2856a6; background: #edf3ff; }  /* proposed */
```

### Spacing
- Consistent 4px base unit
- Card padding: 22px desktop, 15px mobile
- Section gap: 20px
- Table cell padding: 13px 15px

### Component patterns
- Cards: `border: 1px solid var(--border); border-radius: 12px; background: white`
- Tables: `clinical-table` class — compact, left-aligned, hover highlight
- Status badges: `status-badge` class — pill shape, 11px, weight 650
- Source links: `source-link` class — monospace, bordered, small
- Primary actions: `action-link` class — blue background, white text

---

## 11. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| ≥1280px | Three-column investigation workbench; two-column evidence explorer |
| 1024–1279px | Two-column workbench (context + main); evidence as drawer; sidebar collapsible |
| 768–1023px | Single-column workbench; sidebar collapsed by default; evidence as full-width drawer |
| <768px | Single column; sidebar hidden (hamburger); investigation workbench read-only browsing |

Desktop (1440px) is the primary demo target. All screens must be functional at 1024px.

---

## 12. Accessibility Expectations

- Semantic HTML: `<main>`, `<nav>`, `<aside>`, `<article>`, `<section>`, `<header>`, `<h1>`–`<h3>`
- Skip-to-content link (already implemented)
- Keyboard navigation: all interactive elements reachable via Tab; no keyboard traps
- Focus indicators: visible on all focusable elements (2px solid `var(--primary)`, 4px offset)
- Status announcements: `role="status"` for connection state, `role="alert"` for errors
- Color: never the only differentiator — always paired with text label or icon
- Tables: `<th scope="col">` for all column headers
- Images: `alt` text for all meaningful images; `aria-hidden` for decorative
- Reduced motion: existing `prefers-reduced-motion` rules preserved
- Contrast: WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)

---

## 13. Data Integrity and Execution Authenticity Constraints

These constraints are non-negotiable and must be preserved through all redesign phases.

1. **No fabricated activity.** Every agent card, tool call, and finding displayed must originate from a backend event or API response.
2. **No invented timestamps.** All timestamps come from the backend. The `Time` component formats them but does not invent them.
3. **No confidence percentages.** The backend does not emit numerical confidence. Do not display percentages.
4. **No chain-of-thought.** Agent reasoning is not exposed. Do not display "thinking" text.
5. **No ground truth.** The frontend must never receive or display evaluation answer keys.
6. **Proposed ≠ verified.** The visual distinction between proposed and verified findings must be maintained at all times.
7. **Source integrity ≠ medical correctness.** Always show this disclaimer near evidence panels.
8. **Synthetic data label.** "SYNTHETIC DATA — DEMONSTRATION ENVIRONMENT" must be visible in the shell at all times.
9. **Version/hash provenance.** Source panels must always show `source_version` and `source_hash`.
10. **Version mismatch warning.** If the current record differs from the investigation anchor, the warning must be shown.

---

## 14. Links to Supporting Design Documents

| Document | Purpose |
|---|---|
| `ui-design/ux-audit.md` | Prioritized findings matrix with severity, evidence, and resolution |
| `ui-design/information-architecture.md` | Navigation hierarchy, route map, cross-workspace navigation |
| `ui-design/screen-specifications.md` | Per-screen layout, interactions, states, data dependencies |
| `ui-design/multi-agent-ux.md` | Visualization feasibility matrix; recommended approach |
| `ui-design/component-inventory.md` | Component mapping, sensitive areas, new components required |
| `ui-design/refinement-roadmap.md` | 10-phase implementation plan with risks and acceptance criteria |
| `docs/casetrace-ui-design/ui-design.md` | Original prototype design specification (historical reference) |
| `docs/frontend-architecture.md` | Frontend architecture and component organization |
| `docs/frontend-backend-contract.md` | API contracts and SSE event types |
| `docs/multi-agent-architecture.md` | Agent roles, tool permissions, orchestration |
| `docs/evidence-contract.md` | Anchor schema, verification rules, source provenance |

---

## 15. Outstanding Decisions Requiring Product-Owner Review

### Decision 1: Active investigation sidebar shortcut
**Question:** Should the sidebar show a shortcut to the currently running investigation?
**Recommended default:** Yes — use `sessionStorage` to track the most recently created investigation ID. Show "● INV-xxxx" in the sidebar when the investigation is running. Clear on terminal state.
**Alternative:** No shortcut — users navigate via the Investigations directory.
**Impact:** Medium. Improves demo flow significantly.

### Decision 2: Objective selector in new investigation
**Question:** Should users be able to select an investigation objective (full_record, timeline, contradiction, medication, laboratory)?
**Recommended default:** Yes — show a select with `full_record_investigation` as default. Other objectives are supported by the backend.
**Alternative:** Always use `full_record_investigation` (current behavior).
**Impact:** Low for demo; medium for multi-case evaluation.

### Decision 3: Clinical note section parsing
**Question:** Should the document viewer attempt to parse structured sections from clinical note text?
**Recommended default:** Yes — use a simple regex parser for common headers (Chief Complaint, HPI, Assessment, Plan). Fall back to plain text on failure.
**Alternative:** Always render as plain text.
**Impact:** Medium. Significantly improves readability of CASE-001 clinical notes.

### Decision 4: `earliest_encounter_at` in patient header
**Question:** Should the patient header show the record date range (earliest to latest encounter)?
**Recommended default:** Yes — add `earliest_encounter_at` to the `PatientSummary` backend response.
**Alternative:** Derive from encounter list on frontend (requires an extra API call).
**Impact:** Low. Requires a minor backend addition.

### Decision 5: Tasks & leads tab visibility
**Question:** Should the Tasks & leads tab be hidden for baseline strategy runs?
**Recommended default:** Yes — detect by checking for `task.*` events after investigation completes. If none, replace tab with a notice.
**Alternative:** Always show the tab with the "Baseline execution" message (current behavior).
**Impact:** Low. Reduces confusion for demo evaluators.

### Decision 6: Report execution provenance default state
**Question:** Should the execution provenance section be open or closed by default in the report?
**Recommended default:** Open — showing that real agents ran is important for demo credibility.
**Alternative:** Closed (current behavior) — keeps the report focused on findings.
**Impact:** Low. Affects demo presentation flow.

### Decision 7: Dependency graph visualization
**Question:** Should the investigation workbench show a hardcoded agent dependency graph for baseline runs?
**Recommended default:** No — use the hybrid orchestration visualization (workflow rail + agent board + activity feed) instead. A hardcoded graph would misrepresent adaptive runs.
**Alternative:** Show a hardcoded graph for baseline runs only, with a clear label.
**Impact:** Medium. The hybrid approach is safer and more accurate.
