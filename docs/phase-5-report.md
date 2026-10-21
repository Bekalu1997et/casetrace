# Phase 5 release-readiness assessment

Date: 2026-10-21. Branch: `develop/casetrace-mvp`. Initial working tree was clean. No commit, push, destructive reset, canonical case edits or secret changes were performed.

## Overall assessment

**Conditionally ready for a synthetic, explicitly deterministic rules-mode hackathon demonstration. Not fully Phase 5 complete, and not validated for clinical use or live-model claims.** Actual investigations retrieve hospital records, verify propositions, persist reports and support original-source inspection. Strict exact-anchor discovery remains partial; configured live inference and qualified clinical review are unverified.

## Phase 1–4 audit

| Capability | Initial audit | Verified outcome |
| --- | --- | --- |
| Foundation: FastAPI, Next, health, settings | Implemented | Startup and production build pass; locked uv/pnpm commands execute using existing installs |
| Fresh dependency install | Implemented, unverified this phase | Existing locked environments used; no clean-machine reinstall claimed |
| SQLite/migrations | Implemented | Isolated databases migrate; existing FK/WAL/rollback/concurrency tests pass; reset integrity checks pass |
| CASE-001 ingestion/assets/provenance | Implemented | Canonical validation passes; 26 assets, 23 PDF pages rendered; idempotent import passes |
| Hospital APIs and patient boundary | Implemented | Real patient/source retrieval, negative controls and scoped source tests pass |
| Orchestration/tools/timeline/contradiction | Implemented | Three repeat API runs and two successful browser rehearsals, including after reset |
| Medication/follow-up/hypothesis analysis | Partial bounded implementation | Structured analysis is present; missing care/causality remain uncertain; broad semantic quality not validated |
| Evidence verification and persistence | Implemented | Independent source/proposition checks pass; new adversarial and reset regression tests pass |
| Frontend dashboard/chart/launch/activity/timeline/evidence/report | Implemented | Integrated browser flow passes on real FastAPI/SQLite; refresh restores state |
| Error/recovery | Implemented with limits | Existing failure/idempotency/restart/SSE tests pass; broader chaos drills remain unverified |
| Evaluation/reset/runbook | Partial/missing initially | Executable runner, stricter scoring, backed-up dedicated reset and timed runbook added |

## Completed validation

- Backend baseline: 55 passed, 1 skipped (Windows symlink privilege).
- Final full backend suite after verifier fix: **64 passed, 1 skipped**, 106.97 seconds. A subsequently added reset regression was validated in the targeted Phase 5 suite: **10 passed**, 16.35 seconds. The full suite predates that one added test; these totals are not a claimed single 65-test run.
- Ruff check, Ruff format check and mypy pass (48 application source files).
- Frontend: **33 tests passed**; typecheck, lint and optimized production build pass.
- Dataset validation: 7 encounters, 8 clinical events, 25 observations, 7 medications, 23 documents, 3 imaging studies/assets, 2 referrals, 3 diagnoses, 1 symptom, 8 diagnostic reports. Asset hashes, IDs and evaluator associations validate. Medical plausibility is pending independent expert review.
- Adversarial tests cover fabricated values/units/timestamps/encounters/passages, nonexistent records/fields, duplicates, unsupported field observations, cross-patient sources, changed assets and unsupported interpretations. PDF page locators are unsupported; unknown fields fail closed. Existing tests cover negative chronology/documentation controls.
- Existing reliability tests exercise timeout, malformed provider response, simulated 429 retry, tool permission/budget errors, missing patients/assets, duplicate starts/worker claims, recovery and report uniqueness. This does not establish that every requested fault scenario or production concurrency case is covered.

## CASE-001 results and metrics

Frozen reports/events and machine-readable results: `data/runtime/phase5-final-evaluation/`. These local artifacts are ignored by Git. Temporary evaluation databases are isolated and removed after export. Answer-key scoring occurs after frozen persisted output; no answer key enters runtime tools or prompts.

| Run | ID | API-to-report duration | Tool calls | Failure events |
| --- | --- | --- | --- | --- |
| 1 | INV-b6c2c4e99ccf400cb18231412e0a21e3 | 5.985 s | 52 | 0 |
| 2 | INV-9561272d2e8347f391ae649d7cc0ef15 | 5.965 s | 52 | 0 |
| 3 | INV-ed63ae584d7747a3bc2c69709b1423e1 | 6.201 s | 52 | 0 |

All three reached completed in deterministic_rules mode, with 13 verified findings and one verified record-level chronology contradiction each. The June history says cough first began May 26 with none before; the contemporaneous January event records earlier cough. Medication attribution and underlying clinical cause remain uncertain.

Per run: citation validity **108/108 anchors**; deterministic proposition support **13/13 findings**; failed deterministic support **0/13 verified findings**; source timestamp projections **81/81 timeline entries**; decisive source coverage **6/6**. Strict exact discovery **0/1**, partial discovery **1/1**. The old scorer awarded detection from overlapping source IDs; the stricter scorer requires expected fields/values/passages. Contextual citations are broad and some quoted snippets do not match the full expected passage, so exact credit is withheld. These results do not quantify clinical diagnostic accuracy or imply independent corroboration for repeated anchors.

