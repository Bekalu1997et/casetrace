# Evidence-driven investigation improvement report

Date: 2026-10-22. Starting branch `feature/data-generation`, commit
`efe1227c83a014cd3000b622cf486994546c0dec`. No commits, pushes, resets, new
clinical cases, altered clinical facts or answer-key changes were made.

## Outcome

The five historical failures reproduced exactly in verified-finding counts,
source coverage and discovery grades. The current replay completed every case;
historical CASE-002's completed_with_limitations status did not recur before
changes. The targeted changes improve bounded serial evidence consolidation
without claiming the cohort's clinical mysteries are solved. CASE-001 retains
exact discovery and complete required-source coverage.

Baseline diagnosis was written before engine modifications in
[failure analysis](CASE-002-to-006-investigation-failure-analysis.md). The frozen
scorer still grades all five development cases as failures. No scoring rule,
expected anchor, threshold or required source was relaxed.

## Root causes and evidence

Every required source exists, resolves in the correct patient scope and appears
in a tool response. Returned source IDs alone do not prove original-document
retrieval: search hits are abbreviated representations. Baseline medication
analysis emits independent order observations, laboratory analysis compares only
the first and last values, and referral analysis provides only an unresolved
interpretation. There is no pathology workflow or rhythm-versus-working-diagnosis
specialist reconciliation.

| Case | Supported failure classification | Observable evidence and remaining gap |
| --- | --- | --- |
| CASE-002 | Consolidation, linking; incomplete specialist planning | All ten required documents returned; only two cited before. Serial renal records now retain intermediate changes and linked panel documents; later reported-use versus discontinued-order interpretation is still unresolved. |
| CASE-003 | Planning, consolidation, linking | Six required documents returned; five never support a verified finding. No structured comparison of pathology, specimen, routing, acknowledgment, administrative closure and later follow-up. Routing is not patient communication. |
| CASE-004 | Planning, consolidation | Monitor/diagnostic information is discoverable but no specialist reconciles objective rhythm findings with symptom recurrence and anxiety framing. Anxiety exclusion remains unsupported. |
| CASE-005 | Consolidation, linking | Hold/restart records do not become a combined verified discrepancy. Grouped order states now preserve chronology without claiming ingestion, harm or error. |
| CASE-006 | Consolidation, linking | Earliest/latest comparison misses repeated source-range abnormalities. New batches preserve intermediate values and laboratory document provenance; clinical screening/follow-up interpretation is not adjudicated. |

No baseline failed anchor checks, pagination stalls or exhausted tool budgets
explain these failures. The detailed 31-source lifecycle matrices, including
CASE-001's six regression sources, are in `before/coverage.json` and
`after/coverage.json` under [audit artifacts](artifacts/generalization).
`planned` and `considered` remain `not_observable`: private reasoning is neither
captured nor inferred. `evaluator_matched` in this matrix means source coverage
membership, not semantic clinical discovery. Trace IDs link tools and findings.

## Implementation

- `app/clinical/series.py`: group compatible analytes by explicit code/name and
  units, and medications by explicit generic/name identity within a patient.
  Require multiple encounters; retain named collection/order times. Laboratory
  groups require at least two results outside their own recorded reference
  bounds. Medication groups require differing order statuses. Overlapping,
  bounded batches preserve all included values and relevant source links.
- `app/agents/specialists.py`: laboratory tools retrieve source documents only
  for eligible abnormal-result groups; medication specialists consolidate
  retrieved order snapshots and their existing linked documents. Each series
  generator caps output at twelve proposals. Hitting the limit produces an
  explicit limitation; the baseline engine now preserves specialist limitations.
- `app/evidence/verification.py`: independently resolve originals, check hashes,
  versions, encounter/field anchors, regenerate `record_series`, require its
  complete anchor set and publish the canonical observation instead of candidate
  prose. No diagnostic or causal interpretation is promoted by this rule.
- `schemas/investigation.py`: additive `record_series` rule; existing finding
  types and twenty-anchor maximum remain. No database migration or route change.
- `tools/registry.py`, `orchestration/ports.py`: reuse durable audit storage for
  `tool.page` counts, total, pagination and representation kinds. No raw notes,
  search strings, credentials or keys appear in these new events.
- `orchestration/engine.py`: proposal events now include bounded source refs,
  rule and candidate type, enabling observable citation handoffs.
- `scripts/audit_investigations.py`: freeze input hashes, validate/import six
  patients in a fresh migrated temporary SQLite database, run the real engine,
  freeze reports before scoring, independently reverify findings and required
  source ownership, and export bounded audit traces. Existing outputs cannot be
  overwritten. The normal development database is never opened.
- Tests add independent longitudinal and adversarial controls, cap propagation,
  frozen input/scoring checks and trace-link regression checks. The two
  parametrized CASE-001 failures were traced to one stale dataset-version
  assertion; only `1.0` changed to authoritative `1.1`.

No case IDs, expected discovery strings or evaluator imports were added to
production investigation code. Agents retain ToolExecutor access; database and
filesystem access remain in maintenance, service and persistence components.
Transactions do not span external operations. Shared specialist behavior applies
to adaptive execution too; this audit measures only baseline/legacy mode.

## Measured before and after

Both runs use the same frozen datasets, answer keys, scoring code, baseline
strategy, legacy reasoning and default budgets (100 tools, 30 per role, 40
candidates, 180 seconds). They use Python 3.12.15 and deterministic rules, with
no inference. The after run independently confirmed six imported patients.

