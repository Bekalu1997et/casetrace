# Phase 2.4 ? diagnostic result and follow-up investigation

Implemented 2026-10-23. The existing contradiction specialist now reconciles
finalized actionable diagnostic results with documented recommendations, routing,
communication, administrative closure, referrals and later review. It uses the
existing real tool registry and independent evidence verifier in baseline and
adaptive orchestration. No new engine, public endpoint, permission, dependency,
database field or migration was introduced.

CASE-003 now has a single independently reconstructed result-to-follow-up
relationship containing all six required original documents and the key's decisive
anchors. This establishes the documented workflow relationship, not negligence,
absent communication, progression or a new diagnosis. Qualified semantic review
remains outstanding; this report does not declare the expected clinical discovery
exact or the case solved.

## Preconditions and frozen inputs

Reviewed the Phase 2.1 evaluation specification and evaluator report, Phase 2.2
relationship architecture, CASE-003 blueprint and clinical records, existing
diagnostic-report/referral/document/timeline tools, and historical CASE-003 audit
reports and tool traces. The architecture extension was documented before coding.
Existing uncommitted Phase 2.3 medication work was preserved.

The Phase 2.4 `before` replay was completed before runtime edits. It uses the
existing audit harness with a freshly migrated temporary SQLite database holding
all six synthetic patients. The harness freezes clinical case files, assets,
answer keys and legacy scoring inputs; `evaluation-hashes.json` additionally
freezes all evaluation files, both evaluator implementations and the Phase 2.1
specification. All 138 current audit inputs, 19 supplementary evaluation inputs and the original
210-file Phase 2.1 frozen inventory match their recorded hashes. No frozen
clinical data, ground truth, evaluation keys,
specifications, scoring formulas or thresholds were changed. Runtime imports no
evaluator or case files. No commit or push was performed.

## Implementation and tool workflow

| Module | Responsibility |
| --- | --- |
| `app/clinical/result_models.py` | Typed search manifest, eleven lifecycle stages, source observations and uncertainty states |
| `app/clinical/result_followup.py` | Conservative actionability discovery, source linkage, lifecycle extraction and canonical bounded relationship assembly |
| `app/clinical/relationship_models.py` | Optional `result_workflow` within the existing relationship envelope |
| `app/agents/specialists.py` | Existing contradiction role performs actual result/document/encounter/referral retrieval |
| `app/evidence/result_followup.py` | Independent unfiltered clinical search, original resolution and complete workflow reconstruction |
| `app/evidence/relationships.py` | Dispatches the supported result relationship to its verifier |
| `app/orchestration/engine.py` | Preserves canonical result-specific limitations in verified findings |
| `tests/test_result_followup.py` | Independent unfamiliar controls plus real CASE-003 persistence/tool integration |
| `scripts/score_result_followup_audit.py` | Offline comparison with both unchanged evaluators |

Application paths in this table are relative to `apps/api`. Agent-tool,
relationship architecture, evidence and frontend/backend contract documents also
record the additive behavior. Existing routes, finding lifecycle, source hashes,
SSE events and report persistence remain in use.

The specialist first retrieves referrals and diagnostic reports. Final/corrected/
amended results with explicit abnormal/actionable/follow-up wording trigger the
workflow. It searches the unfiltered document catalog, retrieves original documents
with version/hash checks, and retrieves encounters and referrals. This avoids
CASE-003 terms or expected IDs as search selectors. Clinical interpretation and
comprehensive NLP are not claimed.

Direct document/result references and shared result encounters establish initial
links. Without explicit accession references, generic result/follow-up wording
requires a unique actionable result; multiple-result ambiguity excludes generic
attribution. A unique earlier procedure order can be linked through the original
procedure's matching title. This is recorded as contextual attribution rather than
an invented accession link. Repeated representations sharing a result document
produce one workflow.

At most three diagnostic workflows, twenty original documents and 120 manifest
sources are considered, within the existing thirty-call role and 100-call global
budgets. Pagination uses existing tools. Truncation becomes an explicit limitation;
an incomplete or changed independent search cannot verify an absence claim.
The manifest includes selected-patient diagnostic reports, original documents,
encounters and referrals, with original versions and hashes. Search scope is all
accessible records at that snapshot, with no disease or time filter. Appointment
coverage is explicitly limited to referral appointment fields: no standalone
appointment resource or external clinical record access exists.

## Lifecycle, chronology and bounded conclusions

The typed lifecycle separates ordered, performed, specimen collected, finalized,
routed, acknowledged, patient notification, recommended follow-up, scheduled,
completed and administrative closure. Each can be documented, partial, unknown or
conflicting. Unknown is not a negative assertion. Mixed earlier uncertainty and
later completion remain visible as separate source observations.

