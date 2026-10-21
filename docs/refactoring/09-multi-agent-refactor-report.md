# Refactor 05 — Bounded adaptive multi-agent investigation

Date: 2026-10-21. Starting commit: `adb5f6be4eec3b96f9607ce7a289697d3987cdaa`.
Branch: `refator/casetrace-mvp`. Starting tree was clean. No commit, push, branch
reset, dependency addition, migration, canonical record/asset/manifest edit or
answer-key change was made. All replay and browser databases were isolated from
`data/runtime/casetrace.db`.

## A. Existing architecture

The existing engine performed real discovery, timeline reconstruction, concurrent
laboratory/medication analysis, contradiction retrieval/referral review, independent
verification and deterministic synthesis. Specialists used scoped tools, with real
permission/patient/budget/provenance enforcement and persisted audit. There was no
task graph or specialist-requested work queue. Objective was recorded but did not
select work. Intermediate proposals were merged in engine-local lists; one optional
provider call proposed candidates/hypotheses rather than selecting tools. Failure
became a limitation, but enclosing stages were marked completed.

Source acquisition, model calls and asset IO already released transactions. The
single shared writer/CAS/event boundary, offline evaluator separation and startup
failure of interrupted investigations were retained.

## B. New architecture

The existing default `baseline` pipeline remains. `adaptive_rules` adds a controlled
extension, selected by `Settings.investigation_strategy` / `INVESTIGATION_STRATEGY`:

| Responsibility | Before | After in adaptive mode |
| --- | --- | --- |
| Planning | Fixed sequence | Discovery, then objective/modality-based task selection |
| Specialist invocation | Heterogeneous `run()` returns | Common typed task/result adapter |
| Delegation | No requested task representation | Source-linked leads, deterministic approval, parent/dependency IDs |
| Follow-up | Fixed contradiction reads | Runtime-triggered correction, report and encounter retrieval |
| Context | Engine-local proposals and sources | Typed task/lead/source manifest plus bounded source accumulator |
| Limits | Duration, tools, provider context/output | Also task count/depth/rounds/concurrency/attempts/leads/candidates |
| History | Agent/tool audit | Additional task/lead decisions, assignment and candidate creator metadata |
| Recovery | Fail interrupted agents/tools/runs | Also reconcile task events and unfinished leads |
| Verification | Deterministic source/proposition checks | Same independent verifier; unchanged clinical semantics |

`orchestration/planner.py` owns pure planning/approval policy;
`orchestration/supervisor.py` owns bounded scheduling and aggregation;
`agents/runtime.py` owns specialist adaptation and lead generation. The engine
still owns lifecycle, the existing verification path and report finalization.
No supervisor or specialist reads hospital tables or canonical case files.

## C. Agent responsibilities

- Retrieval: use existing tools to discover demographics, encounters, document
  hits, observations, medications, studies and reports; publish source manifest.
- Timeline: retain named chronology/precision and existing discrepancy detection;
  propose correction retrieval only when actual candidate conflicts exist.
- Laboratory: retain compatible numeric change analysis; request the observations'
  original linked documents without inferring clinical significance.
- Medication: retain order/status/period observations and source-document anchors;
  discontinued/held/completed statuses can request associated encounter context.
- Contradiction: execute approved correction/encounter/document actions and referral
  review. Returned correction documents can initiate a second encounter task.
- Hypothesis challenge: retain `analysis.challenge` and a deliberate correction
  search. This is a bounded documentation alternative, not a newly implemented
  comprehensive diagnostic challenger. All hypothesis verdicts remain inconclusive.
- Verification and synthesis: retain independent deterministic verification and
  report assembly from persisted findings. No decorative agent was introduced.

## D. Task and lead contracts

`InvestigationAgent` is a Protocol with `name`, `supported_tasks` and
`execute(InvestigationTask) -> TaskResult`. `SpecialistTaskAgent` implements this
over the established independently testable specialists and scoped executor.

`InvestigationTask` carries investigation/patient/task identity, type, assignee,
objective/reason, source identities, required evidence, parent/lead IDs, dependencies,
priority, status, depth, attempts, per-task call allowance, approved retrieval actions,
result references and error. `TaskResult` carries task/agent/execution identity,
existing `AgentResult`, returned sources and optional leads. Results and identities
are validated before merge. Error becomes an explicit failed task/agent attempt;
cancellation propagates to the worker.

