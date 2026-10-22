# CASETRACE — Information Architecture

**Branch:** `refactor/interface`
**Scope:** Proposed navigation hierarchy, screen responsibilities, and cross-workspace navigation for the redesigned interface.

---

## 1. Two Primary Environments

CASETRACE has two distinct working environments that share underlying data and identifiers.

```
CASETRACE
├── Environment A: Clinical Case Workspace
│   Purpose: Explore synthetic patient records before and during investigation.
│   Feel: Professional clinical software — calm, structured, information-dense.
│
└── Environment B: Investigation Command Center
    Purpose: Observe and inspect multi-agent investigation execution.
    Feel: Intelligence investigation workspace + orchestration console.
```

These environments are not separate applications. They share the same shell, the same patient identifiers, and the same source records. A user moves between them fluidly — from a clinical record into an investigation, and from an investigation finding back to the original clinical record.

---

## 2. Proposed Global Navigation

### Primary Sidebar Navigation (persistent, collapsible)

```
CASETRACE
─────────────────────
Overview              /
─────────────────────
CLINICAL WORKSPACE
  Case Library        /cases
  Patients            /patients
─────────────────────
INVESTIGATION
  Investigations      /investigations
─────────────────────
[Active investigation shortcut — shown only when an investigation is running]
  ● INV-xxxx          /investigations/[id]
─────────────────────
```

**Rationale for grouping:**
- "Case Library" and "Patients" are both entry points to clinical records. Grouping them under "Clinical Workspace" communicates their shared purpose.
- "Investigations" is the entry point to the investigation environment. It is kept separate to reinforce the two-environment model.
- The active investigation shortcut surfaces the most important current action without requiring navigation to the directory.

### Top Bar (persistent)

```
[CASETRACE logo]  [Breadcrumb]  [SYNTHETIC DATA — DEMONSTRATION ENVIRONMENT]
```

The top bar is minimal. The environment banner is always visible. No global search in the initial implementation (deferred).

---

## 3. Route Hierarchy

All existing routes are preserved. The following additions and clarifications are proposed.

```
/                                    Overview dashboard
/cases                               Case library
/cases/[caseId]                      Case detail
/patients                            Patient directory
/patients/[patientId]                Patient chart (overview tab)
/patients/[patientId]/timeline       Clinical timeline
/patients/[patientId]/encounters     Encounter list
/patients/[patientId]/encounters/[encounterId]   Encounter detail
/patients/[patientId]/labs           Laboratory results + trends
/patients/[patientId]/medications    Medication history
/patients/[patientId]/documents      Document list
/patients/[patientId]/documents/[documentId]     Document viewer
/patients/[patientId]/imaging        Imaging studies
/patients/[patientId]/source         Patient-scoped source inspector (existing)
/investigations                      Investigation directory
/investigations/new                  New investigation launch
/investigations/[id]                 Investigation workbench (command center)
/investigations/[id]/evidence        Evidence explorer
/investigations/[id]/report          Investigation report
```

No route changes are required. The proposed redesign works within the existing route structure.

---

## 4. Screen Responsibility Map

### Clinical Workspace Screens

| Screen | Primary Responsibility | Secondary Responsibility |
|---|---|---|
| Overview (`/`) | Entry point; show available cases and recent investigations | Quick-start path to demo |
| Case Library (`/cases`) | Browse all synthetic cases by availability and record type | Launch investigation from case |
| Case Detail (`/cases/[id]`) | Show full record inventory for one case | Link to patient chart and investigation |
| Patient Directory (`/patients`) | Search and select a synthetic patient | Entry point to clinical records |
| Patient Chart (`/patients/[id]`) | Show patient identity and record summary | Launch investigation |
| Clinical Timeline (`/patients/[id]/timeline`) | Chronological event view with timestamp semantics | Filter by event type and date range |
| Encounter List (`/patients/[id]/encounters`) | List all encounters with department and dates | Navigate to encounter detail |
| Encounter Detail (`/patients/[id]/encounters/[id]`) | Show one encounter with associated records | Navigate to documents and observations |
| Laboratory (`/patients/[id]/labs`) | Show observations with longitudinal trend chart | Filter by analyte; open source records |
| Medications (`/patients/[id]/medications`) | Show medication history with status | Filter by status; open source records |
| Documents (`/patients/[id]/documents`) | List clinical documents with type and dates | Open document viewer |
| Document Viewer (`/patients/[id]/documents/[id]`) | Render document content and asset | Show metadata; link to encounter |
| Imaging (`/patients/[id]/imaging`) | List imaging studies with modality | Show synthetic image assets |

### Investigation Workspace Screens

| Screen | Primary Responsibility | Secondary Responsibility |
|---|---|---|
| Investigation Directory (`/investigations`) | List all investigations with status and filters | Resume or inspect any investigation |
| New Investigation (`/investigations/new`) | Select patient and launch investigation | Show record inventory before launch |
| Investigation Workbench (`/investigations/[id]`) | Live command center: agents, activity, findings | Evidence inspection; source comparison |
| Evidence Explorer (`/investigations/[id]/evidence`) | Navigate from finding to original source | Side-by-side source comparison |
| Investigation Report (`/investigations/[id]/report`) | Present final evidence-backed report | Source index; print/export |