Named source timestamps are retained; result finalization uses `issued_at`,
referral scheduling/completion uses its recorded `appointment_at`, and document
event and authoring times stay separate. Literal narrative dates remain literal,
without invented midnight instants or timezones. A historical completion date is
not replaced by note authoring/event time. Comparable completion timestamps are
checked against result issuance before being described as later completion.

CASE-003 records the result issued on February 2, 2026 at 11:00 +03:00. The
procedure and specimen originals are retained, as are the originating order,
pathology recommendation, delivered routing, unverified earlier communication,
pending/unbooked scheduling, and April 14 specialist review and written patient
instructions. The completed referral and later review constrain the claim: it
cannot say follow-up never happened. Completed review also does not establish
completion of every surveillance recommendation.

The administrative note names closure on February 6 while its event and authoring
metadata say February 2. This is preserved as conflicting documentation. No
arbitrary closure timestamp, exact delay threshold or clinically overdue deadline
is invented. Administrative closure never becomes acknowledgment, patient
notification or demonstrated clinical completion.

Final finding `FND-441b17e327d84e6f80198245b8f43233` describes administrative
closure versus incomplete interim clinical
follow-up documentation, retains later completed review, and leaves the first
patient communication date uncertain. It distinguishes documented absence from
proven non-occurrence. It does not assert negligence, never-informed status,
malignancy or progression.

## Independent verification

The verifier independently repeats all four unfiltered category searches through
the clinical reader, resolves every listed original, validates patient ownership,
identity, representation, version and DTO hash, and compares the complete manifest.
It then reconstructs lifecycle observations, recommendation, source roles, named
times, later evidence, assertions, decisive anchors and the entire relationship.
Candidate wording is replaced with canonical source-derived wording. Changed or
omitted accessible counterevidence fails closed. A resolve-only capability,
unavailable original, truncated search, empty document text or text beyond the
2,000-character extraction limit cannot establish a documentation absence. These
cases remain inconclusive instead of silently excluding the unparsed record.
Unsupported ingestion, causal and diagnostic intents remain rejected.

The CASE-003 lifecycle retains originals beyond the eight constituent assertions,
including specimen, scheduling, later patient instructions and completed referral.
Those remain independently resolved and checked through the full workflow/search
envelope. The finding's direct anchors include all six key-required documents in
one consolidated relationship, rather than pooling citations from unrelated
findings. Existing durable tool traces record the actual retrieval operations. The
CASE-003 contradiction role makes 23 calls: correction search, referrals,
diagnostic reports, unfiltered document catalog, encounters and 18 original
document reads. The independently reproduced search manifest has 27 sources: one
result, one referral, seven encounters and eighteen documents.

## Before/after evaluation

Both evaluators ran against frozen finalized reports. Execution uses deterministic
rules, baseline orchestration, legacy chronology reasoning, real hospital tools,
isolated temporary migrated SQLite and unchanged registered assets. No live model
inference or qualified clinical review is claimed.

| Case | Legacy before ? after | Multi-domain before ? after | Required valid citation union | Tool calls |
| --- | --- | --- | --- | --- |
| CASE-001 | exact ? exact | partial ? partial | 6/6 ? 6/6 | 74 ? 75 |
| CASE-002 | failure ? failure | primary/secondary partial ? partial | 8/10 ? 8/10 | 62 ? 63 |
| CASE-003 | failure ? failure | partial ? not_assessable | 1/6 ? 6/6 | 46 ? 67 |
| CASE-005 | failure ? failure | partial ? partial | 2/3 ? 2/3 | 48 ? 49 |

For CASE-003 the multi-domain evaluator confirms `required_sources_connected`,
`all_anchors_valid` and `key_anchors_matched` within one finding. All four required
source-role groups are represented: procedure context `DOC-003-05`, abnormal result
`DOC-003-07`, routing/closure `DOC-003-08/09`, and later follow-up/uncertainty
`DOC-003-10/14`. This is a consolidated relationship improvement, not just retrieval:
all six originals were already found by the before tool trace, but only one was
cited in eligible findings.

`not_assessable` means the complete connected evidence is structurally eligible
but all seven semantic dimensions still require qualified review. No reviewer
approval was manufactured. Primary discovery success remains false. The unchanged
legacy evaluator requires a timeline contradiction, so a correctly typed result
relationship cannot make CASE-003 exact under that baseline.

All requested final investigations complete, with zero unsupported verified
findings on independent recheck and zero failed evidence checks. CASE-001 retains
its legacy exact discovery; CASE-002/005 medication findings and grades remain.
The one-call increase in these regressions is the diagnostic-report discovery
check. CASE-004/006 were also replayed incidentally by the unchanged six-case
harness, without a new result relationship or a claimed discovery improvement.

