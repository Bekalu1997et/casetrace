# Clinical relationship reasoning — Phase 2.2

## Phase 2.5 diagnostic hypothesis comparison

The existing contradiction specialist discovers original diagnostic documents as
well as structured reports. Its bounded document/encounter/referral retrieval is
shared with the result-follow-up workflow. No new planner, tool permission or
autonomous diagnostic agent is introduced. Working assessments are reconstructed
from explicit original narrative wording, with certainty unknown unless stated.
Unavailable structured diagnosis data is not silently supplied to agents.

An optional diagnostic_comparison on the relationship envelope records the working
hypothesis, exact source roles, supporting/weakening/contradictory evidence,
remaining alternatives, missing evidence and a provisional reconsideration
question. The independent verifier repeats the accessible search, validates
originals and reconstructs the full comparison, including counterinterpretations
and result/document encounter mismatches. Only the recorded evidence relationship
is verified; clinical interpretation remains provisional. The engine publishes
source-linked Hypothesis comparisons only after this independent reconstruction.
Legacy hypotheses and envelopes retain their original paths.

Explicit symptom correlation is required to ask whether an objective interpreted
finding weakens an exclusive working explanation. Incidental, inconclusive,
supportive or conflicting interpretations do not become a positive challenge.
No probabilities, definitive diagnosis, exclusion of coexisting explanations,
treatment instructions or clinician-impropriety allegations are generated.
Generic reassessment notes are context, not invented interpretation or chronology.

## Phase 2.4 result-to-follow-up extension

The existing contradiction specialist discovers actionable finalized diagnostic
reports and retrieves original documents, encounters and referrals using its
existing permissions. A bounded accessible-record manifest records the unfiltered
search, original source versions/hashes, truncation and appointment coverage
(referral appointment fields only; no standalone appointment resource exists).
The independent verifier repeats that search through the clinical reader and
resolves originals before regenerating the complete result relationship.
Incomplete or changed scopes cannot verify an absence-of-documentation claim.

An additive result workflow envelope preserves eleven lifecycle stages, unknown,
partial and conflicting documentation, named source timestamps and literal dates.
Administrative closure is separate from acknowledgment, patient communication and
completed clinical follow-up. Later review is retained as counterevidence to an
open-ended absence claim. No clinical deadline is invented. Generic result text
requires a unique actionable result; ambiguous multi-result attribution remains
unresolved. The parser is conservative explicit vocabulary, not general clinical
NLP. Findings establish documented relationships only, never absent care,
negligence, progression or a new diagnosis. No clinical schema or tool changes.

## Phase 2.3 medication extension

Medication reconciliation reuses this envelope and verifier. Explicit ingredient,
strength, formulation and route constrain identity; ambiguous products stay
unmatched. A bounded source parser distinguishes orders, copied lists, reported
use, hold/restart instructions, documented administration and exposure uncertainty.
Document event time, authoring time and intended effective dates remain distinct.
The medication specialist retrieves original documents through its existing tools.
Independent verification reconstructs medication assertions and the entire
consolidated proposition from originals, including decisive identity/time anchors.
Different recorded instructions are not automatically proof of overlapping
clinical conflict. Planned hold/restart transitions and retrospective entries
retain explicit temporal limitations. Actual ingestion and causality stay unknown.

The existing orchestrator can request laboratory proposal evidence from the
already executed laboratory specialist, preserving its source references in an
unresolved cross-specialist question. The medication agent gains no laboratory
read permission. Association questions cannot verify a medication-induced injury.
No case IDs, expected source IDs or evaluation material select medication work.

This is an additive extension of the existing investigation engine. Specialists
continue to receive scoped tool executors. Only the independent EvidenceVerifier
receives a SourceResolver. There is no new scheduler, database or agent runtime.

## Assertions and candidates

Reuse `ClinicalClaim` as the internal factual assertion: subject, assertion
predicate, concept/value/unit, polarity, certainty, attribution, encounter and
versioned exact anchor remain intact. Add explicit origin, source status and
named event/documentation time selectors. The existing time interval and
temporality describe applicability, including unknown or historical scope.
An order is an order, not administration; a patient's statement is not observed
ingestion. Opposing source claims remain separate assertions.

An optional typed `relationship` envelope on Candidate/Finding holds a bounded
list of constituent assertions, supporting/contradicting assertion IDs, named
temporal comparisons, unresolved questions and conclusion intent. Existing
candidate anchors retain exact supporting and contradicting roles, and existing
claim, alternatives and limitations carry the proposed conclusion and caveats.
Old candidates and reports remain readable without the envelope. A new
`clinical_relationship` rule selects independent relationship verification.

To avoid cyclic dependencies, source reference and anchor models live in a
neutral schema module and remain re-exported from `schemas/investigation.py`.
Existing import paths, field names, provenance fingerprints and timestamp
semantics remain compatible. No persistence schema migration is needed: findings
already store typed JSON bodies and evidence links.