---

## 5. Primary and Secondary Actions Per Screen

| Screen | Primary Action | Secondary Actions |
|---|---|---|
| Overview | Start Investigation | Browse Cases, View Investigations |
| Case Library | Open Case | Open Patient Chart, Start Investigation |
| Patient Chart | Start Investigation | Navigate chart tabs |
| Clinical Timeline | Open source record | Filter events, Compare sources |
| Investigation Workbench | Open evidence inspector | Navigate tabs, Compare sources, Open report |
| Evidence Explorer | Open original source | Compare sources, Return to workbench |
| Investigation Report | Open cited evidence | Print report, Return to workbench |

---

## 6. Cross-Workspace Navigation

The most important navigation pattern in CASETRACE is moving between a clinical record and its investigation context without losing orientation.

### Pattern A: Clinical Record → Investigation

```
Patient Chart
  → "Start Investigation" button
  → /investigations/new (pre-filled with patient)
  → /investigations/[id] (after creation)
```

### Pattern B: Investigation Finding → Original Clinical Record

```
Investigation Workbench (finding card)
  → Click source anchor button (e.g., "DOC-021 · supports")
  → SourcePanel opens in right column (inline, no navigation)
  → "Open in hospital workspace" link
  → /patients/[patientId]/documents/[documentId]?from=investigation&investigation=[id]&finding=[id]
```

The `from`, `investigation`, and `finding` query parameters allow the document viewer to show a "Return to investigation" link with context preserved.

### Pattern C: Investigation Report → Original Clinical Record

```
Investigation Report (source index or finding card)
  → Click source reference
  → SourcePanel opens inline
  → "Open in hospital workspace" link
  → /patients/[patientId]/[section]/[recordId]?from=report&investigation=[id]
```

### Pattern D: Clinical Record → Investigation Context

```
/patients/[patientId]/documents/[documentId]?from=investigation&investigation=[id]
  → "Return to investigation" link in document header
  → /investigations/[id]
```

This return link is already partially implemented via `hospitalSourceHref` in `features/records/navigation.ts`. The proposed redesign makes it more prominent.

---

## 7. Deep-Linking Requirements

| Scenario | URL Pattern | State to Preserve |
|---|---|---|
| Share a specific finding | `/investigations/[id]/evidence?finding=[findingId]` | Finding selection, relationship filter |
| Share a source comparison | `/investigations/[id]/evidence?compare=[type:id]&compare=[type:id]` | Both source selections |
| Share a specific document with investigation context | `/patients/[id]/documents/[docId]?from=investigation&investigation=[invId]&finding=[findingId]` | Return navigation context |
| Share a report | `/investigations/[id]/report` | No additional state needed |

All deep links must work after a page refresh. State must be reconstructable from URL parameters alone, using only identifiers (never clinical content in URLs).

---

## 8. Context Preservation Behavior

### Patient Context
When a user navigates from a patient chart into an investigation and back, the patient chart should return to the same tab they were on. This is handled by the browser's back button naturally with the current route structure.

### Investigation Context
When a user navigates from the investigation workbench to the evidence explorer and back, the workbench should restore:
- The previously selected tab (Findings, Timeline, Activity, etc.)
- The previously selected finding filter state

This requires storing tab state in the URL or in sessionStorage. Currently tab state is lost on navigation. Proposed: add `?tab=findings` to the workbench URL.

### Source Selection Context
Source selections are already stored in URL parameters via `use-evidence-selection.ts`. This is correct and should be preserved.

---

## 9. Responsive Navigation Strategy

### Desktop (≥1280px)
- Sidebar always visible, collapsible
- Three-column investigation workbench
- Two-column evidence explorer

### Laptop (1024–1279px)
- Sidebar collapsible (starts expanded)
- Two-column investigation workbench (context + main; evidence as drawer)
- Two-column evidence explorer

### Tablet (768–1023px)
- Sidebar collapsed by default, toggle to expand
- Single-column investigation workbench with tab navigation
- Evidence inspector as full-width drawer

### Mobile (<768px)
- Sidebar hidden, accessible via hamburger menu
- Single-column layout throughout
- Investigation workbench: header + tabs only; evidence as full-screen overlay
- Note: Full investigation command center is optimized for desktop; mobile is read-only browsing

---

## 10. Navigation Anti-Patterns to Avoid

- **Do not** use modals for primary content (source records, findings). Use inline panels or dedicated routes.
- **Do not** require more than 3 clicks to reach any primary content from the overview.
- **Do not** lose investigation context when navigating to a source record.
- **Do not** show the same information in two places without a clear reason (e.g., findings in both center panel and right panel fallback).
- **Do not** use the browser back button as the only way to return from a source record to an investigation.