## Controls and validation

Independent controls cover properly completed follow-up, scheduled-but-uncompleted
referral, reported external completion, routed-but-unacknowledged result, late
entries, duplicate results, normal non-actionable results, unknown outcome,
conditional and negated completion, colleague discussion, ambiguous multiple
results, originating procedure/order linkage, conflicting closure dates, missing
result date, omitted later counterevidence, truncated scope, resolver capability,
unreadable/over-limit document text, wrong patient/version/hash/date/
recommendation/lifecycle and unsupported clinical
intents. Real CASE-003 tests exercise baseline and adaptive orchestration,
persistence, successful original-document tool traces, canonical caveats and a
fresh independent source reconstruction.

The final extended control/evaluator/architecture suite passes **137 tests**,
including all **35 result workflow tests** and both real orchestration modes.
Ruff lint passes for app/tests and the scoring script; formatting passes for 104
files including the new tests; strict mypy passes for 103 source files.
`git diff --check` passes. The final complete backend run passes **437 tests**,
with **1 skipped** and no failures, in 245.11 seconds. The skip is the existing
Windows asset symlink-escape test requiring Developer Mode or symlink privilege;
it is not counted as a passed security check. The existing FastAPI/Starlette
TestClient deprecation warning remains. The [full JUnit result](artifacts/phase2-04/backend-verified.xml)
and [137-test control result](artifacts/phase2-04/verified-controls.xml) preserve
these outcomes. An earlier full run with the legacy-envelope dispatch regression
had 433 passes, one failure and one skip; the corrected intermediate run had
435 passes and one skip before the two final unparsed-document controls were added.
The final successful full run supersedes both.

During development a control caught null encounter IDs being treated as shared
encounters; linkage now requires an actual encounter. Historical relationship tests caught incompatible inconclusive wording and an
early dispatch that bypassed factual assertion reconstruction for old envelopes.
Old envelopes without result_workflow now retain that reconstruction and their
original inconclusive interpretation behavior; no existing test was weakened. The first adaptive integration invocation used
`adaptive` instead of the configured `adaptive_rules` value; the test now uses the
actual configuration. A misplaced new test block was also corrected after its NameError; this did not
change runtime behavior. Earlier failed test artifacts are retained and superseded
by the final successful runs. Intermediate replays are archived separately and
are not used for final scoring.

## Reproduction, artifacts and remaining gaps

From the repository root:

```text
uv run --project apps/api --locked python scripts/audit_investigations.py --output docs/evaluation/artifacts/phase2-04 --phase before
uv run --project apps/api --locked python scripts/audit_investigations.py --output docs/evaluation/artifacts/phase2-04 --phase after
uv run --project apps/api --locked python scripts/score_result_followup_audit.py
```

The before command was run before implementation. Output paths refuse overwrite;
a new replay needs a new directory. [Comparison](artifacts/phase2-04/comparison.json)
contains both evaluator results, input hashes, the consolidated finding and full
lifecycle/search manifest, plus contradiction-role tool trace IDs. Per-case
`before`/`after` directories retain reports, tools, events, validation and legacy
scores. [Input integrity](artifacts/phase2-04/after/integrity.json) and
[evaluation hashes](artifacts/phase2-04/evaluation-hashes.json) protect frozen inputs.

From `apps/api`:

```text
uv run --locked pytest -q --junitxml=../../docs/evaluation/artifacts/phase2-04/backend-verified.xml
uv run --locked pytest tests/test_result_followup.py tests/test_clinical_relationships.py tests/test_architecture.py tests/test_clinical_discovery.py tests/test_generalization_audit.py -q --junitxml=../../docs/evaluation/artifacts/phase2-04/verified-controls.xml
uv run --locked ruff check app tests
uv run --locked ruff format --check app tests/test_result_followup.py
uv run --locked mypy
```

Extraction remains bounded explicit vocabulary. Unknown synonyms, long documents,
multiple results without explicit linkage, unavailable external originals,
standalone appointment systems and unrecorded communication remain gaps. Contextual
association is not a proven accession match. Referral status is documented workflow
evidence, not independent proof of every clinical action. No timeliness or clinical
harm judgment is made without an explicit recommendation/deadline and adequate
records. Qualified semantic adjudication is still required by the frozen evaluator.
The final [source recheck](artifacts/phase2-04/final-source-recheck.json) independently
reproduces all 61 verified findings across the four requested final reports with
zero invalid findings and zero canonical-claim mismatches, recording current
runtime hashes. The [historical integrity check](artifacts/phase2-04/historical-integrity.json)
confirms all 210 original frozen files are unchanged. No frontend or live-provider
validation is claimed.
