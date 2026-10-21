# Refactor 06 — Clinical reasoning and evidence intelligence

Date: 2026-10-21. Starting branch: `refator/casetrace-mvp`.
Starting SHA: `3554254a94ae036aeb84a36db1659628975a9549`.
The initial working tree was clean. The branch was retained; no commit, push,
reset, canonical case/asset/manifest/answer-key change or migration was performed.
All test and replay databases were isolated from `data/runtime/casetrace.db`.

This implements bounded deterministic reasoning for explicitly supported
language, with an opt-in structured path. It does not establish general medical
NLP, diagnostic accuracy, medical expert validation or live-model generalization.

## A. Previous reasoning architecture and diagnosis

The shared `clinical/rules.py` parser recognized one first-onset construction:
symptom + "began on" + English calendar date + matching "no ... before then".
It compared a later document with an earlier contemporaneous clinical event.
Different terminology, relative/approximate dates, recurrence, attribution and
diagnostic assertion context had no common typed representation. Hypothesis
support/opposition was assigned by anchor position. Lab analysis grouped by code
and unit, while verification checked names, creating a consistency gap. Follow-up
findings already correctly treated missing completion as unresolved.

The strict CASE-001 mismatch was traced through the whole production path:

1. Original earlier documents contain substantive symptom-history statements.
2. `contradictions()` searched for the first matching symptom token.
3. `anchor(earlier, "text_content", mention[0])` stored only that token as quote.
4. `anchor_matches()` accepted it because it existed in the original field.
5. Finding persistence retained that inadequate quote unchanged.
6. The isolated unchanged evaluator required contextual passage coverage and
   correctly returned strict 0/1, partial 1/1 despite valid source references.

The initial broader sentence policy also exposed a second issue: the first
sentence can be a chief-concern label rather than the substantive history.
Production selection now prefers a positive, asserted, current source statement
with an explicit presence/reporting predicate. It rejects negated, hypothetical,
family and historical-only context. No evaluator condition or answer text was
copied into runtime. The exact/partial scorer and CASE-001 key are unchanged.

Fresh pre-edit checks reproduced **216 passed, 1 skipped** in 180.08 seconds.
Fresh baseline and adaptive replays reproduced 13 verified findings, 108/108
valid anchors, strict 0/1 and partial 1/1. Baseline took 8.185 seconds with 52
calls; adaptive took 10.376 seconds with 57 calls, 10 tasks and 5 leads.

## B. New clinical claim model

`clinical/claims.py` contains internal `ClinicalClaim`, `ClaimTime` and
`ClaimComparison` models. Claims retain deterministic source-derived IDs,
patient identity where present, source/version/hash, encounter, exact field/span,
concept and original mention, qualifiers, assertion type, patient/family subject,
reporting attribution, polarity, certainty, temporal scope and precision, optional
episode identity, source section, recorded value/unit/status, named timestamps,
extraction method and limitations. Unknown attributes remain optional.

Structured observations, medication states and referral states use the same
claim representation without converting order/status into administration,
adherence or care delivery. No ontology, database table or dependency was added.
Claims/comparisons are transient analysis objects; persisted candidates/findings
retain each compared proposition in text, exact anchors, alternatives and limits.

## C. Temporal and semantic extraction

`concepts.py` uses explicit aliases for ten concepts. Cough/coughing share a
concept; chest pain, chest tightness and shortness of breath remain separate.
Original wording is retained. Broad fuzzy similarity is not used.

`extraction.py` implements onset (began, started, onset, first noticed/experienced),
presence, denial/absence, recurrence, historical references, resolution, worsening
and hypothetical/uncertain impressions. It distinguishes family history, patient
reports, clinician records and source headings. Semicolon/contrast scope prevents
one clause's denial from automatically negating the next symptom. Recurrence
modifiers must attach to the symptom rather than an unrelated condition.
Calendar "May" is not treated as modal uncertainty. Plans remain hypothetical.

