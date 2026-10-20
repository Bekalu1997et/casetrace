# CASETRACE UI Design Specification

**Status:** Initial design baseline  
**Purpose:** Define the visual system, navigation, screens, interaction patterns, and frontend implementation boundaries before translating the prototype into Next.js.

## 1. Product experience

CASETRACE is an AI clinical investigation workbench built around two connected environments:

1. **Hospital records** — the simulated clinical information system containing longitudinal patient data.
2. **Investigation workbench** — the controlled multi-agent workflow that retrieves, connects, and verifies evidence.

The product must not look like a generic chatbot. The primary interaction is an evidence-backed investigation with visible tool activity and traceable source records.

## 2. Design goals

- Establish clinical credibility without copying a specific hospital vendor.
- Make the patient timeline and source provenance easy to inspect.
- Make agent activity observable without exposing hidden chain-of-thought.
- Distinguish a proposed finding from a verified finding.
- Let users navigate from a report claim to its source document or record.
- Keep the primary CASE-001 demo understandable within a short live presentation.
- Use synthetic data only; visibly label the environment as a demo/synthetic dataset.

## 3. Information architecture

### Primary navigation

- **Overview** — recent investigations, available synthetic cases, and system status.
- **Patients** — searchable patient list.
- **Hospital Records** — patient chart, encounters, labs, medications, documents, and imaging.
- **Investigations** — investigation list and individual investigation workbench.
- **Case Library** — synthetic case inventory and readiness state. Ground truth is not exposed here in the runtime UI.
- **System Activity** — recent tool executions and investigation events, for debugging/demo observability.

### Main demo path

`Overview → Patient chart → Start investigation → Live investigation workbench → Verified finding → Open source evidence → Final report`

## 4. Screen inventory

| Screen | File | Purpose |
|---|---|---|
| Overview dashboard | `index.html` | Entry point and demo overview |
| Patient chart | `screens/patient-chart.html` | Hospital-style longitudinal record |
| Investigation workbench | `screens/investigation-workbench.html` | Core multi-agent experience |
| Investigation report | `screens/investigation-report.html` | Evidence-backed final report |
| Design system | `ui-design.md` | Shared rules and implementation guidance |

The pages are HTML-first design prototypes. They are not the final production frontend and do not connect to a backend.

## 5. Visual direction

### Personality

- Clinical, calm, precise, modern.
- Dense enough to feel like professional software, but with clear hierarchy.
- Use a restrained dark navy/blue foundation, neutral surfaces, and teal for active investigation states.
- Reserve amber for uncertainty and warnings; reserve green for verified outcomes; reserve red for high-priority contradictions only when justified.
- Avoid excessive gradients, glowing AI motifs, decorative brain imagery, and consumer-chat UI patterns.

### Layout

- Desktop-first for the hackathon demo.
- Persistent left navigation.
- Compact top bar with environment label, search, and user/demo status.
- Main content uses a 12-column grid or equivalent CSS grid.
- Investigation workbench uses three functional areas:
  1. workflow and agents,
  2. timeline/findings,
  3. evidence/source detail.
- Allow responsive collapse for narrower screens; the core demo is optimized for laptop presentation.

## 6. Design tokens

Suggested CSS variables:

```css
:root {
  --color-ink: #17243a;
  --color-muted: #66758a;
  --color-primary: #2856a6;
  --color-primary-strong: #1d4388;
  --color-teal: #168a83;
  --color-bg: #f4f7fb;
  --color-surface: #ffffff;
  --color-border: #dfe6ef;
  --color-soft-blue: #edf3ff;
  --color-soft-teal: #e8f7f5;
  --color-warning: #a86612;
  --color-soft-warning: #fff4df;
  --color-danger: #b53b46;
  --color-soft-danger: #fff0f1;
  --color-success: #217a55;
  --color-soft-success: #e8f7ef;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-card: 0 4px 18px rgba(26, 45, 78, .06);
}
```

