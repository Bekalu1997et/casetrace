# Phase 04 — Patient Record and Clinical Source Explorer

## Baseline

- Branch: `refactor/interface`
- Baseline commit: `d67f72f85ba42451075a02fbadd219cb909b2a05`
- Initial worktree: clean
- Scope: frontend-only patient, clinical record, encounter, and document UX

## Files examined

- `apps/web/features/patients/components/patient-directory.tsx`
- `apps/web/features/patients/components/chart-layout.tsx`
- `apps/web/features/patients/components/chart-overview.tsx`
- `apps/web/features/patients/components/clinical-list.tsx`
- `apps/web/features/encounters/components/encounter-detail.tsx`
- `apps/web/features/documents/components/document-detail.tsx`
- `apps/web/features/documents/components/document-asset.tsx`
- `apps/web/features/records/components/record-links.tsx`
- `apps/web/features/records/navigation.ts`
- `apps/web/features/patients/hooks/use-chart.ts`
- `apps/web/types/hospital.ts`
- `apps/web/tests/hospital-workspace.test.tsx`

## Implementation summary

The patient record experience now presents stable identity metadata, readable date
values, explicit source navigation, and clearer record grouping. The changes reuse
the existing `useChart`, `useResource`, hospital API, route helpers, asset viewers,
and patient-scoped source validation. No backend endpoint, database schema, case
data, investigation workflow, or evidence verification behavior was changed.

### Patient directory and chart

- Patient rows use structured metadata for synthetic identifier, patient ID, and case ID.
- Rows provide separate `Open chart` and supported `/investigations/new` actions.
- The directory does not invent per-row encounter totals or latest dates; those fields
  are not present in the directory contract.
- The chart header exposes display name, synthetic identifier, patient ID, case ID,
  date of birth, recorded sex, encounter count, and latest encounter.
- The chart explicitly documents that earliest encounter is unavailable rather than
  deriving an apparent date range from a partial record page.
- Existing route-based chart navigation and identity-protected hooks remain in place.

### Clinical records, timeline, labs, medications, and imaging

- Compact record sections expose links to their complete route where a supported route exists.
- Table headings are humanized and date-bearing fields show precision indicators.
- Date-only values remain date-only; invalid or unknown values remain visibly undocumented.
- Laboratory zero values continue to render as `0`, while missing values remain
  `Not documented`; no units or reference ranges are inferred.
- Medication disclaimer and recorded status semantics remain unchanged.
- Existing lab trend, imaging asset, pagination, filtering, and source-link behavior
  remain wired to the existing APIs.

### Encounters and documents

- Encounter detail has an explicit route back to the encounter list and a related-record
  grouping heading.
- Same-encounter document browsing remains patient-scoped and now indicates when the
  100-document nearby result is incomplete.
- Document metadata distinguishes original file availability from text-record availability.
- Clinical notes use a deterministic presentation-only parser for supported exact headings
  such as HPI, Assessment, Plan, and Follow-up. Unstructured notes render as unchanged
  preformatted text. The original backend text remains the canonical source for offsets,
  hashes, anchors, and verification.
- PDF/image viewers and synthetic asset labeling were not rewritten.

## Accessibility and data correctness

The updated UI retains semantic headings, labeled definition lists, route links, table
headers, keyboard-focusable controls, accessible navigation labels, and explicit text
alongside status/precision icons. Narrow tables continue to use the existing controlled
scroll region rather than causing page-wide overflow.

Source identity, patient ownership, encounter IDs, document IDs, evidence anchors, and
canonical text are preserved. No unsupported clinical interpretation or causal claim
was added.

## Validation

Executed from `apps/web`:

- `pnpm.cmd typecheck` — passed
- `pnpm.cmd lint` — passed with zero warnings
- Focused clinical workspace and note tests — 18 passed
- Affected directory/workspace suites — 32 passed
- `pnpm.cmd exec vitest run --testTimeout=15000` — 148 tests passed across 12 files
- Browser inspection — not performed
- `pnpm.cmd build` — passed; production routes generated successfully

## Deferred enhancements and known limitations

1. The current patient summary has no `earliest_encounter_at`; a complete record
   date range requires a future authoritative summary field.
2. The directory API has no efficient per-row encounter/date summary, so N+1 requests
   were intentionally not added.
3. The directory investigation action reaches the existing safe launch route but
   does not invent unsupported patient preselection query behavior.
4. The overview still uses the existing independent clinical resource boundaries;
   introducing a new loading orchestration would require broader hook changes.
5. Visual browser verification at the requested breakpoints remains outstanding.

## Phase 05 readiness

The patient chart, source links, document viewer, record tables, asset viewers, and
patient-scoped evidence navigation are reusable for the Investigation Command Center.
Investigation-specific restructuring remains limited to the existing workbench,
activity, workflow, findings, and report components and can proceed without changing
the clinical source contracts.
