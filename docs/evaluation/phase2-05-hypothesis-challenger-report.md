# Phase 2.5 — evidence-based diagnostic hypothesis challenger

Implemented 2026-10-23. The existing investigation workflow now reconstructs
documented working assessments, compares them with original objective test
interpretations and publishes source-linked reconsideration questions. It does
not choose a diagnosis, exclude anxiety, generate probabilities or prescribe
treatment. Verification establishes a recorded evidence relationship; the clinical
hypothesis remains inconclusive.

CASE-004 now has one consolidated comparison containing all three key-required
documents, versus one valid citation before. Its multi-domain outcome changes
from **partial** to **not_assessable**, not exact: qualified semantic/source-role
review is pending and the frozen key's generic quote anchor does not match.
No clinical accuracy or reviewer approval is claimed.

## Preconditions and frozen inputs

Reviewed the current Hypothesis/relationship schemas, diagnostic-report tools,
planner and specialist adapters, TimelineAgent, evidence verifier, existing
hypothesis generation/report persistence, CASE-004 blueprint/records/audit traces,
and Phase 2.1–2.4 specifications and reports. The architecture extension was
documented before coding. Existing Phase 2.3/2.4 work was preserved.

The before replay completed before runtime edits. The unchanged six-case harness
uses freshly migrated temporary SQLite, real patient-scoped hospital tools and
registered synthetic assets. Both cohorts use baseline orchestration, legacy
chronology reasoning and deterministic rules, without live inference. Independent
integration tests also exercise adaptive orchestration. No development database
is used.

All 138 audit input hashes, 19 supplementary evaluation hashes and the historical
210-file Phase 2.1 inventory match. Datasets, assets, ground truth, evaluation
keys/specifications, formulas and thresholds remain unchanged. Runtime imports
no case JSON or evaluator. No commit or push was performed.

## Implemented workflow

The contradiction specialist now checks original diagnostic-document discovery
as well as structured reports. Diagnostic documents or structured cardiology/
actionable reports trigger bounded original-document, encounter and referral
retrieval, shared with Phase 2.4. No new planner, agent runtime, permission,
endpoint, migration, dependency or frontend flow was introduced.

1. Reconstruct explicit working/provisional/suspected assessments from originals.
   Certainty stays unknown unless stated; mixed certainty is not silently resolved.
   Negated and family-history assessments are excluded.
2. Identify positive symptoms in that assessment or a separate note from its
   actual encounter. Unrelated visits and negated symptoms cannot supply context.
3. Retrieve original interpreted findings, retaining structured result/document
   links, encounter consistency and named source-native chronology.
4. Require explicit symptom correlation for a positive reconsideration question.
   A reported rhythm abnormality alone is insufficient.
5. Retain supportive, incidental, negative, inconclusive and conflicting
   interpretations. Different test modalities are not automatically contradictions.
6. Mark generic orders, referrals and reassessment notes as nonspecific context,
   rather than inventing precise test linkage or later chronology.
7. Independently repeat the accessible search and reconstruct the full comparison
   before publishing its finding and source-linked Hypothesis.

There are no CASE-004 IDs, expected quotes or anxiety-only search selectors in
the workflow. Extraction uses bounded explicit symptom/test vocabulary; it does
not interpret raw signals or generate an autonomous differential diagnosis.

| Module | Responsibility |
| --- | --- |
| `app/clinical/diagnostic_models.py` | Typed comparison, evidence roles/attribution, certainty and provisional verdict |
| `app/clinical/diagnostic_challenger.py` | Working assessments, symptom-context checks and reproducible comparisons |
| `app/clinical/relationship_models.py` | Optional `diagnostic_comparison` in the existing relationship envelope |
| `app/schemas/investigation.py` | Optional `Hypothesis.comparison`, preserving old payloads |
| `app/agents/specialists.py` | Diagnostic-document discovery and shared original retrieval |
| `app/evidence/diagnostic_challenger.py` | Independent search, source integrity and complete comparison reconstruction |
| `app/evidence/relationships.py` | Typed dispatch; historical envelopes retain their original path |
| `app/orchestration/engine.py` | Publish comparison hypotheses only after verification; preserve diagnostic caveats |
| `tests/test_diagnostic_challenger.py` | Forty independent/adversarial and real-workflow tests |
| `scripts/score_hypothesis_audit.py` | Both unchanged offline evaluators |