Task lifecycle: planned → ready → running → completed/failed/cancelled; dependency,
cycle and exhausted-tool work can be skipped. Unsupported scope/type and duplicate
task IDs are rejected. Lead lifecycle: proposed → approved/rejected →
completed/unresolved. A completed retrieval task is not a verified clinical answer.

Leads carry origin task/agent, clinical-record question, missing information, current
source versions/hashes, receiving specialist, proposed actions, priority and a
concise reason. Equivalent action requests generated together consolidate their
source context. Approval fingerprints normalize argument defaults/identifier aliases
and exclude wording/creator IDs; source hashes/versions remain part of the key.
Rejected leads preserve explicit reasons and nonduplicate unresolved work becomes
a report limitation. Source identity/semantic truth remain distinct.

## E. Adaptive planning and stopping

The existing five objectives choose relevant initial specialists after discovery.
Absent observation/medication modalities are not analyzed. Referral review explicitly
discovers/checks that category because it is absent from the historical manifest.
Timeline tasks precede independent specialist batches. Every dependency must complete;
cycles and unavailable dependencies are visible skips.

Real data-dependent branches include:

1. A chronology candidate triggers a correction-document search. On CASE-001 this
   search returns no clarifying original and remains unresolved. An independent
   ingested correction fixture returns a document, retrieves its original with
   version/hash preconditions and creates a depth-two encounter retrieval task.
2. Changed laboratory measurements identify associated original reports. CASE-001
   consolidates five observation references each into requests for `DOC-001-13`
   and `DOC-001-17`; these IDs come from returned source associations.
3. Medication statuses produce encounter/document follow-up. CASE-001 records
   `MED-001-01` and `MED-001-05` lead to their recorded encounters
   `ENC-001-01` and `ENC-001-06`. No patient/case identifier appears in planner rules.

The loop approves leads by priority, executes bounded tasks, merges returned sources,
accepts new leads and reassesses chronology using existing pure analysis. A returned
correction can cause another round; recursion and peer-to-peer invocation are absent.
Finding proposals still pass the same independent source/proposition verifier.

Defaults: 40 tasks, depth 2, 2 follow-up rounds, concurrency 2, 1 task attempt
(maximum 3 for transient read failures), 40 candidates and 40 leads. Existing
100 total / 30 per-role tool calls, 100000 source-context characters and 180-second
deadline remain. Per-task calls are bounded across attempts; role budgets do not
reset for a new task. Compact task metadata is separately bounded by task/lead/action
counts. Model context/output/retry limits remain in the existing provider.

Stop reasons distinguish objectives completed, evidence exhaustion, budget exhaustion
and partial task failure. Required unfinished work produces limitations. Critical
discovery/synthesis failure, overall timeout or worker interruption fails the run;
it never fabricates a report. No cancellation/resume HTTP route is added.

## F. Tool permissions and source provenance

All additional clinical retrieval passes through the Refactor 04 registry. Approval
checks supported specialist/task/tool, originating completed task, selected patient,
known source identity/version/hash, valid filters, recorded associations, clinical
purpose, duplicates, depth and remaining budgets. Only implemented narrow retrieval
actions are accepted. Unknown tools, arbitrary search, unrelated IDs, invalid filters,
foreign patients and stale references are rejected. The registry independently
rechecks authorization, patient, persisted actor, budgets and returned DTOs.

Search hits remain projections. Follow-up execution retrieves originals using their
source version/hash before reassessment. Original IDs, hashes, named timestamps,
encounter relationships and anchors are preserved. Agent agreement cannot verify a
claim. Task → agent execution → tool → source lineage is auditable through IDs/events;
`finding.proposed` adds creator task/agent execution when known. A normalized evidence-
to-tool foreign key remains a future nullable/additive lineage migration; historical
lineage must not be invented.

## G. Persistence, activity and recovery

Tasks/leads/strategy/creator references use existing JSON context and committed audit
events, with bounded checkpoints. No migration or second writer lock is needed.
Agent attempts now increment inside the shared mutation boundary, satisfying the
existing unique run/role/attempt constraint for repeated specialist tasks.

New plan/task/lead events describe actual execution and approval decisions. Task
assignment correlates execution IDs; completion records result source identities.
No raw notes, model prompts or private deliberation are added to activity payloads.
Adaptive stages record failed/skipped outcomes where appropriate. Existing run
statuses, five-stage progress shape and report sections remain compatible.

