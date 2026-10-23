# Phase 2.3 — medication reconciliation investigation

Implemented 2026-10-23. MedicationAgent now discovers and consolidates original
medication instructions, reconciliation entries and patient-report uncertainty
through the existing tool/service boundary. The relationship verifier independently
reconstructs the proposed assertions and conclusion from hospital originals.
This adds medication relationship investigation, not a clinical causality judge.

CASE-001 retains its exact legacy discovery and completed status. CASE-002 and
CASE-005 now publish supported medication relationships, but their primary
multi-domain grades remain **partial**. Neither case is declared solved.
All 210 original frozen hashes match; clinical data, assets, answer keys,
evaluation specifications, scorers and thresholds remain unchanged. No commit
or push was performed.

## Exact modules changed

| Module | Change |
| --- | --- |
| `app/clinical/medication_identity.py` (new) | Conservative ingredient, explicit product strength, formulation/release markers and route normalization |
| `app/clinical/medications.py` (new) | Source-specific assertions, bounded consolidated relationships, explicit planned-date overlap and laboratory evidence questions |
| `app/clinical/claims.py` | Added copied_list and administration origin labels, without inferring actual ingestion |
| `app/agents/specialists.py` | Medication history, linked originals, bounded ingredient/action searches, version/hash-checked original retrieval and relationship-first proposals; typed document dictionaries |
| `app/evidence/relationships.py` | Medication-specific assertion reconstruction and complete relationship regeneration through the existing independent verifier |
| `app/orchestration/engine.py` | Laboratory evidence handoff from actual specialist outputs/origin metadata; unresolved association questions and bounded audit event |
| `tests/test_medication_reconciliation.py` (new) | Twenty independent unfamiliar-record controls |
| `tests/test_architecture.py` | Updated obsolete two-call expectation to allow the new bounded authorized searches, retaining capability/isolation assertions |
| `scripts/score_medication_audit.py` (new) | Offline comparison using both existing scorers without modifying either |

Paths above are relative to `apps/api`, except the root-level scoring script.
The relationship architecture, agent tool, evidence and frontend/backend contract
documents record the additive behavior. There are no database migrations,
new clinical fields, new tool permissions, new dependencies or frontend changes.

## Medication semantics and workflow

Identity uses explicit generic names where available, otherwise exact product
names. Explicit strength, release/formulation and route remain distinct. No drug
dictionary, synonym inference, unit conversion or equivalence between formulations
is claimed. Prescribed dose is not silently treated as product strength.
Ingredient-only notes cannot resolve multiple retrieved product variants.
Unknown strengths/forms and records outside the retrieved set remain limitations.

Assertions distinguish structured orders from copied active lists, patient reports,
hold/discontinuation instructions, restart language, documented administration and
exposure uncertainty. Each retains patient, encounter, original source/version/hash,
exact source field/span, event time, authoring time and named order/start/end times.
Actions remain scoped to the named drug's clause: stopping one drug does not mark
its replacement as stopped. Negated action phrases are excluded. A nameless dose
history requires a unique encounter-linked product; generic medical prose is not
assigned to a drug merely to increase coverage.

MedicationAgent retains its existing history and original-document tools. It
searches up to four explicit ingredient/product names plus medication/dose/hold/
restart terms, retrieves at most twenty original documents, and proposes up to
six medication relationships within twenty specialist candidates. Existing
thirty-call per-agent and global budgets remain. Truncation is reported.
No agent reads SQLite, canonical case files or evaluation material.

The medication_reconciliation envelope preserves constituent assertions, source
roles, source-time ordering, unresolved questions and explicit limitations.
Known source times are not substituted for actual exposure times. Explicit ISO
planned dates can establish an overlap between recorded hold/restart instructions;
relative phrases such as tonight/tomorrow or procedure-relative timing do not
become invented administration timestamps. A planned hold followed by a restart
is identified as a treatment transition rather than automatically called a conflict.

Verification resolves patient-scoped originals, checks versions/hashes/anchors,
re-extracts the assertions, and regenerates the complete relationship and canonical
wording. Proposed prose cannot supply facts. Ingestion, causal injury and diagnostic
intents remain rejected. Findings describe documented discrepancies, transitions
or uncertainty, not proven prescribing errors or harm.

For relevant medication intervals the existing orchestrator requests evidence from
the laboratory specialist's actual returned proposals, retaining role provenance
and source references. It does not grant medication agents laboratory access or
attribute provider proposals to the laboratory role. Association questions stay
unresolved under the existing interpretation verifier. Possible illness, hydration
and competing exposures remain questions for source-based review, not inferred causes.