Application paths are relative to `apps/api`. Tool, evidence, relationship and
frontend/backend contract documents describe the additive fields. Existing REST
reports, finding persistence and relationship activity events remain in use.

## Comparison model and independent verification

The comparison separates hypothesis/certainty, source roles, supporting evidence,
weakening evidence, contradictory interpretations, missing evidence, alternatives,
question and provisional verdict. Every evidence entry preserves its exact
original anchor, version/hash, encounter and named timestamps, alongside the
complete accessible search manifest.

Verdicts are `reconsideration_question`, `not_challenged` and `inconclusive`.
These are not diagnoses or probabilities. A verified record relationship can
correctly have a non-challenged or inconclusive comparison. The existing
Hypothesis verdict remains **inconclusive**, including for a positive question.

The verifier independently repeats patient-scoped diagnostic-report, document,
encounter and referral searches and resolves every original. It checks ownership,
identity, representation, version, DTO hash and exact anchors, then regenerates
certainty, symptom correlation, chronology, encounter mismatches, source roles,
opposing interpretations, assertions and the entire comparison. Proposed prose
cannot supply a clinical conclusion. Omitted/changed counterevidence fails closed.
Empty, unavailable, over-limit or incompletely searched text remains inconclusive.

Provider-supplied comparison fields on incoming hypotheses are cleared. New typed
comparison hypotheses are constructed only after their finding independently
verifies; their question, evidence and limitations come from the reconstructed
comparison. This does not claim clinical validation of arbitrary legacy model
narrative or any live-provider evaluation.

Bounds are twenty original documents, 120 manifest sources, three working-label
comparisons and twenty evidence anchors per comparison, within existing thirty-call
role and 100-call global budgets. Source sessions close before external waits.

## CASE-004 source mapping and example

Final finding: `FND-81732c8cb0f24b50960883dff7e17e23`.
The contradiction-role trace has 24 calls: correction search, referrals,
diagnostic reports, diagnostic-document discovery, unfiltered catalog, encounters
and eighteen original reads. Its independently reproduced manifest contains
thirty sources: five reports, eighteen documents, six encounters and one referral.
Exact tool execution IDs are retained in the comparison artifact.

| Sources | Recorded evidence and permitted use |
| --- | --- |
| `DOC-004-01/10` | Initial assessments record anxiety and recurring paroxysmal palpitations; narrative diagnostic certainty is unstated |
| `DOC-004-05` | Original monitor interpretation reports three supraventricular tachycardia episodes, maximum 164 bpm, with patient-triggered palpitations, and explicitly cautions against a single final diagnosis |
| `DOC-004-03/12` | Generic objective-test orders; not proof of a specific monitor order/accession |
| `DOC-004-06/15` | Generic reassessment/comparison notes; exact result linkage is unknown |
| `DOC-004-08/17` | Specialist requests for more evaluation without definitive diagnosis; nonspecific context |
| `REF-004-01` | Referral for rhythm abnormality; its order precedes the April monitor interpretation and is not declared a consequence of it |

The structured report catalog has laboratory projections and inconsistent
document/encounter links. None reliably links the monitor interpretation. The
comparison uses the original `DOC-004-05` interpretation and explicitly leaves
its structured test metadata unverified. It invents neither finalization time
nor an accession link, and does not repair frozen data.

`DOC-004-08` is dated January 29 and `DOC-004-15` February 12, before the April 16
monitor interpretation. Neither becomes a later review of that result.
`DOC-004-06` is dated May 21, but its generic text cannot establish which test
was reassessed. Event and authoring times stay separate. Structured provisional
diagnosis data unavailable through current agent tools is not secretly imported
from the case file; narrative certainty remains unknown.