Use a readable sans-serif stack such as `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

## 7. Shared components

Build these as reusable React components later:

- `AppShell`
- `SidebarNavigation`
- `TopBar`
- `EnvironmentBadge`
- `PageHeader`
- `StatCard`
- `PatientIdentityHeader`
- `EncounterList`
- `ClinicalTimeline`
- `LabResultTable`
- `MedicationTable`
- `DocumentList`
- `EvidenceReference`
- `AgentStatusCard`
- `ToolExecutionRow`
- `FindingCard`
- `VerificationBadge`
- `EvidenceDrawer` or `SourceDetailPanel`
- `InvestigationProgress`
- `ReportSection`
- `EmptyState`
- `ErrorState`
- `LoadingSkeleton`

## 8. Overview dashboard

Must answer at a glance:

- What is CASETRACE?
- Which synthetic cases are available?
- Which investigations are active or complete?
- What is the fastest path to start the demo?

Recommended content:
- Header: “Clinical investigation workspace”
- Clear synthetic/demo environment label
- Summary cards: available cases, active investigations, completed investigations, verified findings
- Featured CASE-001 card with “Open patient chart” and “Start investigation”
- Recent investigation activity feed
- A concise three-step explanation: retrieve records → investigate contradictions → verify evidence

Do not invent live backend counts in production. Prototype values must be labelled as demo data.

## 9. Patient chart

The patient chart should resemble a credible longitudinal EHR view, not a marketing page.

Header:
- Synthetic patient identifier
- Display name
- Date of birth and sex
- Explicit “Synthetic patient” label
- Primary action: “Start investigation”

Tabs:
- Summary
- Timeline
- Encounters
- Labs
- Medications
- Documents
- Imaging

Summary should show recent encounters, key lab trends, active medication records, and recent documents. Timeline entries must distinguish clinical event time from documentation time when both are known. Never visually imply that a note's authored date is necessarily the event date.

## 10. Investigation workbench

This is the hero screen.

### Header
- Investigation ID and status
- Patient identity
- Objective/question
- Start time and elapsed time (only when supported by runtime data)
- Status: queued, running, completed, failed, or partial

### Workflow rail
Show controlled workflow stages:
1. Record discovery
2. Timeline reconstruction
3. Specialist analysis (lab and medication agents can run in parallel)
4. Contradiction verification
5. Evidence-backed synthesis

### Agent activity
Each agent card should display:
- Agent name and role
- Status: queued / running / completed / failed
- Current task summary
- Completed tool calls
- Sources retrieved
- Timestamp of last event

Show observable actions and structured task summaries. Do not show hidden chain-of-thought or fabricated “thinking” text.

### Timeline and findings
- Chronological event stream with source ID and timestamp type.
- Candidate findings visually distinct from verified findings.
- A candidate contradiction must not be presented as fact until verification is complete.
- Show which records support, contradict, or contextualize a finding.

### Evidence/source panel
- Source type and stable ID
- Document title or record label
- Event time and authored/documented time where applicable
- Excerpt or structured values
- Open-source action
- Link back to the patient chart

### Live behavior
The real app will consume persisted REST state and SSE events:
- REST provides current investigation state.
- SSE provides activity updates.
- On reconnect, fetch the investigation state and reconcile events.
- Do not fake backend activity. The static prototype may use clearly demo-only sample events.

## 11. Investigation report

The report must make the conclusion auditable.

Sections:
1. Investigation question
2. Executive finding
3. Classification and verification status
4. Reconstructed timeline
5. Evidence supporting the finding
6. Conflicting or contextual evidence
7. Alternative explanations considered
8. Limitations and unresolved uncertainty
9. Source index

Each important claim must reference one or more source records. Source references should be clickable and open a source detail view. Do not present model confidence as a substitute for evidence.

Use the terms “verified finding,” “candidate finding,” and “unresolved” consistently.

## 12. Status and badge semantics

- **Running:** blue/teal, with an activity icon.
- **Verified:** green.
- **Candidate / needs review:** amber.
- **Failed:** red.
- **Queued / inactive:** neutral grey.
- **Partial:** amber-neutral; explain what did not complete.

Never use color alone to communicate status. Include text labels and accessible contrast.

## 13. Interaction rules

- Buttons must have a clear action.
- Use links for navigation and buttons for actions.
- Clicking a source reference should reveal the source record or document.
- Filters should preserve visible selection state.
- Tables should include empty, loading, and error states.
- Keep important evidence visible; do not hide all details behind modals.
- Avoid irreversible actions in the demo.
- Every prototype-only action should be labelled or behave as a local demonstration.

## 14. Accessibility

- Semantic landmarks and headings.
- Keyboard-accessible navigation and controls.
- Visible focus indicators.
- Sufficient text/background contrast.
- Labels for icon-only controls.
- Status text in addition to color.
- Avoid very small text for evidence excerpts and record metadata.

## 15. Next.js implementation mapping

Suggested frontend structure:

```text
apps/web/
  app/
    (workspace)/
      layout.tsx
      page.tsx
      patients/
        page.tsx
        [patientId]/
          page.tsx
      investigations/
        page.tsx
        [investigationId]/
          page.tsx
        [investigationId]/report/
          page.tsx
      cases/
        page.tsx
  components/
    layout/
    patients/
    records/
    investigations/
    evidence/
    ui/
  lib/
    api/
      client.ts
      patients.ts
      records.ts
      investigations.ts
    events/
      investigation-stream.ts
  types/
```

Use TypeScript for API types. Centralize the API base URL in environment configuration. Do not hardcode endpoint URLs inside individual components.

## 16. Backend integration boundary

The frontend should consume the contracts defined in:
- `docs/frontend-backend-contract.md`
- `docs/hospital-api.md`
- `docs/agent-tools.md`

The browser must not call internal agent tools directly. It calls the application API. Agent tool execution is orchestrated by the backend and displayed through persisted events.

## 17. Demo acceptance criteria

The UI design is accepted when a reviewer can:

1. Identify the environment as synthetic.
2. Open CASE-001's patient chart.
3. Inspect encounters, labs, medications, and documents.
4. Start or view an investigation.
5. See which agents ran and which tools were called.
6. Follow a finding to its source records.
7. Distinguish a candidate from a verified contradiction.
8. Read a final report with traceable evidence.
9. Understand uncertainty and limitations.

**Design principle:** CASETRACE should make the investigation process observable and the final claim auditable. The interface must communicate evidence, not theatrics.
