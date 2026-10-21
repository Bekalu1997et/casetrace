# Refactor 01 — Sequenced implementation backlog

Baseline: `d7bbb1a8bfbd1182624f28970cd24c628401d715`. This is a proposed plan;
R01 implements documentation alignment only. Gap IDs refer to the
[matrix](02-specification-gap-matrix.md). Preserve the
[compatibility constraints](04-contract-compatibility.md) throughout. Milestone
numbers below are this refactoring program, not historical implementation phases.

## Order and gates

| Priority / milestone | Workstream | Depends on | Exit gate |
| --- | --- | --- | --- |
| P0 R02 | Backend structural refactoring | R01 evidence/compatibility baseline | Injectable boundaries and equivalent runtime behavior; no schema/API changes |
| P1 R03 | Clinical case data and ingestion | R02; amendment decision before versioning changes | Frozen CASE-001 unchanged; explicit ingestion/version policy and real new fixtures when authorized |
| P1 R04 | Clinical tool implementation | R02, relevant R03 schema decisions | Every catalog entry has tested semantic input/output, permissions/scope/audit |
| P1 R05 | Multi-agent orchestration | R02/R04 | Typed bounded tasks, honest stage outcomes, persisted attributable execution |
| P1 R06 | Clinical reasoning and evidence | R03/R04/R05 where applicable | Better source-backed discovery/semantic assessment with deterministic safeguards and frozen truth |
| P2 R07 | Frontend architecture | R02 compatibility; R04/R06 contracts when consumed | Typed clinical boundaries, preserved REST/SSE/deep links; no full rewrite |
| P2 R08 | Hospital and multimodal UI | R03/R07 and approved inventory APIs | Linked encounter/lab/medication/document/imaging/case experience on real records |
| P2 R09 | Investigation UI and design fidelity | R05/R06/R07 | Inspectable live workflow, source comparison/report and verified responsive/a11y behavior |
| P0 throughout, release gate R10 | Evaluation and reliability | Begins at R02; final gate after R06/R08/R09 | Honest exact/partial/semantic metrics, isolation/live/browser/fault results explicitly recorded |

R07 can proceed on stable existing contracts while R04–R06 evolve; do not make
the frontend wait for an unnecessary backend rewrite. Fix demonstrated evidence
integrity defects immediately in their own scoped patch and regression, rather
than burying them in a structural milestone.

## R02 — Backend architecture

Objective: make the simulated hospital replaceable and investigation components
independently testable while preserving the working vertical slice. Covers
B-01/B-02/B-08/B-11, T-24 and structural parts of A-01.

Tasks:

1. Characterize current API DTOs, canonical hashes, tool results, supported
   rule outputs, event ordering and recovery behavior using existing tests and a
   frozen rules-mode run. Compare logical content, not generated IDs/durations.
2. Define minimal ClinicalReader/SourceResolver/AssetReader and ToolExecutor
   Protocols at DTO boundaries. Include only operations actually consumed.
   Add fake implementations for isolated service/specialist tests.
3. Construct concrete local repository/session adapters at composition boundaries.
   Remove database/model/RESOURCES composition from tool handlers and prevent
   specialist code from depending on concrete registry/store members.
4. Move digest and shared chronology/proposition primitives to neutral modules
   where both evidence and agents consume them. Preserve byte-for-byte digest,
   source timestamp semantics and rule outcomes. Do not broaden the parser here.
5. Extract patient-list filtering/projection from HTTP router into hospital service.
   Separate InvestigationStore application mutation/lifecycle, query projection and
   ORM persistence collaborators incrementally, keeping one serialized writer.
6. Extract report assembly/result collection from `_run` only where dependency
   boundaries become clearer; retain fixed execution order, budgets and recovery.
7. Add dependency-direction checks for agents→executor, verifier→source/rules and
   tools→clinical port; retain integration tests through real local adapters.

Likely files: `app/main.py`, `api/routes/hospital.py`,
`api/routes/investigations.py`, `hospital/{service,repository,asset_service}.py`,
`tools/{clinical,registry}.py`, `agents/{specialists,analysis}.py`,
`evidence/verification.py`, `orchestration/{engine,store}.py`, related tests.
Small new ports/services/repository modules are appropriate when extracted from
real responsibilities; do not generate empty architecture folders.

