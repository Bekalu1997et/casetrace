# Phase 2 source provenance boundary

## Refactor 06 additive reasoning contract

`INVESTIGATION_REASONING=structured` opts into bounded source-claim extraction
and comparison; `legacy` remains the default. Both workflow strategies retain
the existing tool and verifier boundaries. Narrative anchors now retain complete
source statements. Optional `char_start` / `char_end` offsets are paired,
zero-based, end-exclusive Unicode character offsets into the unmodified field;
when supplied, its slice must equal `quote`. Old field-only anchors remain valid.
No PDF page or coordinates are inferred.

Internal clinical claims preserve source identity/version/hash, subject,
attribution, polarity, certainty, episode and date precision. Comparison verifies
documented propositions, never true clinical onset or causality. Unknown episodes,
approximate times and missing follow-up evidence stay explicitly uncertain.
Unsupported rule families remain inconclusive. This adds no persistence tables.

## Phase 3 claim anchors and verification

An anchor identifies source_type, source_id, source_version, source_hash,
encounter_id, field, expected value and optional exact quote. Types follow the
hospital resource vocabulary. Source hashes cover canonical hospital DTO JSON
(sorted keys, compact separators, UTF-8); the hospital service supplies versions.
Quotes require exact substring matching in the specified string field. Values
and timestamps must equal the original DTO field, with instant comparisons in
UTC. Missing/changed/foreign-patient sources fail closed. Registered document
assets are integrity checked before accepting document evidence.

A finding carries claim_kind, rule, anchors, alternatives and limitations.
Implemented deterministic rules verify exact field observations, comparable lab
changes and explicit symptom-onset conflicts against earlier contemporaneous
clinical events. The onset parser is deliberately narrow and checks event and
documentation chronology; it does not establish a clinical cause or true onset.
`review_before_result` remains an accepted proposal rule but has no implemented
verification branch and therefore remains inconclusive. Its intended future
implementation must require exact source-ID mention and review language, compare
result availability and note authoring time, and test delayed-entry controls.
See [Refactor 01 compatibility decision C-08](refactoring/04-contract-compatibility.md).
Free-form interpretations/hypotheses remain unresolved even with valid citations.
Verification statuses are verified/rejected/inconclusive; finding statuses are
proposed/verified/rejected/unresolved. Every check is persisted with the finding.
No numerical confidence is generated: strong means all deterministic checks pass,
limited means valid anchors with unresolved interpretation, insufficient means
missing or invalid evidence. These are evidence labels, not medical probabilities.

The source-lineage section below originated in Phase 2. The implemented Phase 3
anchor and verification contract is summarized above and in
[Phase 3 decisions](phase-3-decisions.md); it is no longer an unimplemented gate.

Each imported source preserves its canonical ID, patient/encounter links, dataset
case/version, source system, source version, original clinical payload and named
timestamps. Internal UUIDs never replace source IDs in public DTOs. Document
versions retain text SHA-256 and optional registered asset FK. Assets retain
storage key, MIME, size, SHA-256 and an explicit synthetic label. A source-document
link must resolve within the same patient. No citation is invented for records
without a source document.

Canonical source files are maintenance inputs, never runtime endpoints. Only
allowlisted clinical fields enter the runtime database. Ground truth,
investigation targets, expected relationships, red-herring labels and scoring
metadata remain outside runtime DB/assets. Deployment must exclude raw cases and
evaluation directories, as in the existing Docker configuration. Local process
file permissions are an operator responsibility: API omission alone is not OS
isolation. Future agents may only use approved tools over hospital services.
