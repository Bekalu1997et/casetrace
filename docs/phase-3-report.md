# Phase 3 implementation report — 2026-10-21

## A. Implementation summary

Implemented an executable investigation backend over imported hospital records:
typed contracts, persistence, guarded lifecycle transitions, audited tools,
timeline reconstruction, deterministic symptom-onset contradiction detection,
laboratory comparisons, medication chronology, conservative referral review,
documentation hypotheses, independent verification, reports and REST/SSE APIs.
The Phase 4 workspace remains out of scope.

CASE-001 arrived during implementation. It was validated and imported using the
existing maintenance pipeline. Its canonical records/assets were not rewritten.
The earlier missing-data observation is historical. Contract conflicts are
explicitly resolved in phase-3-decisions.md.

## B. Agent architecture

Retrieval discovers records through permitted tools. Timeline retrieves events,
encounters and original notes and proposes discrepancies. Laboratory compares
same-analyte/unit observations. Medication reconstructs recorded orders/statuses
and retrieves source documents. Contradiction performs targeted retrieval and a
correction search, reviews referral status and optionally obtains model proposals.
Synthesis consumes verified/rejected/unresolved results without clinical tools.

The deterministic supervisor owns dependencies, limits and completion. Laboratory
and medication reads run concurrently in independent sessions; writes are
serialized. Each specialist runs once. Hypothesis challenge is a typed analytical
module in this bounded workflow, not an unrestricted extra agent topology.

## C. Tool registry

Twenty registered tools use ClinicalRecordService/ClinicalAssetService:

```text
search_patient, get_patient, get_encounters, get_encounter
build_patient_timeline, search_clinical_notes, get_clinical_note
search_documents, get_document, get_lab_results, get_lab_result
compare_lab_results, get_medication_history, get_medication
get_diagnostic_reports, get_diagnostic_report, get_imaging_studies
get_imaging_report, get_imaging_asset_metadata, get_referrals
```

Typed validation, persisted actor/run identity, role scope, patient scope, result
size, deadlines, pagination and tool budgets are enforced. Invalid requests and
failures are audited. Sanitized inputs retain IDs/pagination, not full documents
or arbitrary raw input. Search produces snippets; documents are separately read.
No SQL, raw case, evaluator, arbitrary filesystem or network tool is exposed.
The initial timeline adapter supplies clinical events; separately retrieved
records form the combined timeline projection.

## D. Investigation execution

CASE-001 validation passed with 26 assets. Import loaded 7 encounters, 8 events,
25 observations, 7 medications, 23 documents, 3 imaging studies/assets, 2 referrals,
3 diagnoses, 1 symptom and 8 diagnostic reports.

Several real standalone runs completed, including
INV-327454436f6a4b8db021d745c5a90f63 and
INV-a00bc1df0cb540d4bc134e4f4fa29dbe. The latter report is in ignored local
data/runtime/phase3-report-final.json. State, actual tool activity, findings,
verification and reports are persisted. These ran in explicit deterministic_rules
mode; they are neither mocked LLM outputs nor live LLM demonstrations.

The discovered record discrepancy compares a consultation's later first-onset
history with earlier contemporaneous symptom documentation. Medication results
describe recorded orders/statuses and do not establish causal conclusions.

## E. Evidence verification

Every anchor resolves an original hospital record in patient scope. Checks cover
source/asset existence, version, canonical DTO hash, encounter identity, exact
field/value and quoted text. Wrong values, versions, encounters, foreign-patient
records, fabricated IDs and changed assets fail closed. Asset checks occur after
the read transaction closes.

Deterministic proposition rules verify source observations, comparable laboratory
changes and explicit onset conflicts. Verified observation text and titles are
rendered from the rule/anchors, so arbitrary model prose cannot become verified
merely by citing a real record. Interpretations and hypotheses stay inconclusive.
Qualitative support describes evidence checks, not diagnostic probability.

## F. CASE-001 benchmark results

The offline evaluator read the isolated key only after report finalization:

| Metric | Observed result |
| --- | --- |
| Expected record discrepancy | Detected: 1/1 |
| Verified chronology discrepancies | 1 |
| Verified findings | 13: 1 chronology, 5 laboratory, 7 medication |
| Verified anchors | 108, including repeated references |
| Failed checks within verified findings | 0 |
| Required source coverage | 6/6 across verified findings |
| Unresolved findings in this run | 0 |

Required sources: DOC-001-01, DOC-001-03, DOC-001-05, DOC-001-08, DOC-001-22 and
MED-001-02. Coverage is across findings, not necessarily one consolidated claim.
Tests independently re-resolve every verified finding. Repeated anchors do not
count as independent corroboration. The negative control produced no verified
chronology discrepancy.