Acceptance criteria:

- Agents import no DB/ORM/filesystem/evaluator/provider SDK and receive no store
  capability. Alternate in-memory fake clinical adapter runs a specialist test.
- Verifier no longer imports the agent implementation module; shared pure rule
  tests preserve outcomes. Tools no longer import orchestration persistence just
  to compute a source digest.
- Current routes, envelopes, status values, field names, source hashes, canonical
  IDs, idempotency, finding counts/anchors, SSE replay and terminal recovery work.
- Same supported one-process transaction model: no sessions over inference,
  asset hashing or streaming; CAS + event commit retained; no applied migration edits.
- Ruff/format/mypy/full pytest and web checks pass; isolated CASE-001 replay remains
  honestly partial if its semantic behavior has not changed.

Regression tests: existing foundation/hospital/investigation/Phase 5 suites;
protocol fake tests, route/DTO contract tests, CAS conflict, duplicate create/claim,
negative patient/tool permission, report-not-ready and terminal SSE tail.
Risks: moving helpers changes hash encoding; broad repository extraction changes
autoflush/CAS behavior; lifetime changes retain transactions; “cleanup” accidentally
alters errors or tool output. Review one boundary per patch. No frontend, case,
answer-key, schema, missing-tool or agent-reasoning feature work in this milestone.

## R03 — Clinical case data and ingestion

Objective: support reliable clinical records and future dataset/version growth
without contaminating runtime with authored answers. Covers D-01–04, B-09.

Tasks:

1. Retain frozen CASE-001 and manifest; validate original hashes, cross-record
   ownership, narrative/structured values and offset/date precision.
2. Document one supported JSON serialization and maintenance CLI. Add bulk import
   only when real multiple cases exist; do not synthesize nine empty datasets.
3. Specify append-only amendment/version workflow, public identity policy and
   historical citation retrieval before supporting changed imports. Preserve old
   versions and hashes; never silently rebind existing findings.
4. Define neutral runtime case metadata/readiness from actual imported resources;
   exclude mystery types, expected relationships and evaluator labels.
5. Author CASE-002 onward only under separate generation scope and expert review;
   include independent negative, delayed-entry, recurrence and uncertain-time cases.
   Validate manifest/byte/text links before publishing each version.

Dependencies: R02 adapter; C-03/C-09 identity/serialization decisions; new amendment
and inventory contracts. Likely files: `hospital/{schemas,validation,ingestion,cli}.py`,
models and **new** Alembic revision if approved, `scripts/validate_case*.py`,
seed wrappers, `data/cases/`, `data/assets/`, offline `evaluation/`, case docs.

Acceptance: original CASE-001 unchanged; identical import remains no-op; changed
same-version import still fails until explicitly superseded; historical citations
remain retrievable after any approved amendment. Case readiness counts only real
records. No evaluator data reaches clinical persistence/assets/API.

Regression tests: clean migration/import twice, changed-content rollback,
cross-patient report/observation/asset links, missing/corrupted bytes, date-only
round trips, source-version history, runtime/evaluator exclusion.
Risks: fixture churn invalidates benchmark; global external-ID collisions;
amendments expand scope; clinically implausible authored records. No automatic
CASE-001 regeneration or answer-key adjustment.

## R04 — Clinical tool implementation

Objective: make twenty tools semantically faithful and useful for targeted
retrieval, preserving permission and provenance safeguards. Covers T-01–25.

Tasks:

1. Make per-tool input/output/description/permission/handler/audit definitions.
   Preserve old shared-input callers through explicit adapters until migrated.
2. Decide search_patient meaning inside a selected-patient run; never permit
   implicit cross-patient discovery. Restrict clinical-note aliases to documented
   note types or explicitly document alias semantics.
3. Add documented encounter, laboratory, medication, report, imaging and referral
   filters; reject unsupported combinations rather than ignoring them.
4. Define canonical-source fingerprint versus search-hit projection fingerprint;
   keep unranked substring search honest. Test every returned field/ref/hash.
5. Implement calculated compatible-lab comparison DTO with missing/zero baseline,
   unit/analyte identity and chronology controls. No medical causality claims.