`temporal.py` preserves explicit date-only onset, early/mid/late month intervals,
relative days/weeks and last-month resolution. Relative dates require an event
reference; authoring time is not silently substituted for missing encounter time.
Dates are not converted to midnight instants. Original reference offset/literal
remains available; chronology compares occurrence/documentation in the onset
reference offset. Approximate claims never enter the exact onset verification rule.
Relative bounds use a disclosed heuristic (+/-3 days for weeks, +/-1 for days),
not clinically established bounds. Month thirds and inferred encounter year are
also extraction conventions, not recorded precision. Invalid dates stay unknown.

## D. Contradiction comparison and verification

`comparison.py` explicitly compares claim A, claim B, concept, subject, certainty,
episode, temporal assumptions and documentation chronology. It distinguishes
documented conflict, potential conflict, different episodes, documentation delay,
compatible statements, ambiguity and insufficient evidence.

Exact first-onset assertions or explicit shared episode identity can conflict
with earlier contemporaneous positive presence. Unspecified episode identity
produces a potential relationship; recurrent/new episodes do not automatically
conflict. Same-day opposing symptom assertions remain unresolved because symptom
states can change within a day. A record discrepancy never establishes true onset.

`reasoning.py` builds bounded candidates with both exact passages and decisive
timestamps. The verifier independently resolves all anchors, checks their original
source identity/version/hash/encounter/field/value/span and reconstructs the
implemented relationship. Missing decisive structured-mode passages/time fields
cannot produce a verified contradiction. Verified claims are rendered from
deterministic source facts rather than accepted as arbitrary proposal prose.

`relationships.py` raises unresolved questions for explicitly ID-linked medication
status differences, completed versus not-completed follow-up assertions, and
pending-result statements after recorded result availability. Availability does
not prove review, and status snapshots may have different effective times. These
rules do not privilege one document as clinical truth. Impossible structured time
intervals remain ingestion-validation errors. The older accepted
`review_before_result` proposal rule remains unimplemented/inconclusive.

Lab proposal and verifier now share conservative analyte identity, reject missing
or incompatible units/codes, preserve collection times and require decisive
field anchors. Recorded reference ranges are cited and described when supplied;
no reference interval, disease, significance threshold or cause is invented.
Medication questions require a named medication in a symptom-bearing passage;
ordering/use/administration/adherence remain distinct. Referral questions retain
order/appointment timestamps and never convert absent completion into missed care.

## E. Evidence citation improvements

`spans.py` maps complete contextual statements to unmodified Unicode text.
Decimal measurements do not terminate a statement. `Anchor` adds optional paired
`char_start`/`char_end` offsets: zero-based, end-exclusive Unicode character
positions, not byte offsets or PDF coordinates. Source validation rejects wrong
identity, search-hit projections, mismatched slices, quotes, values, versions,
hashes, encounters and patient scope. Old field-only anchors remain readable.
No page number or text coordinate is inferred. Source files are never rewritten
to make quotations resolve.

The contextual source-span fix improves strict discovery in the default legacy
path as well as the opt-in structured path. Additional lab code/range anchors
account for most of the increased anchor count. Removing an irrelevant
side-effect/counselling-only contextual mention removes one baseline retrieval;
structured chronology adds named document time anchors and two targeted reads.

## F. Hypothesis evaluation

`clinical/hypotheses.py` replaces positional evidence slicing. A separate-episode
explanation receives supporting evidence only from relevant new/recurrent episode
assertions. An explicit first-onset assertion is counterevidence. Unrelated field
anchors do not count as support. Only the actual cited passage is analyzed;
original encounter/span metadata is preserved for later independent validation.
Missing episode linkage/resolution/clarification remains explicit. Retrospective
reporting error stays an untested alternative without a correcting source.
Verdicts remain inconclusive; no numerical diagnostic probabilities are emitted.