## Before/after execution and measured results

The baseline was frozen before changes using the completed Phase 2.2 engine.
The existing six-case audit harness was reused with isolated migrated temporary
SQLite files and unchanged synthetic assets. Requested CASE-001/002/005 results
are compared below; the other three cases are retained as incidental harness
regressions. Runs use baseline orchestration, legacy chronology reasoning,
deterministic rules and no model/provider inference.

Historical Phase 2.1 reports were not overwritten. Phase 2.3 `before`, final
`after`, and intermediate implementation runs remain separate. Final scoring
consumes only the frozen before/final-after reports, not regenerated scoring
fixtures or reviewer approvals.

| Case | Legacy before → after | Multi-domain before → after | Required-source citation union | Tool calls before → after | Verified medication relationships |
| --- | --- | --- | --- | --- | --- |
| CASE-001 | exact → exact (1/1) | partial → partial | 6/6 → 6/6 | 56 → 74 | 0 → 0 |
| CASE-002 | failure → failure (0/2) | primary partial → partial; renal secondary partial → partial | 7/10 → 8/10 | 47 → 62 | 0 → 2 |
| CASE-005 | failure → failure (0/1) | partial → partial | 1/3 → 2/3 | 39 → 48 | 0 → 1 |

All three final investigations complete. The unchanged legacy scorer requires
timeline_contradiction for every discovery, so medication relationships cannot
make CASE-002/005 exact under that baseline. The multi-domain scorer independently
assesses each expected discovery, and still requires complete connected evidence
plus qualified semantic review. Citation gains are not discovery success.

### Required source-role coverage and missing capabilities

**CASE-002 primary:** valid citation union increases from 2/5 to 3/5. Prescribing
context is 1/2 (`DOC-002-06` present, `DOC-002-03` missing), later reconciliation/
report context is 2/2 (`DOC-002-07`, `DOC-002-11`), and required uncertainty context
is 0/1 (`DOC-002-14` missing). The renal secondary remains 5/5 pooled citations
without a complete expected consolidated relationship. These are coverage counts,
not a semantic score.

The specific missing capabilities are a regimen-level substitution relationship
connecting the prescribing plan's discontinued lisinopril to replacement losartan,
and a safely sourced connection between specialist class-level exposure/renal
uncertainty and the specific medication timeline. Generic ingredient matching
cannot establish either. The new laboratory association question remains unresolved
and does not turn the renal change into medication-induced injury. Semantic
adjudication remains outstanding under the unchanged evaluator.

**CASE-005 primary:** valid citation union increases from 1/3 to 2/3. `DOC-005-05`
and `DOC-005-08` are cited; `DOC-005-10` remains absent. The actual medication
relationship uses instruction text in `DOC-005-08`, later dose uncertainty in
`DOC-005-12`, and structured medication identity/context. It does not connect all
three key-required records within one supported discovery.

The expected documents are generic in places; `DOC-005-10` does not supply a
specific dated medication instruction. The key's `Objective testing` quote also
does not reproduce the wording of `DOC-005-05`. The evaluator's CASE-005 source
roles are explicitly pending qualified review and prohibit exact scoring. We did
not modify that key/specification or attach generic documents to manufacture a
success. Separately authored procedure/discharge instructions and precise
applicability dates would be needed to resolve the original service-level
timeline, if such records existed. They cannot be invented.

### Verified final findings

- **CASE-002 lisinopril:** `FND-d888446c10294adeb889013d42b656b2` connects
  `MED-002-02` discontinued status to reported use in `DOC-002-07/11` and exposure
  uncertainty in `DOC-002-12/17`, with original product/context records.
  It establishes a documented stop-versus-reported-use discrepancy; exact doses
  taken, last use and causality remain unestablished.
- **CASE-002 losartan:** `FND-19104b493ca44b5eb9db2e67e9a780b5` connects the
  order `MED-002-03` with uncertain actual start documented in `DOC-002-11`,
  retaining `MED-002-07` context. It establishes medication-history uncertainty,
  not confirmed exposure.
- **CASE-005 apixaban:** `FND-c60a7f07c5a542939c392b29c645d568` connects the
  conflicting recorded hold/resume wording in `DOC-005-08` to later dose uncertainty
  in `DOC-005-12`, with `MED-005-01/05` identity/context. Both service instructions
  are quoted within one original document; the finding does not pretend that two
  independently retrieved instruction originals exist. Their precise effective
  times and actual ingestion remain unknown.

