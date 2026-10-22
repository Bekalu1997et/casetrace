# Clinical relationship reasoning — Phase 2.2

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