Example comparison:

- **Hypothesis:** anxiety as the documented working explanation, not established truth.
- **Symptom context:** recurring palpitations in the original assessment notes.
- **Supporting evidence:** no explicit diagnostic interpretation supporting anxiety
  was extracted; repeating a label is not confirmation.
- **Weakening evidence for exclusivity:** the reported monitor finding explicitly
  associated with patient-triggered palpitations.
- **Contradictory interpretations:** none established in this monitor context;
  unavailable originals remain unknown.
- **Question:** “Does anxiety fully explain the recorded symptoms and
  symptom-associated objective interpretation, or are additional explanations needed?”
- **Alternatives:** coexistence, incidental findings, interpretation disagreement
  and incomplete episode correlation remain unproven possibilities.
- **Missing evidence:** original test data/episode correlation for clinical review,
  reliable structured test identity and clarification of coexisting explanations.
- **Verdict:** provisional reconsideration question; clinical hypothesis inconclusive.

This excludes no coexisting anxiety, establishes no definitive new diagnosis,
attributes no single cause to every episode and alleges no clinician impropriety.

## Positive/negative controls and unsupported claims

The [ten recorded scenarios](artifacts/phase2-05/adversarial-controls.json) include
independent synthetic originals, expected/observed challenge state, provisional
comparison, canonical claim and independent verifier result.

| Scenario | Expected and observed behavior |
| --- | --- |
| Anxiety with no objective finding | No comparison/challenge |
| Symptom-associated rhythm abnormality | Provisional source-linked question |
| Incidental finding unrelated to symptoms | Not challenged |
| Wrong result/document encounter | Inconclusive; mismatch retained |
| Conflicting same-test interpretations | Inconclusive; opposing source retained |
| Inconclusive test | Inconclusive |
| Interpretation explicitly supporting the working diagnosis | Not challenged; support retained |
| Multiple plausible explanations | Provisional question with alternatives and missing evidence |
| Normal rhythm interpretation during symptoms | Not challenged; not proof of anxiety |
| Finding associated with a different symptom | Not challenged |

There are **zero unexpected positive questions across eight prespecified
non-challenge scenarios**. Both positive scenarios generate provisional questions.
This is synthetic-control behavior, not a clinical false-positive rate, precision
estimate or reviewer endorsement. Verified non-challenge comparisons are not
counted as successful positive challenges.

Forty tests also cover unfamiliar labels, certainty, negation/family attribution,
relatives' tests, separate symptom notes, unrelated encounters, different test
modalities, unknown chronology, incomplete search, unparsed text, omitted opposing
interpretations, wrong patient, hash/date/role/certainty/verdict tampering,
missing anchors and unsupported conclusion intents. Real CASE-004 tests exercise
baseline/adaptive orchestration, original tools, persistence and report roundtrips.

Candidate prose asserting anxiety exclusion, a definitive diagnosis, 99% probability
or treatment instructions is replaced by the canonical bounded question. Causal,
diagnostic and ingestion conclusion intents are rejected. Controls do not create
qualified reviewer approvals or alter evaluation expectations.

## Evaluation and regressions

Both unchanged evaluators ran after finalization. Citation union is reported
separately from connected relationship quality and clinical interpretation.

| Case | Legacy before → after | Multi-domain before → after | Valid required citation union | Tool calls |
| --- | --- | --- | --- | --- |
| CASE-001 | exact → exact | partial → partial | 6/6 → 6/6 | 75 → 76 |
| CASE-002 | failure → failure | primary/secondary partial → partial | 8/10 → 8/10 | 63 → 64 |
| CASE-003 | failure → failure | not_assessable → not_assessable | 6/6 → 6/6 | 67 → 68 |
| CASE-004 | failure → failure | partial → not_assessable | 1/3 → 3/3 | 45 → 66 |
| CASE-005 | failure → failure | partial → partial | 2/3 → 2/3 | 49 → 71 |