| Case | Verified before → after | Sources before → after | Frozen grade before → after | Tools before → after | Seconds before → after |
| --- | --- | --- | --- | --- | --- |
| CASE-001 | 13 → 17 | 6/6 → 6/6 | exact → exact | 51 → 56 | 3.05 → 5.40 |
| CASE-002 | 15 → 22 | 2/10 → 7/10 | failure → failure | 42 → 47 | 3.23 → 7.02 |
| CASE-003 | 8 → 10 | 1/6 → 1/6 | failure → failure | 37 → 39 | 2.49 → 3.83 |
| CASE-004 | 5 → 6 | 1/3 → 1/3 | failure → failure | 37 → 37 | 2.57 → 4.04 |
| CASE-005 | 6 → 8 | 1/3 → 1/3 | failure → failure | 39 → 39 | 2.29 → 4.00 |
| CASE-006 | 7 → 20 | 1/3 → 3/3 | failure → failure | 37 → 45 | 2.19 → 6.08 |

All runs finalize. CASE-006 now correctly reports completed_with_limitations
because its longitudinal proposal cap is reached; other after runs complete.
Unsupported verified findings and failed evidence checks are zero in all twelve
replays. All published findings were rechecked against hospital originals by the
verifier, independently of their persisted verification status. This establishes
deterministic source support, not independent medical truth or expert validation.
No rejected or unresolved candidates occurred in these legacy-mode replays;
that does not mean all clinical questions were explored.

Wall times include the engine only and are single observations; later replays
overlapped backend tests, so differences include machine contention. Additional
tool retrievals and audit writes also add work. These are not performance
benchmarks or evidence of a measured clinical-quality improvement.

### Primary and secondary discovery

The unchanged scorer requires a verified timeline_contradiction touching
expected anchors for every discovery. It was authored for CASE-001 and has no
independent semantic recognition for medication, pathology, rhythm or glucose
findings. It also evaluates source coverage as a union across findings.

CASE-001's primary discovery remains exact. CASE-002's primary medication and
secondary laboratory discoveries are both undetected under the frozen scoring
rule (0/2). CASE-003–006 each remain 0/1. No separate secondary expected finding
is defined for those cases. Clinical semantic discovery is **not established**;
CASE-006's full citation coverage must not be reported as diagnostic success.
The scorer limitation is documented without changing evaluator logic or keys.

### Provider execution

Local configuration names Gemini `gemini-2.5-flash`. An availability request
using the existing provider adapter and no clinical records returned
`MODEL_HTTP_404`; see `provider-availability.json`. No credentials were printed.
Live-provider cohort evaluation was unavailable, and no fallback was performed.
No comparison between live model execution and deterministic replay is claimed.
Model parameters, token consumption and repeated-run variability are therefore
not evaluated here.

## Integrity and regression checks

All 138 SHA-256 entries in `hashes.json` are unchanged after both phases:
canonical cases/manifests, asset files, answer keys, scorer and evaluator README.
Canonical schema/manifest validation and registered asset checksum verification
passed for all six cases. Clinical warnings are preserved per case in
`validation.json`. Each replay uses Alembic upgrade head in a temporary database;
every required source rejects cross-patient resolution. Runtime/evaluation
separation is enforced by allowlisted clinical validation and hospital tools,
with existing architecture/security tests covering evaluator imports, arbitrary
asset paths, permissions and redaction. Local OS permissions are not a sandbox.

Executed checks:

```text
# Repository root
uv run --project apps/api --locked python scripts/audit_investigations.py --output docs/evaluation/artifacts/generalization --phase before
uv run --project apps/api --locked python scripts/audit_investigations.py --output docs/evaluation/artifacts/generalization --phase after
# apps/api
uv run --locked ruff check app tests ../../scripts/audit_investigations.py
uv run --locked ruff format --check app tests ../../scripts/audit_investigations.py
uv run --locked mypy
uv run --locked pytest -q
uv run --locked pytest tests/test_record_series.py tests/test_generalization_audit.py tests/test_tools.py::test_persisted_actor_audit_and_ordered_events -q
uv run --locked pytest tests/test_investigation.py -k case001_engine_and_post_run_evaluation -q
# apps/web
pnpm.cmd test
```

Ruff, formatting and mypy pass. Targeted audit/series/event tests: 17 passed.
Both CASE-001 reasoning-mode regression tests pass. Frontend: 84 tests across
nine files passed. The first full backend process loaded an outdated
event-sequence assertion before it was edited: 285 passed, 1 skipped, 1 failed;
the corrected assertion passed on rerun. Final full backend regression: **294 passed, 1 skipped** in 254.80 seconds.
The skip is the symlink-escape security test: Windows denied symlink creation
without Developer Mode or the required privilege. Other path/ownership checks
passed. Final targeted tests also exercise specialist-limit propagation. No UI source changes or frontend build are claimed.

## Limitations and next development recommendation

The improvement is bounded evidence consolidation, not complete general
clinical investigation. Record-series observations may overlap; count growth is
not discovery quality. Explicit medication identity does not resolve synonyms,
formulations, dispensing, administration or actual ingestion. Laboratory ranges
are source-specific; fasting/random context still requires review. The serial
cap can leave groups unassessed and now reports that limitation.

Pathology result-to-workflow reconciliation, diagnostic hypothesis comparison,
cross-specialist medication/laboratory causal assessment and follow-up absence
verification need structured clinical assertions and independent negative
controls. The generalization cohort is now a development cohort. CASE-007–010
were neither generated nor evaluated, so no held-out generalization claim is made.

Prioritize those engine capabilities and a separately reviewed multi-domain
evaluator specification before further case generation. CASE-001 is suitable
for hackathon demo rehearsal with its established evidence-backed contradiction;
do not demonstrate the five development mysteries as solved. Frontend refinement
can proceed for truthful evidence/activity display, but cannot substitute for
the remaining investigation work.

