# Phase 2.1 — multi-domain discovery evaluator

Implemented on 2026-10-22. The separate offline evaluator now distinguishes
valid source citations from an established clinical relationship. Legacy scoring,
clinical records/assets, six answer keys, agent behavior and frozen reports are
unchanged. No investigations were regenerated, and no commit or push was made.

## Delivered implementation

- [Version 1.0 semantics](multi-domain-discovery-spec.md) defines five clinical
  domains, seven evidence levels, five outcomes and deterministic/reviewer gates.
- `scripts/clinical_discovery.py` contains strict specification/review models,
  independent DTO/anchor reconstruction and per-discovery assessment.
- `scripts/evaluate_clinical_discovery.py` scores one finalized frozen report.
- `scripts/baseline_clinical_discovery.py` runs both scorers on existing report
  files, checks frozen hashes before/after, and refuses existing output directories.
- `evaluation/clinical-discovery/v1/CASE-*.json` adapts the unchanged keys without
  introducing patient facts. Source roles for CASE-004–006 are explicitly
  provisional and cannot produce exact discovery until reviewed and versioned.
- Independent control fixtures and tests live in
  `apps/api/tests/fixtures/clinical-discovery-controls.json` and
  `apps/api/tests/test_clinical_discovery.py`.

The evaluator imports public clinical DTO and exact anchor helpers; runtime
imports no evaluator. It has no database, network, agent or inference execution.
No migrations, dependencies, API, frontend or runtime settings changed.

## Frozen input provenance

[frozen-hashes.json](artifacts/phase2-01/frozen-hashes.json) records SHA-256 for
210 existing files before implementation: canonical case data/manifests, clinical
assets, original evaluation material, the legacy scorer, and the existing
generalization audit artifacts, including all twelve reports and tool traces.
Every entry matches after scoring. Existing six-case integrity regression tests
also check the previous audit's independent 138-entry manifest.

The input cohorts are `artifacts/generalization/before` and
`artifacts/generalization/after`, originally produced by the prior audit. This
phase reads them only. The cohort labels describe historical agent changes;
there are no agent changes in this phase. Input report/key/spec/case/tool hashes
are repeated in every new result. All required sources appear in successful tool
source-reference lists in both cohorts; that may include search hits and does not
prove that every original document was read or clinically considered.

## Actual baseline comparison

Both original cohorts were scored. Legacy results reproduce exactly: CASE-001
is **exact, 1/1** in each; CASE-002 is **failure, 0/2**; CASE-003–006 are each
**failure, 0/1**. No legacy formula, threshold or output was changed.

The table reports independent valid required-source citation coverage. This is
descriptive coverage, never the discovery grade.

| Expected discovery | Legacy before / after | New before → after | Valid citations before → after |
| --- | --- | --- | --- |
| CASE-001 timeline contradiction, primary | exact / exact | partial → partial | 6/6 → 6/6 |
| CASE-002 medication reconciliation, primary | failure / failure (case has two expectations) | partial → partial | 2/5 → 2/5 |
| CASE-002 renal trend, secondary | failure / failure (0/2 case total) | missed → partial | 0/5 → 5/5 |
| CASE-003 pathology/follow-up, primary | failure / failure | partial → partial | 1/6 → 1/6 |
| CASE-004 diagnostic challenge, primary | failure / failure | partial → partial | 1/3 → 1/3 |
| CASE-005 hold/restart reconciliation, primary | failure / failure | partial → partial | 1/3 → 1/3 |
| CASE-006 longitudinal concern, primary | failure / failure | partial → partial | 1/3 → 3/3 |

New before outcomes: **6 partial, 1 missed, 0 exact**. New after outcomes:
**7 partial, 0 exact**. Primary discovery success is false for all six cases in
both cohorts. All semantic dimensions remain marked `review`; no clinical
approvals were fabricated. No structurally complete group appears in these
reports, so none receives `not_assessable` as its overall outcome; pending
semantic review is still explicit within every partial discovery.

### Explanation of every grading difference

**CASE-001:** The legacy exact discovery is preserved. Its pooled citations
include all six required IDs and its verified onset conflict touches decisive
anchors. Under the new specification, the chronology finding itself cites the
earlier and later symptom records but does not connect the prescription sources
`DOC-001-22` and `MED-001-02` within the same finding. Those occur in other
findings, without an explicit report claim linking the finding IDs. Thus the
complete key claim, including prescription context, remains partial. This does
not retract the narrower verified chronology observation or alter the baseline;
it exposes the stricter consolidation requirement. Semantic approval is also
pending.

**CASE-002 medication:** Legacy requires a timeline contradiction and returns
failure. New partial records valid citations to `DOC-002-06` and `DOC-002-11`,
while required `DOC-002-03`, `DOC-002-07` and `DOC-002-14` are absent as valid
finding citations. The expected prescribing/reconciliation/uncertainty relationship
is not established. No confirmed ingestion or medication-induced injury is
credited.