All requested investigations complete. CASE-004 now has one finding with
`required_sources_connected=true` and `all_anchors_valid=true`, containing
`DOC-004-05/08/10`. All three were retrieved before; the improvement is comparison
and consolidation. Its Hypothesis matches the independently verified comparison.

**`key_anchors_matched` remains false.** The key's generic “Objective testing” quote
does not reproduce the monitor document's wording. CASE-004 source roles also
remain explicitly pending qualified review. Neither key nor quote was rewritten.
All seven semantic judgments remain `review`; primary discovery success is false.
The legacy evaluator requires a timeline contradiction and still returns failure.
These limits are not hidden by 3/3 coverage.

CASE-001 keeps its exact chronology discovery; CASE-002/005 medication findings
and CASE-003 result/follow-up relationship retain their grades. CASE-005 diagnostic
documents trigger bounded retrieval but produce no comparison: extra calls are
a documented cost without a claimed clinical gain. CASE-006 was incidentally
replayed by the harness and produces no diagnostic comparison.

A fresh source recheck reproduces **68 verified findings** across CASE-001–005
with **zero invalid findings and zero canonical-claim mismatches**. The published
CASE-004 hypothesis matches its verified comparison and stays clinically
inconclusive. This does not measure whole-report clinical false positives.

## Validation, reproduction and remaining limits

The focused workflow/architecture/evaluator regression suite passes **177 tests**.
Ruff lint passes, formatting checks 107 files, strict mypy passes for 106 source
files and `git diff --check` passes. The complete backend suite passes **477 tests**,
with **1 skipped**, zero failures and zero errors in 319.58 seconds. The skip is
the existing Windows asset symlink-escape test requiring Developer Mode or symlink
privilege; it is not counted as a passed security check. The existing FastAPI/
Starlette TestClient deprecation warning remains. See the [full JUnit result](artifacts/phase2-05/backend-tests.xml)
and [focused JUnit result](artifacts/phase2-05/final-controls.xml). No frontend or
live-provider validation is claimed.

Initial and expanded controls passed; interim lint/type errors were corrected
before final checks. The initial replay is archived as `after-initial`; scoring
uses final `before`/`after` only. Historical Phase 2.1–2.4 reports were not overwritten.

From the repository root:

```text
uv run --project apps/api --locked python scripts/audit_investigations.py --output docs/evaluation/artifacts/phase2-05 --phase before
uv run --project apps/api --locked python scripts/audit_investigations.py --output docs/evaluation/artifacts/phase2-05 --phase after
uv run --project apps/api --locked python scripts/score_hypothesis_audit.py
```

Before ran before edits; output directories refuse overwrite. Replays need a new
directory. [Comparison](artifacts/phase2-05/comparison.json) contains both evaluator
outputs, hashes, source mapping, comparison and tool trace IDs. Per-case folders
retain actual tools/events/reports. [Final source recheck](artifacts/phase2-05/final-source-recheck.json)
records all finding/hypothesis checks, frozen inventories and runtime hashes.

From `apps/api`:

```text
uv run --locked pytest -q --junitxml=../../docs/evaluation/artifacts/phase2-05/backend-tests.xml
uv run --locked pytest tests/test_diagnostic_challenger.py tests/test_result_followup.py tests/test_clinical_relationships.py tests/test_architecture.py tests/test_clinical_discovery.py tests/test_generalization_audit.py -q --junitxml=../../docs/evaluation/artifacts/phase2-05/final-controls.xml
uv run --locked ruff check app tests
uv run --locked ruff format --check app tests/test_diagnostic_challenger.py
uv run --locked mypy
```

Unknown synonyms, over-limit originals, multiple episodes without linkage,
modality aliases, raw tracing interpretation, formally adjudicating conflicts and
broader differentials remain outside scope. Available narrative certainty may be
less specific than the chart or evaluator-only blueprint. Generic notes cannot
establish why an action happened or which test was discussed. A normal examination
does not exclude intermittent abnormalities; an abnormal symptom-associated
interpretation supports a question, not an autonomous diagnosis. Qualified
clinical/source-role review and the frozen key-anchor mismatch remain unresolved.