6. Reconcile broad timeline tool specification with existing event-list adapter;
   prefer composed read capability or versioned output over silent change.
7. Persist safe validated query/time/analyte filter audit, durations and result
   refs; define evidence-to-call attribution. Bound pagination and repeated reads.

Dependencies: R02 ports, applicable R03 schemas, explicit tool schema evolution.
Likely files: `tools/`, `schemas/investigation.py`, hospital DTOs/service,
`agents/specialists.py`, persistence audit methods, tool contracts and tests.

Acceptance: each of twenty inventory rows has positive/empty/error/filter/paging
tests; all role allow/deny and patient/actor mismatch paths audited; tool catalog
matches real schemas/handlers; specialist targeted retrieval needs no direct
local-storage knowledge. Search hits cannot masquerade as exact source evidence.

Regression tests: existing permission/budget/timeout suite plus per-tool contract
tests, foreign IDs, unsupported types/filters, hash consistency, asset absence,
compare mismatches and pagination termination. Risks: semantic changes to aliases,
new filters unexpectedly exclude decisive sources, duplicate caching hides actual
tool activity. Preserve genuine backend events.

## R05 — Multi-agent orchestration

Objective: controlled, attributable evidence-driven investigation beyond a fixed
pipeline, with explicit bounds and truthful outcomes. Covers A-01/A-03/A-04/A-06,
B-06 and objective handling.

Tasks:

1. Introduce common task/context/result types with source manifest, execution ID,
   candidates, evidence requests, limitations and termination reason.
2. Retain deterministic mode; distinguish optional model proposals from actual
   adaptive planning. Make objective select an explicit allowed task plan.
3. Add bounded follow-up retrieval and re-evaluation on missing evidence, using
   only registry-permitted tools and structured requests, not arbitrary code.
4. Persist concise task graph/attempt/outcome state needed for inspection; no
   hidden deliberation. Group/deduplicate candidates and preserve creator agent.
5. Aggregate stage outcomes from actual agents: optional failure/skip/limit is
   visible; completed-with-limitations report cannot imply all work succeeded.
6. Keep single process, execution limits and current fail-on-restart policy unless
   a separate decision changes recovery. Provider failure must remain visible.

Dependencies: R02 boundaries, R04 tool contracts, stage/task persistence design
before migrations. Likely files: orchestration engine/store/services, specialist
types, models/new migration if needed, provider/prompts, API state/event schemas.

Acceptance: bounded evidence-request branch demonstrably executes a real extra
tool, exhausted branch ends unresolved, parallel specialists have independent
sessions and budgets, all candidates carry creator identity; UI activity matches
actual failures/skips. No self-declared autonomous reasoning for fixed rules mode.

Regression tests: fixed rules replay, objective plans, exhausted budgets/deadline,
one specialist failure, malformed/adversarial proposals, no recursive tool bypass,
duplicate task/result, restart and terminal-event guards.
Risks: uncontrolled loops, context growth, outcome enum breaks, overclaiming
resumability or model capability. Keep C-04/C-05 compatibility explicit.

## R06 — Clinical reasoning and evidence

Objective: improve discovery and explanation while maintaining independently
resolved, exact-source verification. Covers E-02–07, B-05/B-07 and A-05.

Tasks:

1. Generate offline anchor-failure diagnostics from frozen output: missing source,
   wrong field, missing full passage/value, incomplete claim-local chain. Keep
   exact truth unchanged. Separate source coverage from one coherent finding.
2. Extract source-backed symptom assertions with text locations, subject,
   attribution, negation, onset interval, uncertainty and episode context. Model
   suggestions must round-trip to original quotes; do not invent dates.
3. Deterministically compare intervals and documentation/occurrence semantics.
   Keep documentation delay, ambiguity, false positive and insufficient evidence
   distinct. Implement review_before_result only with exact reference/review and
   availability/delayed-entry tests; unsupported rules stay inconclusive.
4. Improve compatible laboratory trajectories and recorded medication exposure/
   symptom questions. Missing adherence/admin evidence remains unknown; temporal
   association never establishes causality.
