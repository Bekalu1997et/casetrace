# Phase 03 — Clinical Entry Refinement Report

**Branch:** `refactor/interface`
**Baseline commit:** `ebceb6f` (Prompt 02 — Design System and Application Shell)
**Phase scope:** `/`, `/cases`, `/cases/[caseId]`

---

## Baseline Conditions

- Prompt 02 committed and verified: 120 frontend tests passing, build clean.
- Design system tokens, `StatusBadge`, `Time`, `SkeletonLoader`, `WarningNotice`, `InfoNotice` all available.
- Working tree clean at phase start.

---

## Implemented Changes

### A. Overview Dashboard (`/`)

**File:** `apps/web/features/dashboard/components/overview.tsx`

1. **Primary CTA fixed** — "Start Investigation" now links to `/investigations/new` (was `/patients`).
2. **Featured case selection** — Prefers `CASE-001` when imported; falls back to first imported case; shows `InfoNotice` when no imported case exists. Non-imported cases are never featured.
3. **Metrics** — Four primary metrics: Available cases (from `pagination.total`), Imported patients (from directory callback), Active investigations (running + queued), Completed investigations (completed + completed_with_limitations). Derived encounter/document counts only shown when `!has_more`.
4. **Skeleton loading** — `SkeletonMetricGrid` replaces plain `LoadingState` for metrics; `SkeletonLoader variant="card"` for featured case.
5. **Featured case card** — Shows case ID, patient name, encounter/document counts, latest encounter (formatted via `Time`), modality badges, and navigation actions. Only imported cases show the featured card.
6. **Patient directory section** — Labeled "Synthetic Patient Directory" with "View all patients →" link. `PatientDirectory` embedded below with `onTotal` callback preserved.
7. **Design system** — Uses `StatusBadge`, `Time`, `InfoNotice`, `ErrorState`, `SkeletonMetricGrid`, `SkeletonLoader`.

### B. Case Library (`/cases`)

**File:** `apps/web/features/cases/components/case-library.tsx`

1. **Case cards** — Redesigned with `StatusBadge`, formatted `Time` for latest encounter, modality badges, record counts with emphasis, dataset info, and status-specific not-ready notices.
2. **Chart link** — Available when `patient_id` exists, regardless of `display_name`. Removed the `display_name` requirement that previously blocked the link.
3. **Modality badges** — Conservative mapping: `laboratory`/`observations` → "Labs", `medications` → "Medications", `documents` → "Documents", `imaging` → "Imaging", `radiology` → "Radiology", `referrals` → "Referrals". Unrecognized values shown as-is.
4. **Filters** — Status filter applies immediately on change. Case ID search submits on button click or Enter. "Clear filters" button appears when any filter is active and resets both controls + offset.
5. **Pagination** — Shows "Showing X–Y of N cases" range. Previous/Next disabled correctly. Offset resets to 0 when filters change.
6. **Empty states** — Distinct messages: filtered empty ("No cases match the current filters. Try clearing the filters…") vs. unfiltered empty ("No cases available. Import a validated canonical case…").
7. **Skeleton loading** — 4 skeleton cards shown while loading.
8. **Not-ready notices** — Status-specific explanations for `not_present`, `missing_assets`, `invalid`, `source_conflict`.

### C. Case Detail (`/cases/[caseId]`)

**File:** `apps/web/features/cases/components/case-library.tsx` (same file, `CaseDetail` export)

1. **Layout** — Back link to Case Library, eyebrow + h1 header, `CaseCard` with `detail=true`, `WarningNotice` for non-imported cases, `InvestigationHistory` for imported cases.
2. **Record inventory** — Full `counts` object rendered as `hospital-metrics` grid in detail mode.
3. **Latest encounter** — Formatted via `Time` component; not shown when null.
4. **Non-imported warning** — `WarningNotice` explains the case is not imported and investigation is unavailable.
5. **Skeleton loading** — Card + content skeletons while loading.

---

## Screen-by-Screen Results

### `/` — Overview Dashboard

| Requirement | Status |
|---|---|
| CTA links to `/investigations/new` | ✓ |
| Featured case prefers CASE-001 | ✓ |
| Featured case falls back to first imported | ✓ |
| No featured card when no imported cases | ✓ |
| Metrics from real API totals | ✓ |
| No derived counts when `has_more` | ✓ |
| Skeleton loading states | ✓ |
| Error state with retry | ✓ |
| Patient directory with "View all" link | ✓ |

### `/cases` — Case Library