Clinical support correctness beyond deterministic propositions, hypothesis fairness, unsupported narrative interpretation, uncertainty calibration and accidental clinical implausibility: **pending expert review**, not assigned fabricated percentages. Live provider/model/token/latency metrics: **unverified/not measured**; current settings are rules mode with no configured model/key.

## Performance

Latest isolated application lifespan startup: 0.061 s; validation/import: 0.276 s. Network production frontend reported ready in 0.353 s. API-to-report elapsed times above include health/patient/create/poll/report HTTP overhead; they are not isolated inference timings. Earlier concurrent development runs took 10.77–14.18 s, showing machine-load variation. Frontend/browser acceptance took 18.3 s before reset and 13.2 s after reset (whole test processes). LLM latency, token counts, memory, individual agent/tool/verification timings and comprehensive API latency distributions were not measured. No caching or performance architecture changes were introduced.

## Browser and reset rehearsal

Actual Edge/Playwright on ports 8015/3015, separate from existing user servers on 8000/3000: dashboard search, chart/labs, create, terminal report, source comparison, timeline source, persisted activity, reload/source selection, report citation, mobile overflow and no page exceptions passed. The same workflow passed after a backed-up offline reset and API restart. Screenshots were visually inspected; desktop comparison and mobile report were readable. Print PDF was generated; full pagination/accessibility/keyboard/reduced-motion review was not completed. Medication/follow-up/hypothesis UI interactions were not individually asserted in the browser test.

Reset retained `backup-20261021T034534802128.db`, then cleared 3 investigations, 39 findings, 324 finding links, 324 evidence refs, 156 tool calls, 18 agent runs, 546 events, 15 stages and 3 reports. Clinical records were unchanged and idempotent import returned unchanged. A post-reset real browser investigation remains inspectable at `http://localhost:3015/investigations/INV-458440a4e3c2489c95dea3afef281a49` while the dedicated services are running. Canonical records and the normal development database were untouched.

## Defects fixed and unsuccessful checks

- Verifier now rejects duplicate evidence anchors and field observations without supporting anchors; fabricated claims are not promoted by these inputs.
- A regression initially applied the support requirement to hypothesis counterevidence. Full backend validation caught it; the guard was narrowed and tests rerun successfully.
- Offline scorer no longer equates two overlapping expected source IDs with exact benchmark discovery.
- New reset initially omitted finding/evidence links. Populated-database rehearsal failed its FK check and rolled back; dependency-complete deletion fixed it, and a regression verifies populated reset, active-run refusal, clinical preservation and idempotence.
- Browser tests can target a separately configured backend. An initial run failed because a local editing command damaged Unicode locator strings; the original UTF-8 source was restored and both browser rehearsals passed.
- Attempts to start services on occupied default ports failed without stopping the user's servers; dedicated ports were used.
- Existing Starlette/httpx deprecation and Windows symlink privilege skip remain disclosed. No failed check was converted into a claimed pass.

## Outstanding issues and release gates

| Severity | Issue | Required action |
| --- | --- | --- |
| High for live-model demo | No configured live provider/model/key or live quality runs | Configure privately and run `evaluate_system.py --live` before any live inference claim |
| High for strict benchmark acceptance | Discovery grades partial rather than exact | Review anchor granularity and clinical semantics independently; do not change the frozen key or inflate the score |
| High for enforced runtime isolation | Local same-user runtime can read repository evaluator files outside tool APIs | Use an isolated runtime account/container with approved mounts; current logical tool/API isolation is not an OS sandbox |
| Medium | No dedicated full prompt-injection/CORS/error/secret-log fault campaign; all requested chaos scenarios not individually exercised | Add bounded adversarial integration drills; retain actual failures |
| Medium | Clinical/hypothesis/uncertainty quality not expert validated | Arrange qualified review; keep synthetic and clinical limitations prominent |
| Medium | Reset requires truthful offline acknowledgment, without process lock; fixture conflict after clearing requires backup recovery | Operate only on the dedicated stopped target and retain backups; a process maintenance lock remains future work |
| Medium | No prerecorded fallback, comprehensive accessibility or print pagination review | Capture a labeled real walkthrough and rehearse keyboard/print before presentation |
| Low | Dependency deprecation and OS symlink test skip | Track upstream compatibility; run privileged/Linux symlink test |

No known remaining critical evidence-validation defect was demonstrated by these tests; this is not proof that none exists. Full Phase 5 completion is not claimed. Broader held-out clinical/generalization evaluation is absent. SQLite remains one API process with short transactions, not a validated concurrent multi-user deployment.

## Files and final recommendation

Evaluation: `scripts/evaluate_system.py`, `scripts/evaluate_investigation.py`. Backend: `app/evidence/verification.py`. Tests: `apps/api/tests/test_phase5.py`, configurable API target in existing browser test. Operations: `scripts/demo_reset.py`. Documentation: README, implementation/evaluation plans, demo runbook, Phase 5 operations/report, demo reset skill. No schema/migration, dependency, patient fixture, prompt or frontend product redesign changes.

Present the verified rules-mode workflow with its partial benchmark result disclosed. Before any stronger readiness claim, complete the high-priority gates, record a real fallback walkthrough and run remaining expert/security/accessibility checks. Use only the dedicated offline reset command in the operations guide; retain the completed real run and its database backup.