5. Reconcile follow-up recommendations, planned dates, referrals, reports and
   completed studies; lack of a completion note is not missed care.
6. Replace positional hypothesis supports/weakens labels with explicitly assessed
   semantic relationships, counterevidence and missing information. Keep validity,
   proposition support and clinical interpretation separate.
7. Add creator/tool lineage, versioned locator schema and report publication
   invariants with reviewed migrations/readers as required. Historical unknown
   lineage must stay unknown. Deduplicate dependent/copied evidence explicitly.

Dependencies: R03 version policy, R04 original-source retrieval, R05 task context;
qualified review for clinical semantics. Likely files: pure analysis/domain rules,
evidence verifier/service, schemas/models/new migrations, agents/prompts, report
assembly, offline evaluator and held-out fixtures. Never modify truth to fit output.

Acceptance: exact anchor diagnostic is reproducible; verified chronology retains
all decisive evidence with original times/quotes; held-out paraphrases and
recurrence/negation controls do not yield unsupported contradictions; all report
claims trace to persisted checked findings; valid irrelevant anchors do not count
as semantic support. Publish separate exact/partial and expert semantic results.

Regression tests: fabricated source/value/quote/hash/encounter, changed assets,
duplicate anchors, source-only hypothesis, same symptom/different episode,
relative/date-only/unknown/timezone cases, follow-up performed-before-report,
medication order without use, report from wrong run or unsupported finding.
Risks: parser overfitting, unsupported semantic certainty, copy-forward evidence
inflating strength, broad context hiding missing decisive passages. Preserve
qualitative evidence labels without numeric probability claims.

## R07 — Frontend architecture

Objective: retain working API/SSE/deep-link behavior and make clinical views typed
and maintainable. Covers F-02/F-03/F-16–18/F-20.

Tasks: replace open hospital record dictionaries with resource-specific validated
DTOs; reuse centralized request/error handling; add contextual patient/run layouts
only where useful; split dense workspace/report/viewer responsibilities;
index activity correlation; preserve abort/patient scope and REST-first stream
reconciliation; persist safe chart selection in URL; fix interval/date-only ordering.
Specify additive case/run-list contracts with backend before navigation depends
on them. No mandatory TanStack Query or features-tree migration.

Dependencies: existing compatibility baseline and approved new DTOs as needed.
Likely files: `types/hospital.ts`, `lib/api/{hospital,investigations,client}.ts`,
hooks, App Router layouts/pages and domain components/tests.

Acceptance: malformed clinical payloads fail visibly; all existing deep links
load/reload; no arbitrary component fetch; aborted old-patient data cannot appear
under a new patient; stream replay/unknown events dedup and history survive errors.
Regression tests: existing 33 tests plus DTO null/unknown/invalid shapes,
identity navigation race, reconnect/out-of-order events, tab/source URL restoration,
mixed date precision. Risks: validator rejects valid optional data, parallel
state caches diverge, route reshaping breaks saved reports.

## R08 — Hospital and multimodal UI

Objective: present existing clinical assets as a navigable hospital record,
not merely a list of field cards. Covers F-01/F-03/F-05–09/F-14, D-01/D-02.

Tasks: real chart summary/counts and encounter-related records; typed lab table
and compatible series with source-point links; medication history with provenance;
document list/context/text/PDF viewer, browser-independent controls where practical;
study/report/gallery with full-size pan/zoom and paging; neutral case library and
readiness for actual imported cases only; explicit missing artifact states.

Dependencies: R07 typed clients; R03 clinical/version policy; additive case/history
API if required. Likely files: patient/encounter/lab/medication/document/imaging
components, contextual routes/hooks/API DTOs and fixtures for missing data.

Acceptance: selecting encounter reveals only its related records; every chart
source ID navigates correctly; values/units/collection/report dates preserved;
original asset displays with synthetic label; missing image leaves chart usable;
no default nine fake cases or evaluator mystery labels. No regeneration needed
for richer CASE-001 display.
Regression tests: patient→encounter→lab/document/image source traversal, mismatched
ID, empty section, unavailable/corrupt asset, multi-page PDF, image gallery paging,
keyboard viewer operation and narrow layouts.
Risks: treating educational diagrams as diagnostic images, broken source linkage,
native PDF support differences, unscoped resource detail reads mistaken for auth.

