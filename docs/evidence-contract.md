# Phase 2 source provenance boundary

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
Deterministic rules verify exact field observations, comparable lab changes,
and explicit reviewed-result references preceding collection/result availability.
The latter require exact source-ID mention and review language in the cited note;
the note's authoring time is checked to avoid treating late entry as contradiction.
Free-form interpretations/hypotheses remain unresolved even with valid citations.
Verification statuses are verified/rejected/inconclusive; finding statuses are
proposed/verified/rejected/unresolved. Every check is persisted with the finding.
No numerical confidence is generated: strong means all deterministic checks pass,
limited means valid anchors with unresolved interpretation, insufficient means
missing or invalid evidence. These are evidence labels, not medical probabilities.

This document establishes source lineage only. Finding anchors, scoring,
verification and investigation evidence DTOs remain Phase 3 decisions.

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