**CASE-002 renal:** The before report has none of the five required document
citations, hence missed. The after report cites all five across observations,
but no single finding or explicitly linked group connects the full required
baseline/illness/recovery evidence. It remains partial despite 100% pooled
coverage. Legacy still fails because there is no qualifying timeline conflict.
The new per-discovery split exposes a secondary evidence improvement without
claiming that the clinical trend or its cause has been established.

**CASE-003:** Partial recognizes the cited delayed-review source
`DOC-003-14`. The procedure, abnormal result, routing, closure and primary-care
sources (`DOC-003-05/07/08/09/10`) are missing as valid finding citations. No
result-to-follow-up relationship or absence-of-care conclusion is credited.
Legacy failure becomes an informative partial evidence assessment, not success.

**CASE-004:** Only `DOC-004-05` is cited; required `DOC-004-08/10` are missing.
The new partial describes available evidence without a diagnostic hypothesis
challenge. Generic key anchors and source roles need qualified review. Legacy
failure requires a timeline finding and provides none of that distinction.

**CASE-005:** Only `DOC-005-05` is cited; required `DOC-005-08/10` are missing.
New partial recognizes evidence without asserting a hold/restart reconciliation,
ingestion dates or causality. Source roles remain provisional. Legacy failure
again has no domain-specific distinction.

**CASE-006:** Before has only `DOC-006-05`; after also cites `DOC-006-08/10`.
The three required documents remain spread across findings. Full pooled coverage
does not establish the key's incomplete metabolic follow-up relationship or a
definitive diagnosis. Both new grades remain partial, and provisional role
semantics still need review. Legacy remains failure despite its 3/3 coverage.

## Reviewer gates and controls

An exact grade needs valid connected required evidence, key quote/value anchors,
source roles, acceptable finding outcomes and all seven semantic approvals.
Review decisions are external, bound to report/spec/case SHA-256 and accompanied
by reviewer qualification and written rationales. Multiple findings require an
original report claim that explicitly references the other finding IDs; a
reviewer cannot create that missing link after the investigation. Rejected
findings and hypotheses cannot silently fill missing evidence.

Thirteen independent fixture controls exercise a valid cross-source relationship,
same citations without relationship, missing decisive source, wrong patient,
chronology with unsupported causality, unsupported definitive diagnosis,
disconnected citation union, correct uncertainty, overlapping terminology,
ignored counterevidence, incorrect uncertainty, ignored missing evidence and a
false-positive allegation. Positive semantic decisions are authored test
oracles, not claims of clinician approval. Every control also runs without
adjudication and cannot become exact. Additional tests cover explicit linked
groups versus invented links, key anchors, all five outcomes, accepted unresolved
states, provisional roles, incomplete review, stale hashes, finalization,
report-supplied approval, and source type/version/hash/value/quote/span tampering.

## Reproduction and verification

Executed from the repository root:

```text
uv run --project apps/api --locked python scripts/baseline_clinical_discovery.py --output docs/evaluation/artifacts/phase2-01/before --phase before
uv run --project apps/api --locked python scripts/baseline_clinical_discovery.py --output docs/evaluation/artifacts/phase2-01/after --phase after
uv run --project apps/api --locked pytest apps/api/tests/test_clinical_discovery.py apps/api/tests/test_generalization_audit.py apps/api/tests/test_architecture.py -q --junitxml=docs/evaluation/artifacts/phase2-01/tests.xml
uv run --project apps/api --locked ruff check scripts/clinical_discovery.py scripts/evaluate_clinical_discovery.py scripts/baseline_clinical_discovery.py apps/api/tests/test_clinical_discovery.py
uv run --project apps/api --locked ruff format --check scripts/clinical_discovery.py scripts/evaluate_clinical_discovery.py scripts/baseline_clinical_discovery.py apps/api/tests/test_clinical_discovery.py
```

Machine-readable results: [before summary](artifacts/phase2-01/before/summary.json),
[after summary](artifacts/phase2-01/after/summary.json), individual `CASE-*.json`
files beside each, and [test results](artifacts/phase2-01/tests.xml).

Final verification: **64 passed** in 14.96 seconds. Ruff lint and formatting
checks pass for all four new Python files. One existing FastAPI/Starlette
TestClient deprecation warning was emitted. All 210 frozen hashes match, and
the legacy audit regression tests reproduce original scores. `git diff --check`
passes. No full application regression, live-provider run, medical expert review
or new clinical accuracy measurement is claimed.

## Remaining limits

Qualified semantic review is intentionally outstanding. CASE-004–006 need more
specific reviewer-controlled roles and decisive clinical criteria before exact
scoring. Current source reconstruction supports initial source version 1 and
the listed public record types, excluding patient and imaging-asset anchors.
Source-reference retrieval telemetry cannot establish cognitive consideration
or distinguish every search hit from an original record. Whole-report unaligned
false positives and hypotheses are not assigned a precision metric. Reviewer
identity is recorded rather than authenticated. These are explicit evaluation
limits; no agent improvements are included or started.