Regression testing caught and fixed loss of encounter metadata while parsing a
hypothesis citation. The verifier had correctly rejected that intermediate
citation. No invalid anchor was promoted to verified.

## G. Integration and controlled selection

`INVESTIGATION_REASONING=legacy` remains default. `structured` enables the new
claim pipeline independently of `INVESTIGATION_STRATEGY=baseline|adaptive_rules`.
TimelineAgent, adaptive specialist construction and final reassessment receive
that selection. Existing source-linked chronology leads still cause real
correction searches and version/hash-checked retrieval. Existing lab/medication
follow-up approval, permissions, budgets, audit events and persistence stay intact.
Additional linked-status/medication questions use already retrieved sources;
they do not add scheduler action families or claim that new retrieval happened.

Limits: 100 sources, 100,000 characters per narrative, 64 claims/source, 4,096
main comparison pairs, 20 chronology candidates, 8 linked-status questions and
4 medication questions, plus existing global tool/task/time/candidate budgets.
Source/text/claim/pair budget limitations are surfaced. Context selection is also
bounded by source and candidate limits. No transaction spans retrieval or inference.

`llm/claims.py` defines typed `ClaimProposals`, an optional
`ClaimExtractionProvider` capability and independently validated proposals.
Unsupported source spans, patient associations, dates and semantic attributes are
rejected. Only reproducible rule assertions are accepted by the current validator.
Tests use a fake provider. The shipped Gemini adapter still proposes candidates/
hypotheses through its existing interface; it does not implement claim extraction.
No live-model execution or credentials test was performed in this refactor.

## H. Independent scenarios and metamorphic coverage

Narratives and oracle definitions are separate:
`tests/fixtures/reasoning-narratives.json` versus
`evaluation/reasoning/oracle.json`. Neither oracle nor expected labels enter tools.

| Scenario | Tested behavior |
| --- | --- |
| A | Explicit headache onset conflict |
| B | Paraphrased coughing onset versus cough presence |
| C | Late-month onset retains uncertain precision |
| D | A new episode and historical similar episode do not automatically conflict |
| E | Encounter denial remains negative |
| F | Intermittent historical mention remains historical |
| G | Rule-out pneumonia, possible medication relationship and family asthma context |
| H | Medication/symptom association does not establish causality |
| I | Missing follow-up completion does not establish missed care |
| J | Rash source discrepancy does not establish which record is clinically correct |
| K | Fabricated passage/span is rejected |
| L | Negative control has no fabricated verified contradiction |

Additional tests cover May/modal ambiguity, decimals, prior-absence scope, midnight
timezone boundaries, delayed entry, different episode IDs, planned symptoms,
structured medication/lab states, invalid source values/hashes/offsets, missing
decisive time anchors, incompatible labs, semantic hypothesis relevance, model
proposal validation and budgets. Metamorphic tests change capitalization, source
order/IDs, supported onset paraphrases, sentence layout and unrelated notes;
meaning-changing tests introduce approximate wording, denial and historical episodes.

Five additional independently ingested scenarios exercise the actual tools,
supervisor, verifier and persistence: a paraphrased headache onset, approximate
chronology, another episode, a negated symptom and a control. Only the positive
scenario creates a verified conflict and an actual follow-up task. These use
copied control resources, not canonical CASE-001 wording or edited clinical data.

Offline fixture results: 23/23 predicted claim tuples matched the 23 authored
expected tuples (precision and recall denominators reported separately).
Concept/assertion/polarity/certainty/subject checks each matched 23/23. Exact spans
resolved 23/23; temporal precision probes passed 5/5; positive controls detected
4/4; false verified conflicts 0/8 negative fixtures. Model calls: 0.
Timing is recorded in ignored `refactor06-independent-final.json`. These are
development examples, not held-out diagnostic or expert clinical accuracy.

## I. CASE-001 evaluation

