# Frontend Component Patterns

## Structure
Prefer feature-based modules, with names adjusted to the repository:

```text
apps/web/src/
  app/                       # Next.js routes/layouts
  features/patients/         # search, patient chart, encounter views
  features/investigations/   # run view, timeline, trace, report
  features/evidence/         # source previews, citation anchors
  components/ui/             # reusable visual primitives
  lib/api/                   # typed transport client
  lib/types/                 # contract types or generated schemas
```

## Component boundaries
- **Page:** route params, composition, error boundary placement.
- **Feature container:** orchestrates data requests and actions.
- **Presentational component:** typed props, predictable render, no direct hospital API access.
- **Reusable primitive:** neutral appearance/behavior; no hidden CASE-001 knowledge.
- **Adapter:** maps API transport to view model without rewriting clinical meanings.

## Suggested interfaces
```ts
type EvidenceRef = { recordId: string; sourceType: string; fieldPath?: string };
type EvidenceLinkProps = { reference: EvidenceRef; label: string; onOpen: (ref: EvidenceRef) => void };
```
The canonical schema in `frontend-backend-contract.md` wins if fields differ.

## Patterns
- Build separate `ClinicalRecordCard` and `AgentFindingCard` variants with distinct headings and metadata.
- Use one canonical `EvidenceLink` behavior for inline claims, timeline nodes, and report citations.
- Tables must preserve units, reference range, collection time, and source status; render missing values as unknown, not zero.
- For image/document viewers, show fallback when preview is missing while preserving original metadata and download endpoint when supported.
- Use stable keys and descriptive names (`LabResultTable`, `EncounterSummary`, `AgentActivityLog`, `ContradictionPanel`).
- Treat user-visible dates as timezone-aware; display timezone label when comparing records.

## Avoid
Monolithic pages, props carrying entire patient charts unnecessarily, arbitrary `any`, hidden fetches in small display components, index-based citations, unbounded HTML injection, and CSS overrides inconsistent with design tokens.

## Tests
Render components with empty/full/partial fixtures, missing evidence, long notes, long identifier values, and keyboard navigation. Verify clicking evidence opens the exact target record.

## Refactor 07 implemented ownership

Use `apps/web/features/{dashboard,patients,investigations,evidence,timeline,documents,imaging,records}`.
Only create feature modules for implemented functionality. `records` owns the
shared clinical record card so evidence never imports patient-chart composition.
Routes import feature views; `components/{layout,shared,ui}` cannot import features.
API adapters remain `lib/api/{hospital,investigations,health}`; transport is
`lib/api/client`, runtime investigation parsers are `lib/validation`, contracts
remain in `types`. `lib/api/use-resource` owns cancellable scoped reads.
Presentation formatting is `lib/formatters/text`, shared statuses/time/panels in
`components/shared/presentation`. Architectural tests enforce the dependency DAG.