REST summarizes repeated executions once per role and reflects running work; event
history retains every attempt. SSE remains committed event replay with contiguous
integer cursors and terminal-tail delivery. Unknown activity types remain compatible
with existing consumers. Browser refresh restores persisted state/evidence/history.

Recovery still fails interrupted investigations. It reconciles task events newer
than checkpoints, including scheduling before the first checkpoint, and preserves
completed/failed/skipped work while closing unfinished tasks and leads. No hidden
resume, duplicate final report or transaction spanning retrieval/inference is added.

## H. Baseline regression

Clean pre-edit output, full event/tool/agent trace and OpenAPI were saved under ignored
`data/runtime/refactor05-before` and `refactor05-openapi-before.json`. Final baseline
artifacts are in `refactor05-final-baseline`. Normalized reports exclude generated
run/finding IDs and creation/verification/generation times, sort findings, and exclude
only the new strategy metadata field. Original clinical times/values/anchors and
timeline ordering are included in equality.

| Metric | Pre-edit / Refactor 04 | Final baseline |
| --- | --- | --- |
| State | completed | completed |
| Verified findings / chronology conflicts | 13 / 1 | 13 / 1 |
| Valid anchors | 108/108 | 108/108 |
| Independent deterministic support | 13/13 | 13/13 |
| Accurate timeline sources | 81/81 | 81/81 |
| Tool calls / error events | 52 / 0 | 52 / 0 |
| Strict / partial discovery | 0/1 / 1/1 | 0/1 / 1/1 |
| Persisted events | 182 | 184 |

Normalized report equality, exact timeline equality and exact agent/tool-start trace
equality pass. The two additional events persist strategy metadata. Agent sequence
remains retrieval, timeline, laboratory, medication, contradiction, synthesis.
No clinical/evidence/scoring policy was changed to improve the benchmark.

## I. Adaptive evaluation

Final artifacts: ignored `data/runtime/refactor05-final-adaptive` and
`refactor05-control`. Early trial exports/logs are preserved separately.

| Metric | Adaptive CASE-001 | Independent control |
| --- | --- | --- |
| State | completed_with_limitations | completed |
| Planned/executed task count | 10 | 5 |
| Leads / follow-up tasks | 5 / 5 | 0 / 0 |
| Follow-up depth | 1 | 0 |
| Tool calls / failed task count | 57 / 0 | 15 / 0 |
| Duplicate leads suppressed after consolidation | 0 | 0 |
| Persisted events | 270 | 96 |
| Verified findings / verified contradictions | 13 / 1 | 1 / 0 |
| Unresolved findings | 0 | 1 |
| Valid anchors / deterministic support | 108/108 / 13/13 | Existing control verification tests |
| Accurate report timeline sources | 82/82 | Named-time tests pass |
| Stop reason | evidence_exhaustion | objectives_completed |

Adaptive CASE-001 retains patient manifest metadata as an unknown-time source in its
projection, accounting for the extra timeline entry; no clinical instant is invented.
No correcting document is returned, so the clarifying lead remains unresolved and the
report honestly has limitations. Strict discovery is still 0/1 and partial 1/1.

The final simultaneous replays measured baseline 20.728 seconds and adaptive 22.435
seconds while full tests also ran. Pre-edit baseline was 8.948 seconds. These are noisy
local samples, not a latency regression threshold or speed claim; adaptive adds five
tool calls and task/lead audit writes. The isolated control measured 3.567 seconds.

Additional ingested control variations exercise chronology conflict, two conflicting
statements (one consolidated search), laboratory change, medication status change,
missing linkage and a returned correction causing depth-two execution. Duplicate
aliases execute once. A missing targeted document fails the task/tool explicitly.
Budget controls preserve unresolved leads instead of fabricating evidence.

## J. Validation

Commands run from `apps/api` unless stated otherwise:

| Check | Result |
| --- | --- |
| `uv run ruff check .` | Pass |
| `uv run ruff format --check .` | Pass; 94 Python files |
| `uv run mypy` | Pass; 80 application files |
| Initial extracted regression: architecture + investigation | 18 passed |
| Initial full implementation run | 213 passed, 1 skipped |
| Focused adaptive suite | 46 passed |
| Final full backend run | 216 passed, 1 skipped; 263.84 seconds |
| Final concurrency/checkpoint-free recovery test | Passed after replacing timing-based overlap assertion with a barrier |
| Alembic upgrade/current/downgrade/upgrade/check | Executed by full foundation suite on isolated databases |
| `uv run python -m app.hospital.cli validate CASE-001 --format text` | Valid; 26 registered assets |
| `uv run --group case-data python ../../scripts/validate_case001.py` | Valid; 23 PDF pages rendered |
| Baseline/adaptive `evaluate_system.py --repeats 1 --strategy ...` | Both finalized; frozen reports independently checked |
| Parsed OpenAPI comparison | Exactly equal before/after |
| Web `pnpm.cmd typecheck`, `lint`, `test` | Pass; 33 tests |
| Web `pnpm.cmd build` | Pass; isolated-origin build and restored normal build also pass |
| `pnpm.cmd exec playwright test --workers=1` | 3 passed, installed Edge, 18.6 seconds |
| `git diff --check` | Pass |