Reports are frozen before loading the unchanged isolated scorer. Independent
runtime source/proposition/timeline checks are separate from exact discovery.
Ignored artifacts live under `data/runtime/refactor06-before-*`,
`refactor06-complete-*`, `refactor06-release-*`, plus
`refactor06-verified-*`, `refactor06-comparison-final.json` and OpenAPI snapshots.
The three verified replay subprocesses each explicitly returned exit code 0.
Each replay directory retains
report, events, normalized findings, anchors and task trace. Normalization removes
only generated run/finding IDs and publication/verification times, not clinical
timestamps, source values or quotes. Intermediate failed experiments are retained.

| Metric | Before baseline | Before adaptive | Legacy baseline | Structured baseline | Structured adaptive |
| --- | ---: | ---: | ---: | ---: | ---: |
| Verified / rejected / unresolved findings | 13 / 0 / 0 | 13 / 0 / 0 | 13 / 0 / 0 | 13 / 0 / 4 | 13 / 0 / 4 |
| Valid anchors | 108/108 | 108/108 | 137/137 | 139/139 | 139/139 |
| Strict discovery | 0/1 | 0/1 | 1/1 | 1/1 | 1/1 |
| Partial-only discovery | 1/1 | 1/1 | 0/1 | 0/1 | 0/1 |
| Tool calls | 52 | 57 | 51 | 53 | 57 |
| Typed tasks / consolidated leads | 0 / 0 | 10 / 5 | 0 / 0 | 0 / 0 | 10 / 5 |
| Verified proposition checks | 13/13 | 13/13 | 13/13 | 13/13 | 13/13 |
| Verification failures in verified findings | 0 | 0 | 0 | 0 | 0 |
| Timeline source accuracy | 81/81 | 82/82 | 81/81 | 81/81 | 82/82 |
| Final measured duration, seconds | 8.185 | 10.376 | 7.430 | 8.184 | 10.153 |

Baseline finishes `completed`; adaptive finishes `completed_with_limitations`
because no clarifying correction document is available. Four additional structured
questions remain unresolved rather than becoming unsupported verified findings.
Legacy adaptive also passes strict 1/1 with 137 valid anchors, 57 calls, 10 tasks
and 5 leads. Partial-only is zero after an exact match by the unchanged scorer's
definition; it does not mean partial coverage was lost.

Release baseline/structured-baseline replays measured 10.008/11.547 seconds;
an additional structured-adaptive sample measured 9.507 seconds. Final verified
subprocess samples are in the table above.
Earlier complete baseline/structured/adaptive samples measured 5.484/6.486/14.638
seconds; legacy adaptive measured 12.906 seconds. Tests and replays ran concurrently.
These noisy local samples are not latency thresholds or speedup claims.

## J. Full validation

Executed from `apps/api` unless stated otherwise:

| Command / check | Result |
| --- | --- |
| Pre-edit `uv run pytest -q` | 216 passed, 1 skipped |
| Focused original architecture/investigation regression | 18 passed |
| First broad implementation run | 258 passed, 2 failed, 1 skipped; fixed stale anchor-count assertion and hypothesis encounter loss |
| Both canonical reasoning modes plus focused reasoning tests | Passed |
| Full run before the last six added scenarios | 265 passed, 1 skipped, 266.96 seconds |
| Independent ingested scenarios | 5 passed |
| Latest pure reasoning suite | 48 passed |
| Final full backend run | 271 passed, 1 skipped, 231.37 seconds |
| `uv run ruff check .` / `ruff format --check .` / `mypy` | Pass; 106 Python files formatted, 91 application files typed |
| Ruff check/format of changed evaluation scripts with API config | Pass |
| `python -m app.hospital.cli validate CASE-001 --format text` | Valid, 26 registered assets |
| `python ../../scripts/validate_case001.py --report ...` | Valid, 23 original PDF pages rendered |
| Alembic upgrade/current/downgrade/upgrade/check | Covered by executed foundation tests on isolated databases |
| Tool permissions/contracts, ground-truth isolation, lifecycle, SSE and verifier tests | Covered by full backend suite |
| `pnpm.cmd typecheck`, `lint`, `test` (apps/web) | Pass; 33 frontend tests |
| `NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm.cmd build` | Pass |
| Existing `pnpm.cmd exec playwright test --workers=1` | 3 passed initially (33.4 seconds), 3 passed on final rerun (25.8 seconds), installed Edge |
| OpenAPI comparison | Same paths, requests, required fields and existing field schemas; four optional properties added |
| `git diff --check` | Pass |

