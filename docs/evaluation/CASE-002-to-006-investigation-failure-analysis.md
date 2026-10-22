# Investigation failure analysis: frozen baseline

Baseline recorded before engine modifications on 2026-10-22. Branch
`feature/data-generation`, starting commit `efe1227c83a014cd3000b622cf486994546c0dec`;
working tree was clean. See `artifacts/generalization/hashes.json` for SHA-256
inventory of canonical cases, manifests, registered asset directories, answer
keys and scorer configuration. These inputs are immutable throughout this audit.

## Execution and reproduced results

`uv run --project apps/api --locked python scripts/audit_investigations.py --output docs/evaluation/artifacts/generalization --phase before`

Python 3.12.15; baseline strategy, legacy reasoning, deterministic rules, no
provider or network inference. Default budgets: 100 tool calls, 30 per role,
40 candidates. All six patients coexist in a fresh Alembic-migrated temporary
SQLite database, removed after replay. Development database is untouched.

| Case | Verified | Required sources | Grade | Tools | Seconds |
| --- | ---: | --- | --- | ---: | ---: |
| CASE-001 | 13 | 6/6 | exact | 51 | 3.05 |
| CASE-002 | 15 | 2/10 | failure | 42 | 3.23 |
| CASE-003 | 8 | 1/6 | failure | 37 | 2.49 |
| CASE-004 | 5 | 1/3 | failure | 37 | 2.57 |
| CASE-005 | 6 | 1/3 | failure | 39 | 2.29 |
| CASE-006 | 7 | 1/3 | failure | 37 | 2.19 |

All historical discovery/coverage counts reproduced. No unsupported verified
findings were found by independent verifier replay. Durations exclude migration
and import. Exact status, IDs, configurations, checks and traces are in each
case's `before/CASE-*/score.json`, `report.json`, `events.json`, `tools.json`.

## Source lifecycle and tool analysis

The complete machine-readable matrix is `artifacts/generalization/before/coverage.json`.
Every required source exists, resolves under its owner, rejects foreign-patient
resolution, and occurs in at least one returned tool source list. This does
**not** imply original document text was available: search hits are bounded
representations. Timeline retrieves clinical notes; medication retrieves its
linked documents. Diagnostic reports are discovered but no specialist
systematically reconciles their recommendations with later workflow records.
No budget exhaustion, pagination stalls, tool errors or evidence-anchor
rejections explain these baseline discovery failures.

`planned` and `considered` are not observable from baseline traces. Tool calls
are observable actions, not evidence of private reasoning. Report timelines
also do not prove cross-record consolidation. Supporting tool/finding IDs are
included for each source. Evaluator source membership is distinguished from
semantic discovery recognition.

## Failure classification and case-specific causes

- CASE-002: consolidation and linking. MedicationAgent emits one finding per
  order, not medication-identity reconciliation. LaboratoryAgent compares
  earliest/latest only, losing intervening changes and recovery. Clinical notes
  about reported use are not reconciled with order state; ingestion and cause
  remain unknown. Only two required documents become verified citations.
- CASE-003: planning, consolidation and linking. A pathology report can be
  discovered but no dedicated result/routing/acknowledgment/administrative
  closure reconciliation exists. `followups` only proposes an interpretation of
  referral status. Its missing-care interpretation cannot verify deterministically.
- CASE-004: planning and consolidation. Diagnostic reports have no dedicated
  hypothesis-comparison consumer. Rhythm evidence and symptom-bearing notes
  are not combined into a supported reconsideration question. Anxiety exclusion
  would remain unsupported even if the objective report were cited.
- CASE-005: consolidation and linking. Independent medication snapshots do not
  reconstruct hold/restart instructions versus reported exposure. Neither order
  state nor source retrieval establishes actual ingestion.
- CASE-006: consolidation and linking. Earliest/latest numerical inequality
  misses repeated abnormalities and intermediate measurements. There is no
  longitudinal abnormal-result/follow-up reconciliation. Fasting/random context
  and HbA1c must not be collapsed into a diagnosis.

## Verification and evaluator analysis

Verifier accepts exact source-field observations, a numerical pair and onset
chronology. Generic interpretations remain inconclusive by design. Merely
relaxing interpretation verification would publish unsupported conclusions.

The frozen scorer `scripts/evaluate_investigation.py` requires at least one
verified `timeline_contradiction` touching expected anchors for *every*
discovery. That is appropriate to its original CASE-001 purpose but cannot
recognize a standalone laboratory/medication/follow-up discovery. Source
coverage is a union across findings, not evidence of a consolidated discovery.
This is a demonstrated scope limitation, not proof that baseline findings
semantically satisfy any expected answer. Scorer and thresholds stay frozen.
Primary/secondary per-finding semantic grading is not provided by this scorer.

## Prioritized implementation backlog

1. Preserve bounded serial laboratory evidence (including intermediate values)
   and compare compatible analytes using recorded ranges, not disease cutoffs.
2. Group medication snapshots by explicit identity and reconcile differing
   documented states while preserving source-document references and uncertainty.
3. Emit candidate source IDs and tool pagination metadata through existing
   audit events, without notes or raw filter content.
4. Add independently regenerated relationship verification, adversarial controls,
   and update the two stale CASE-001 version assertions after reproducing them.
5. Keep pathology workflow reconciliation and diagnosis challenges as explicit
   unresolved capabilities until structured clinical assertions and negative
   controls support them. Do not equate absent documentation with missed care.

## Limitations

No external-provider run is performed: local deterministic execution is supported;
no live model quality or variability claim is made. These five cases become a
development cohort after diagnosis. CASE-007–010 remain untouched; no held-out
validation or expert medical review has occurred. Runtime code excludes evaluator
imports, but local filesystem permissions are not a security sandbox.