## Supported boundary

This phase implements a narrow reproducible **recorded state difference** across
two encounters for the same explicitly identified medication or referral, plus
**documented assertion conflict** using the established chronology comparison.
State changes are source observations, not verified clinical contradictions.
Named order/event/documentation times remain distinct; order time does not date
actual use or the effective time of a retrospectively updated status.

Other types can represent medication reconciliation, result/follow-up,
hypothesis challenges and longitudinal follow-up questions. After validating
their constituent evidence they remain inconclusive until a specific
independently reproducible rule exists. This phase does not implement those
specialist workflows. Definitive ingestion, causal and diagnostic intents are
rejected. Unsupported interpretation is inconclusive rather than verified.

## Independent verification

1. Resolve every candidate anchor through the selected patient's hospital
   resolver; recheck ownership, identity, representation, version and DTO hash.
2. Re-extract each assertion from originals. Match all factual/context fields,
   source spans and deterministic assertion IDs; do not trust proposed values,
   origin, negation, certainty, concepts, times or status labels.
3. Reject duplicate assertions, reused sources masquerading as independent
   evidence, absent decisive anchors, incompatible concepts and forged roles.
4. Evaluate named temporal constraints with aware instants. Missing/date-only
   times remain unknown; false ordering fails. Do not order by documentation
   time when the rule calls for event/order time.
5. Regenerate the supported relationship from originals and require its complete
   assertion set, source roles and decisive time/identity anchors. Emit canonical
   source-derived wording and mandatory caveats, replacing candidate prose.
6. Persist the result through the existing proposed/verified/rejected/unresolved
   finding lifecycle. Verified relationships describe recorded propositions,
   never true exposure, diagnosis, causality or absent care.

Verification is independent of candidate prose, not a second LLM opinion. Shared
pure extraction/comparison rules operate over independently fetched originals;
their clinical scope is explicitly limited. Uncited records and unavailable
counterevidence are unknown, not disproved. No claim of exhaustive chart review
is made. Specified counterevidence is preserved and independently validated.

## Lifecycle and audit

Tool results retain their durable tool execution/source references. Assertion
IDs derive from exact source identity/hash/location. Relationship assembly runs
over the existing tool-returned original records in structured reasoning mode,
with at most eight candidates and eight assertions per candidate; the existing
candidate, tool and time budgets still apply. No extra clinical retrieval is
performed by the assembler.

Bounded `assertions.extracted`, `relationship.assembled`,
`relationship.proposed` and `relationship.verification_completed` events carry
counts, finding/assertion IDs, relationship type, source IDs/versions and status.
They exclude narrative excerpts, proposed prose and private deliberation. These
events use the existing durable writer and SSE sequence, with no transaction
held across source resolution. REST findings/reports remain the source of truth.

The relationship envelope is stored and returned with the finding, and source
roles remain in EvidenceRef/FindingEvidenceLink. Logical finding deduplication
includes typed relationship identity when present; legacy logical keys remain
unchanged. The report builder consumes the same findings, without a second
report or alternate endpoint. Frontend clients may ignore the additive envelope
and tolerate the new activity event types.

## Safety and verification scope

Only synthetic independent controls and existing CASE-001 regressions are used
for architecture validation. Frozen cases, assets, keys, evaluation adapters and
scoring thresholds remain unchanged. Runtime imports no evaluation files.
Clinical interpretation and broader extraction remain future reviewed work.

## Phase 2.6 longitudinal planning contract

Laboratory investigation consolidates compatible patient/analyte/unit/specimen
series, retaining collection instants, every intermediate measurement and each
source-specific reference interval. Unknown specimen/fasting context remains
unknown; narrative values never overwrite structured measurements. A typed
`longitudinal` envelope on Candidate/Finding carries measurements, searched
source identities, follow-up evidence, bounded question and stop reason.
The additive `longitudinal_followup` rule verifies record relationships only.

A deterministic laboratory queue ranks repeated abnormalities by relative range
excursion, encounter repetition, change and source diversity. It selects at most
six groups and forty measurements per group; every deferred group is named with
a reason in limitations. Original-document retrieval is capped at twenty, with
paged lab/encounter/referral/document discovery and existing per-role/global
call and time limits. Search truncation never establishes absence. Related
assessments/recommendations and later tests/referrals are reassessed once;
completion requires explicit linked, dated completion evidence. Tests alone do
not prove that every recommendation was fulfilled. Missing records do not prove
missed care or diagnosis. Important deferred or unresolved work produces
completed_with_limitations. No recursive laboratory loop or extra model call.

Verification independently repeats the bounded paginated accessible search,
resolves originals and reconstructs the complete measurement/follow-up envelope,
including counterevidence. Canonical wording replaces proposed prose. Final
candidate selection suppresses overlapping pairwise lab changes already covered
by a consolidated series, while preserving source evidence in the envelope.