There is one unresolved cross-specialist medication/laboratory question in
CASE-002 and none in CASE-001/005. Every final verified finding was independently
rechecked against hospital originals by the audit harness: **zero unsupported
verified findings and zero failed evidence checks** in the requested final runs.
No causal or diagnostic intent is approved by the new rule. This is deterministic
record support, not independent clinician validation or whole-report clinical
false-positive precision.

## Controls, failures and validation

Twenty independent controls cover unfamiliar stop/report relationships, genuine
overlap in explicitly dated hold/restart instructions, consistent medication
histories, correctly followed temporary holds, copied active lists without
ingestion proof, incompatible formulations, retrospective orders, incomplete
histories, clause scoping/negation, wrong patient/version/value, missing decisive
evidence, unsupported causality/diagnosis and unresolved laboratory association.

During implementation, three CASE-001 completion assertions failed because the
initial sixteen-document cap was too restrictive. It was increased to twenty
while preserving the existing thirty-call allowance; CASE-001 returns to completed
status and exact legacy discovery. An independent source-reconstruction probe
also rejected candidates whose identity source depended on retrieval order;
deterministic identity-source selection corrected that fail-closed behavior.

The existing architecture substitution test hardcoded exactly two medication
tool calls. The new authorized searches made that assertion obsolete. Its updated
expectation checks the initial history/original retrieval, bounded additional
searches, DTO-only capability isolation, output preservation and independent
verification. No permission or source-validity assertion was removed.

Final complete backend suite: **402 passed, 1 skipped** in 539.81 seconds,
with zero failures. The skip is the existing Windows symlink-escape test, which
requires Developer Mode or symlink privilege. The existing FastAPI/Starlette
TestClient deprecation warning remains. The earlier complete run loaded the old
two-call assertion before its correction: **401 passed, 1 failed, 1 skipped**;
that run is preserved in `backend-initial.xml` and superseded by the clean run.

Final control/architecture/evaluator regression subset: **84 passed**. Both
CASE-001 reasoning modes plus medication controls: **22 passed**. The final
twenty medication controls also pass separately after strengthening family,
conditional and renal-association checks. Ruff lint and formatting pass;
strict mypy passes for 100 source files. `git diff --check` passes.

## Reproduction and artifacts

From the repository root:

```text
uv run --project apps/api --locked python scripts/audit_investigations.py --output docs/evaluation/artifacts/phase2-03 --phase before
uv run --project apps/api --locked python scripts/audit_investigations.py --output docs/evaluation/artifacts/phase2-03 --phase after
uv run --project apps/api --locked python scripts/score_medication_audit.py
```

The before command was executed before implementation. These audit output paths
refuse overwrite; a new replay requires a new output directory. Intermediate
attempts are archived under `after-initial` and `after-intermediate`. The final
`after` is the run scored in [comparison.json](artifacts/phase2-03/comparison.json).
That comparison includes both complete evaluator outputs, input hashes,
per-discovery source-role requirements/missing evidence, canonical finding claims,
named assertion timestamps, tool counts and independent recheck results.
Each case directory retains its report, tools, events, validation and legacy score.

[Final source recheck](artifacts/phase2-03/final-source-recheck.json) records a
further current-code reconstruction of all 50 verified findings across the three
final reports, with zero invalid findings and zero canonical-claim mismatches.
It also records SHA-256 for the changed runtime modules. Original asset bytes
remain protected by the unchanged frozen inventory; no image interpretation is
claimed. The final [medication controls](artifacts/phase2-03/medication-controls.xml)
also check family/conditional scope and confirm that an independently verified
creatinine change still cannot promote a medication causality question to verified.

From `apps/api`:

```text
uv run --locked pytest -q --junitxml=../../docs/evaluation/artifacts/phase2-03/backend-tests.xml
uv run --locked pytest tests/test_architecture.py tests/test_medication_reconciliation.py tests/test_clinical_discovery.py tests/test_generalization_audit.py -q --junitxml=../../docs/evaluation/artifacts/phase2-03/final-controls.xml
uv run --locked pytest tests/test_investigation.py::test_case001_engine_and_post_run_evaluation tests/test_medication_reconciliation.py -q --junitxml=../../docs/evaluation/artifacts/phase2-03/final-regressions.xml
uv run --locked ruff check app tests
uv run --locked ruff format --check app tests/test_medication_reconciliation.py
uv run --locked mypy
```

No live-provider or frontend validation is claimed. Extraction remains a bounded
explicit vocabulary, not comprehensive medication NLP. Relative procedure timing,
retrospectively reported exposure dates not captured by the narrow parser,
unrecognized aliases, product ambiguity and missing histories need further source
retrieval or review. The supported unfamiliar-record relationships are a real
capability improvement; primary expected-discovery success is still not established.
