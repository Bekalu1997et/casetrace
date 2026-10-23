# Phase 2.2 — clinical relationship architecture

Completed 2026-10-23. Reusable typed relationships now pass through the existing
investigation engine, independent verifier, finding persistence and reports.
The default legacy reasoning path remains compatible. All 210 Phase 2.1 frozen
input hashes match, including clinical data/assets, answer keys, legacy scorer
and historical investigation artifacts. Evaluation specifications and scoring
thresholds were not changed. No commit or push was performed by this task.

## Implementation

[Clinical relationship reasoning](../architecture/clinical-relationship-reasoning.md)
defines the architecture and its deliberately narrow clinical scope.

- Extended the existing `ClinicalClaim` with assertion origin, source status,
  named clinical-event/documentation time selectors and narrative timestamps.
  Existing subject, concept/value/unit, polarity, certainty, applicability,
  attribution, encounter and provenance remain available. Conflicting assertions
  retain separate identities and anchors.
- Added `clinical/relationship_models.py`: a bounded relationship envelope with
  constituent assertions, supporting/contradicting roles, named temporal ordering,
  unresolved questions and conclusion intent. Candidate/Finding accepts the
  optional envelope and additive `clinical_relationship` rule.
- Added `clinical/relationship_synthesis.py`: pure assembly over original
  tool-returned records. It supports cross-encounter recorded state differences
  for matching medications/referrals and documented assertion conflicts using
  the established chronology comparison. Automatic engine assembly currently
  selects state differences in structured reasoning mode; the existing timeline
  discovery path remains intact.
- Added `evidence/relationships.py`, dispatched by the existing EvidenceVerifier.
  It independently resolves hospital originals, checks patient ownership,
  source identity/version/hash/representation and exact anchors, reconstructs
  assertions, checks chronology and regenerates supported relationships.
  Arbitrary proposed prose cannot become a verified conclusion: canonical
  source-derived wording replaces it. Ingestion, causal and diagnostic intents
  are rejected; broader interpretations remain inconclusive.
- Preserved the existing finding lifecycle, evidence registry and report builder.
  Typed constituents survive finding/report JSON round trips. Finding logical
  deduplication includes relationship identity when present, while legacy keys
  retain their original formula. Verified relationship titles, alternatives and
  limitations receive canonical wording in the engine.
- Added bounded `assertions.extracted`, `relationship.assembled`,
  `relationship.proposed` and `relationship.verification_completed` activity.
  Payloads contain counts, IDs, versions and status rather than narrative text,
  proposed clinical prose or private deliberation. Assembly is limited to 100
  source records, 4,096 pairs and eight candidates; constituent lists are bounded
  to eight assertions and existing candidates retain the twenty-anchor limit.

SourceRef and Anchor moved unchanged to `schemas/provenance.py` to avoid cyclic
dependencies between assertions and candidate schemas. They remain re-exported
from their original public import path. This changes no source fingerprint or
clinical DTO. Contracts in evidence-contract.md, frontend-backend-contract.md,
multi-agent-architecture.md and agent-tools.md document the additive behavior.

No new engine, specialist permissions, clinical retrieval tools, database tables,
migrations, dependencies or frontend flows were introduced. Agents still receive
scoped tools; verification receives a SourceResolver. The existing guarded
persistence writer commits findings/events, with no transaction spanning hospital
resolution. Runtime imports no evaluator or hidden answer key.

## Verification and results

The complete backend run finished successfully. Its preserved
[JUnit artifact](artifacts/phase2-02/backend-tests.xml) records **383 collected,
382 passed, 1 skipped**, with zero failures/errors, in 314.464 seconds. The skip
is `test_asset_symlink_escape`: Windows requires Developer Mode or symlink
privilege. That platform limitation does not count as a passed security control.

The suite includes **38 relationship tests** covering:

- Correct cross-encounter source relationships and canonical conclusion wording.
- Wrong patient, missing source, stale version, altered hash/value/type, search
  hits, inconsistent DTO digests and incorrect citation offsets.
- Independently reconstructed origin, subject, polarity, certainty, value,
  concept, status and event-time semantics.
- False ordering, missing comparable times, timezone ordering and matching
  current source versions.
- Conflicting documentation, preserved supporting/contradicting evidence,
  removed counterevidence and delayed documentation.
- Unsupported ingestion, causality and definitive diagnosis; inconclusive
  handling for unimplemented clinical interpretations.
- Duplicate assertions/records, missing decisive anchors, incompatible concepts
  and different active ingredients sharing the same displayed medication name.
- Bounds, role-reference validation, old candidate compatibility, and actual
  engine → persisted finding → report → ordered activity trace integration.

Both existing CASE-001 reasoning-mode end-to-end tests passed. Existing legacy
frozen-score comparisons, Phase 2.1 evaluator controls, architecture boundaries,
tools, source provenance, persistence and other backend regressions passed in
the full suite. The integration test confirms relationship citations originate
in successful tool traces, typed constituents survive persistence, chronology
findings remain present, and finalized runs reject further writes.

An earlier targeted run had 92 passes and one test failure: the new lifecycle
test incorrectly attempted to save a finding after run finalization. The existing
RunConflict guard correctly blocked it. The test now asserts that protection;
production immutability was retained. The final full run supersedes that result.

Executed checks, from `apps/api`:

```text
uv run --locked pytest -q --junitxml=../../docs/evaluation/artifacts/phase2-02/backend-tests.xml
uv run --locked ruff check app tests
uv run --locked ruff format --check app tests/test_clinical_relationships.py
uv run --locked mypy
```

Final lint passed; formatting checked 99 files; strict mypy passed for 98 source
files. The frozen inventory check was repeated after implementation and still
verified all 210 entries. No live-provider or frontend test run is claimed.

## Scope and remaining limits

A recorded state difference is not automatically a contradiction or proof of
ingestion. Order timestamps do not establish when a retrospectively updated
status became effective. Documented onset conflicts concern source assertions,
not true clinical onset or causal attribution. Unknown/unretrieved records and
undocumented care remain unknown.

Medication reconciliation, pathology follow-up, diagnostic hypothesis challenge
and longitudinal follow-up types can carry structured evidence but do not yet
have complete specialist workflows or deterministic clinical interpretation
rules. They remain inconclusive after factual verification. The implemented
reproducible rules currently compare pairs; the envelope supports more
constituents for future reviewed rules. Bounded assembly is not exhaustive chart
review, and no improved multi-domain discovery score or clinical accuracy is
claimed. Frozen baseline reports were not regenerated to improve evaluation.