Browser execution used an isolated migrated database and copied assets under
`data/runtime/refactor06-browser`, with structured adaptive reasoning enabled.
It exercised real connectivity/retry, control chart/assets and CASE-001 start,
activity, evidence comparison, refresh, report navigation, mobile layout and print.
No approval restriction blocked the browser command. Task-owned servers are stopped
after validation. The existing Windows symlink-privilege skip and Starlette/httpx
deprecation warning remain. No dependency or lockfile changes were needed.

OpenAPI adds only nullable `Anchor.char_start`/`char_end` and default-empty
`Hypothesis.alternatives`/`limitations`. Required lists, existing property schemas,
request/response endpoints and enum values are unchanged. No frontend field was
removed. Old anchors without offsets still validate; offsets are checked when present.

## K. Remaining limitations

- Ten explicit concepts and supported English patterns are not comprehensive NLP.
  Long/unsupported narrative constructions, abbreviations, multi-sentence coreference,
  copied assertions, complex coordinated negation and implicit episode linkage need
  further evaluation. No inferred clinical truth follows from a document conflict.
- Approximate dates remain excluded from exact verification. Relative interval
  bounds and month thirds are disclosed conventions. Missing years and relative
  clinical language can remain ambiguous; a complete temporal parser is not claimed.
- Medication/follow-up/result questions remain unresolved where effective time,
  exposure, adherence, completion or review is not established. No new scheduler
  action families or broad status-conflict verification rules were invented.
- Typed model extraction is an interface plus deterministic validation tests,
  not a wired/live Gemini extraction capability. Broader model coverage, token
  measurements, held-out performance and medical expert review remain unverified.
- Runtime tool/patient isolation is tested, but local same-user filesystem access
  is not an OS sandbox. Evaluator omission from API/tools is not OS access denial.
- Claims/comparisons are transient; findings preserve exact passages and hypotheses,
  but a separate persisted claim ledger/tool-lineage migration is not introduced.
  No PDF page/region or OCR location is invented.

## L. Refactor 07 readiness and file inventory

Frontend modernization can rely on unchanged routes, REST/SSE reconciliation,
source IDs and existing required fields. It should preserve optional-field
compatibility, exact original-source navigation, distinct verified/unresolved
states and date-only/offset semantics. Typed hospital DTOs, smaller components,
navigation-race/reconnect coverage and optional span highlighting remain R07 work.
No frontend redesign is a prerequisite of this reasoning refactor.

New application modules: `clinical/{claims,concepts,temporal,spans,extraction,
comparison,reasoning,laboratory,hypotheses,relationships}.py`, `llm/claims.py`.
New evaluation/tests: `tests/test_reasoning.py`, independent narrative JSON,
`evaluation/reasoning/oracle.json`, `scripts/evaluate_reasoning.py`.
Modified application modules: `agents/{analysis,specialists,runtime}.py`,
`core/config.py`, `evidence/{provenance,verification}.py`,
`orchestration/{engine,supervisor,reporting}.py`, `schemas/investigation.py`.
Modified integration tests: `test_adaptive.py`, `test_investigation.py`.
Other changes: `.env.example`, `scripts/evaluate_system.py`, evidence skill,
backend/multi-agent/evidence/frontend-contract/evaluation/local-development docs,
and this report. Historical refactoring reports remain unchanged.