## R09 — Investigation UI and design fidelity

Objective: make actual work and evidence easy to inspect using existing design
tokens and references. Covers F-04/F-11–15/F-19.

Tasks: route-aware/collapsible shell and contextual navigation; five-stage workflow
rail from real outcomes; task/agent status and safe tool inspector; simultaneous
or deliberately collapsible activity/timeline/findings/evidence areas; clearer
contradiction comparison with original values/time semantics; source index and
compact report sections; tested print pagination and keyboard/focus behavior.

Dependencies: R05 outcomes, R06 evidence assessments/locators, R07 integration;
do not invent unsupported fields to match prototypes. Likely files: shell,
workspace, activity, findings, evidence, timeline, hypotheses, report, CSS/shared
primitives and E2E/component tests.

Acceptance: reviewer can follow actual retrieval→candidate→verification→report;
valid sources and inconclusive interpretations look distinct; tools don't claim
unexecuted work; evidence remains discoverable at 1440/1024/mobile; selected source
survives refresh; candidate/verified/failed/queued use text plus consistent tokens;
print includes readable source identity/limitations without clipping.
Regression tests: desktop/tablet/mobile screenshots with human comparison,
keyboard source comparison/drawer close/focus restore, screen-reader status,
reduced motion, unknown stream event, partial agent failure and multi-page print.
Risks: animation implies fabricated progress, dense metadata becomes illegible,
all evidence hidden in tabs, print styles hide citation content.

## R10 — Evaluation and reliability

Objective: provide reproducible release evidence and clear limits, continuously
through the program. Covers E-07–10/B-04/B-11 and all compatibility gates.

Tasks:

1. Add CI using pinned locked toolchains; run Ruff/format/mypy/pytest, migration
   round trips/check, canonical validation, web type/lint/tests/build and browser
   integration on isolated data. Run symlink protection on Linux/privileged Windows.
2. Preserve frozen outputs, fixture/build/provider/prompt/config versions and
   actual command results. Benchmark claim-local source/anchor/semantic coverage
   independently of global citation counts; separate partial discovery.
3. Expand negative/paraphrase/ambiguous-time/copy-forward held-out cases and
   adversarial prompt-injection/irrelevant-citation tests; qualified reviewers
   assess clinical support/hypothesis fairness/uncertainty without invented scores.
4. Test runtime key-file denial under approved account/container mounts; retain
   logical no-API/no-tool/no-bundle leakage checks. Validate Docker exclusion rather
   than assuming configuration proves access denial.
5. Run configured `evaluate_system.py --live` only with privately supplied provider,
   model and credentials; freeze output and record failure/token/latency where
   measurable. No rules-mode result can stand in for live validation.
6. Exercise busy contention, interrupted worker, missing asset/provider, concurrent
   idempotent create, terminal SSE tail, reconnect, reset/backup and offline
   maintenance races in unique temporary databases. Do not reset the development DB.
7. Re-run real browser journey and full keyboard/print review when permitted;
   capture a labeled real fallback walkthrough before demo acceptance.

Dependencies: baseline available immediately; stronger release gates require
R06/R08/R09 and operator/expert inputs. Likely files: test suites/fixtures,
evaluation scripts, CI configuration, Docker/maintenance tooling and reports.

Acceptance: commands/results/skips/failures distinguish current from historical
evidence; no secret/canonical runtime data in Git; no claimed live/clinical/OS
isolation success without a corresponding run. Strict discovery remains visibly
partial until satisfied. Regression suites include real API worker/SSE plus
browser source navigation, not only model stubs. Risks: evaluating with truth
inside runtime, score inflation from repeated/global anchors, flaky shared data,
destructive reset shortcuts and unsupported clinical-readiness claims.

## Carry-forward unresolved gates

R01 completed the audit documents and available baseline checks. Browser E2E was
not executed after isolated frontend startup was rejected by automatic approval
review (“blocked by policy”). A browser run is still required before any renewed
browser acceptance claim. Live-provider, expert clinical/semantic review,
held-out generalization and enforced filesystem isolation also remain open.
These limitations do not block behavior-preserving R02 extraction.