Adaptive tests cover task/result identity, objective/modality plans, scope/permission/
version/filter/association rejection, deduplication, dependencies/cycles, retries,
bounded concurrency, actual follow-up audits, missing targets, partial/budget states,
creator/source references, repeated workers/report uniqueness and restart recovery.
Existing tool/evidence/provider tests cover all twenty tool contracts, fabricated
citations, hashes, foreign patients, unsupported interpretations, provider invalid
output/configuration, rate limiting and failure disclosure.

Browser tests used newly migrated `refactor05-browser/browser.db`, copied assets and
adaptive API execution. They exercised connectivity/retry, chart/asset chronology,
CASE-001 findings, side-by-side sources, refresh, evidence inspector, report, mobile
width and print. Task-owned servers were stopped; normal frontend build restored.
No browser-policy bypass was needed. PowerShell commands used installed `pnpm.cmd`
without changing execution policy.

The first adaptive trial exposed duplicate per-role attempt uniqueness; allocating
attempts within the writer fixed it. A timing-based concurrency test was unreliable
because audit latency can exceed a short test sleep; a barrier now proves overlap.
Both issues were corrected and rechecked. The existing Windows symlink privilege
skip and Starlette/httpx deprecation warning remain.

## K. Limitations and changed files

This is deterministic adaptive orchestration, not validated autonomous clinical
reasoning. No live inference was run, and no model-assisted planning mode is exposed.
The provider's current output contract is candidates/hypotheses, not task proposals;
changing that safely needs a separate typed planning capability and validation.
Existing optional provider assistance remains bounded and visibly fails rather than
silently replacing inference. Tests/stubs do not establish live performance.

Clinical parsing, same-episode interpretation, precise anchor alignment, semantic
hypothesis support, medication causality and referral completion remain limited by
the established rules. Correction retrieval does not semantically resolve an episode
or reinterpret a record. Search is deterministic substring matching. No amendment
reader, pixel inference, unrestricted peer delegation, durable resume or distributed
queue is introduced. Local same-user filesystem access is not an OS sandbox.
Synthetic regression tests do not establish clinical accuracy; expert/held-out review
remains unverified. Strict benchmark discovery remains partial.

Created: `apps/api/app/schemas/planning.py`, `app/agents/runtime.py`,
`app/orchestration/{planner,supervisor}.py`, `apps/api/tests/test_adaptive.py` and
this report (the `app/` paths are under `apps/api`).

Modified: `.env.example`, `.skill/investigation/SKILL.md`,
`apps/api/app/core/config.py`, `app/orchestration/{activity,commands,engine,ports,
queries,reporting,store}.py`, `scripts/evaluate_system.py`, and
`docs/{multi-agent-architecture,backend-architecture,investigation-state-machine,
database-schema,frontend-backend-contract,agent-tools}.md`.
The evaluation harness only adds explicit strategy selection/metadata; benchmark
scoring is unchanged. No frontend source, migration, canonical data or evaluation
answer file changed. Historical reports remain untouched.

## L. Refactor 06 readiness

Refactor 06 can use typed source-linked leads, deterministic task approval, actual
targeted tools, creator execution references and bounded reassessment. Required next
steps are source-backed assertion extraction with exact spans/negation/attribution/
episode context; interval-aware verification; precise claim-local anchor diagnostics;
semantic hypothesis/counterevidence assessment; medication/follow-up reconciliation;
and reviewed nullable evidence-tool lineage/report-publication invariants where
necessary. Keep exact/partial scoring separate and the frozen answer key unchanged.
Any model-assisted planner must add typed proposals, bounded prompt context and
adversarial authorization tests before live evaluation, then undergo held-out and
qualified clinical review. None of those clinical capabilities is claimed complete
by this orchestration milestone.
