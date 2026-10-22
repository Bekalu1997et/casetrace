# Frozen development audit artifacts

`hashes.json` freezes 138 input files before engine changes. All canonical cases,
manifests, case assets and answer keys are unchanged; scorer and evaluator README
are also frozen. `before` and `after` are separate temporary-database replays using
baseline/legacy deterministic rules with identical default budgets. Reports are
persisted before answer keys are loaded for scoring. No runtime database is stored.

Each case directory contains:

- `validation.json`: canonical/manifest/asset validation counts and diagnostics.
- `report.json`: actual finalized report and source anchors.
- `events.json`: durable activity, without private reasoning.
- `tools.json`: sanitized arguments, returned source refs, role, timing and errors.
- `score.json`: unchanged scorer results and independent verifier replay metrics.

Each phase contains a summary, a required-source coverage matrix, and integrity
verification. The final after phase additionally asserts six imported patients.
All 31 required source rows include existence/ownership checks and trace links.
`evaluator_matched` means source coverage membership, not semantic matching.
Unobservable planning/context/reasoning is labeled `not_observable`.

`provider-availability.json` records the configured provider's HTTP 404 response
to a no-record availability probe. No live clinical inference or fallback occurred.
`checks.json` records executed validation results. One full backend pass excludes
the subsequently added cap-propagation test; final targeted checks include it.
The Windows symlink security control is skipped for missing symlink privilege.

To reproduce, use a **new output directory** with
`scripts/audit_investigations.py --phase before`, then `--phase after` after the
engine change. Existing outputs are deliberately refused. To reproduce the
historical before behavior use starting commit
`efe1227c83a014cd3000b622cf486994546c0dec` with the audit runner from this change.
The runner never changes the normal development database or canonical datasets.
This cohort is development evidence, not held-out or expert clinical validation.