| Requirement | Status |
|---|---|
| Case cards with status badges | ✓ |
| Chart link without display_name requirement | ✓ |
| Investigation only for imported cases | ✓ |
| Modality badges from actual data | ✓ |
| Latest encounter formatted | ✓ |
| Status filter applies immediately | ✓ |
| Case ID search on submit | ✓ |
| Clear filters button | ✓ |
| Pagination range display | ✓ |
| Offset resets on filter change | ✓ |
| Filtered vs. unfiltered empty states | ✓ |
| Error state with retry | ✓ |
| Skeleton loading | ✓ |

### `/cases/[caseId]` — Case Detail

| Requirement | Status |
|---|---|
| Case identity and status | ✓ |
| Record inventory grid | ✓ |
| Latest encounter formatted | ✓ |
| Missing encounter not invented | ✓ |
| Non-imported warning | ✓ |
| No investigation launch for unavailable | ✓ |
| Investigation history for imported | ✓ |
| Error state with retry | ✓ |

---

## Source Files Changed

| File | Change |
|---|---|
| `apps/web/features/dashboard/components/overview.tsx` | Rewritten |
| `apps/web/features/cases/components/case-library.tsx` | Rewritten |
| `apps/web/tests/phase-03.test.tsx` | New — 25 tests |

---

## Data Integrity

- **No fabricated metrics.** All counts come from `pagination.total` or direct API responses.
- **No invented encounter dates.** `latest_encounter_at` is displayed only when present; null is not converted to a date.
- **No fabricated modalities.** Only values returned by the backend are shown. MIME types like `application/pdf` are displayed as-is (not mapped to clinical categories).
- **No false ready state.** Investigation launch requires `imported && status === "imported" && patient_id`.
- **No display_name fabrication.** Missing names shown as "Patient identity unavailable".
- **Derived counts guarded.** Encounter/document totals only shown when `!has_more` (complete page).

---

## Contract Constraints Encountered

1. **`latest_encounter_at` only, no `earliest_encounter_at`.** The `CaseOverview` type does not include an earliest encounter date. Displayed as "Last documented encounter: [date]" only. Full date range deferred to a backend enhancement.
2. **Modality values are raw strings.** The backend returns values like `"application/pdf"` rather than clinical category names. A conservative mapping is applied; unrecognized values are shown as-is without fabrication.
3. **No patient preselection parameter on `/investigations/new`.** The "Start Investigation" CTA links to `/investigations/new` without a patient parameter, as the existing route does not support preselection. The `StartInvestigation` component on case cards handles patient-specific launch correctly.

---

## Test Results

| Check | Result |
|---|---|
| `pnpm typecheck` | ✓ 0 errors |
| `pnpm lint` | ✓ 0 warnings |
| `pnpm test` | ✓ 145/145 passed (25 new) |
| `pnpm build` | ✓ Compiled successfully |

**New tests (25):** Dashboard CTA, featured case selection, empty state, skeleton, error state, metric accuracy, case library filters, pagination, empty states, error/retry, date formatting, modality badges, case detail identity, warning, launch guard, error/retry, missing encounter.

**Regressions:** None. All 120 pre-existing tests continue to pass.

---

## Visual Verification

Browser verification was blocked by server start policy. Manual verification checklist:

- [ ] `/` at 1440px: Header with "Start Investigation" → `/investigations/new`, metric grid, featured case card with status badge and modality badges, recent investigations, workflow steps, patient directory with "View all" link.
- [ ] `/` at 1024px: Metrics wrap to 2×2, featured case full width, workflow steps stack.
- [ ] `/cases` at 1440px: Filter row, 2-column case grid, pagination range, status badges, modality badges, formatted dates.
- [ ] `/cases` at 768px: Single-column case grid, filters wrap.
- [ ] `/cases/[caseId]` at 1440px: Back link, case identity, record inventory grid, investigation history.
- [ ] Empty states: No cases, filtered no results, no imported cases on dashboard.
- [ ] Error states: API failure with retry on all three routes.

---

## Deferred Work

| Item | Reason | Target |
|---|---|---|
| `earliest_encounter_at` in case cards | Not in `CaseOverview` contract | Backend enhancement + Phase 4 |
| Clinical modality category mapping | Backend returns raw strings; conservative mapping applied | Backend normalization |
| Patient preselection on `/investigations/new` | Route does not support query param | Phase 5 (new investigation improvements) |
| CASE-001 visual priority in library | Featured case on dashboard covers this; library ordering is server-controlled | Phase 10 (polish) |
| "View all N records →" links in compact sections | Patient chart scope | Phase 4 |

---

## Remaining Risks

- **Modality display:** If the backend returns new modality strings not in the mapping, they display as-is. This is safe but may look technical. The mapping should be extended as new values are encountered.
- **Featured case ordering:** The dashboard prefers CASE-001 from the first page of imported cases. If CASE-001 is on a later page, it will not be featured. A targeted `catalogApi.case("CASE-001")` lookup could address this but adds an extra request. Deferred.