Zero failed checks measures reference/rule integrity. No human-rated clinical
quality, diagnostic accuracy, calibrated probability or comprehensive
unsupported-prose rate is claimed.

## G. Tests and commands

Commands ran from apps/api unless noted:

| Command | Result |
| --- | --- |
| uv run --locked python ../../scripts/validate_case.py CASE-001 | Valid; 26 assets |
| uv run --locked alembic upgrade head | Successful; revision 0004 applied |
| uv run --locked python -m app.hospital.cli import CASE-001 | Canonical records imported |
| uv run --locked --group case-data pytest -q | 55 passed, 1 skipped |
| uv run --locked pytest tests/test_investigation.py -q | 11 passed on focused verification |
| uv run --locked ruff check . | Passed |
| uv run --locked ruff format --check . | Passed |
| uv run --locked mypy | Passed; 48 source files |
| uv run --locked alembic check | No new upgrade operations |
| run_investigation.py SYN-001 --output ../../data/runtime/phase3-report-final.json | Completed; 13 verified findings |
| evaluate_investigation.py REPORT ../../evaluation/CASE-001/answer-key.json | Discovery detected; 6/6 sources; zero failed verified checks |
| pnpm.cmd install --frozen-lockfile (apps/web) | Completed; lockfile unchanged |
| pnpm.cmd typecheck, pnpm.cmd lint, pnpm.cmd test (apps/web) | Passed; 18 tests |
| pnpm.cmd build (apps/web) | Production build passed |
| git diff --check | Passed |

Tests cover real FastAPI startup/background execution, report retrieval, SSE
replay, invalid transitions, duplicate execution/idempotency, recovery, timeout,
malformed model output, rate-limit retry, missing configuration, actual foreign
patients, corrupted assets, local-day semantics and UTC chronology. All test
databases are isolated migrated temporary files. Model tests are explicit mocks.

Resolved failures: native uv dependencies were initially absent; PowerShell
blocked pnpm.ps1, so pnpm.cmd was used. New models needed migration 0004. Existing
offline validation needed explicit UTF-8 reads on Windows. Regenerated PNG
compression bytes differed across platforms with identical decoded pixels; tests
now compare regenerated pixels while retaining frozen-asset hashes, exact PDF
bytes and all other metadata checks. Canonical assets were not modified.

One security test skips only when Windows denies symlink creation; it must run on
Linux or privileged Windows CI. One upstream Starlette/httpx deprecation warning
remains. Docker and browser workspace E2E were not executed.

## H. Files modified

- Backend: agents, tools, evidence, llm/prompts/provider, orchestration/store,
  investigation schemas/routes, lifespan/settings and scoped image metadata service.
- Database: investigation models, metadata registration and new Alembic 0004;
  previously applied migrations and hospital tables preserved.
- Tests: investigation integration/unit/provider/API tests, migration-head
  assertion and portable case reproduction/symlink checks.
- Frontend: shared POST transport options, typed investigation client/DTOs/tests.
- Tooling: runtime command, separate offline evaluator and UTF-8 case validator.
- Docs: contract/evidence/database/state/tool mappings, development instructions,
  dataset portability, README, configuration examples and this report.

## I. Remaining issues

Live Gemini execution is unverified: settings report rules mode, no key and no
model. The adapter follows Google's [generateContent API](https://ai.google.dev/api/generate-content)
and validates structured output; failure is explicit and can produce a partial
report. There is no fabricated model fallback.

Parsing supports a narrow explicit onset pattern, not general clinical NLP or
semantic paraphrase verification. Medication analysis establishes source
chronology, not causality/adherence. Follow-up review uses referral status, not
a comprehensive recommendation/due-date extractor or proof of missed care.
Hypotheses are documentation alternatives rather than diagnostic conclusions.
Clinical calibration, expert clinical validation, automated OCR, broad imaging
interpretation and causal inference remain unimplemented or unvalidated. These
limits prevent claiming the entire broad clinical capability scope is complete,
although the CASE-001 rules workflow executes end to end.

The worker is process local and single-process, not a durable queue. Interrupted
runs fail explicitly; retry creates a new run. No cancel/resume HTTP endpoint or
distributed worker is introduced. Runtime/evaluator filesystem ACL isolation
remains an operational responsibility.

## J. Phase 4 readiness

The typed centralized client can create investigations and fetch authoritative
state/progress, activity, timeline, hypotheses, findings/detail and reports, plus
construct replayable SSE URLs. Source anchors resolve through the existing
versioned hospital API. Phase 4 can build the workspace/evidence navigation and
reconnect presentation on real results; it must retain execution-mode labels,
qualitative support and the limitations above.
