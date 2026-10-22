# Multi-domain discovery evaluation specification

Version 1.0. Offline evaluation only, on finalized synthetic investigation
reports. No changes to runtime, clinical data, original keys or legacy scoring.
This is a development regression evaluation, not clinical validation.

The original keys and `scripts/evaluate_investigation.py` remain authoritative
for the legacy baseline. The new evaluator deliberately answers a stricter
question. It assesses each expected discovery independently, including the
secondary renal trend in CASE-002. It does not require a timeline finding for
other domains. No citation union can count as discovery success.

## Evidence levels

| Level | Meaning and assessment |
| --- | --- |
| Source existence | Canonical source ID exists; does not establish retrieval |
| Source retrieval | Successful frozen tool trace lists ID; search hits may be included, so original text retrieval is not inferred |
| Verified citation | Offline reconstruction of public DTO matches patient, source type, initial version, DTO hash, encounter, exact field/value, quote and optional offsets |
| Factual observation | Finding declares an observation; source-anchor validity is checked separately, entailment remains reviewable |
| Consolidated relationship | Required roles are cited inside one finding or a reviewer explicitly links identified findings with a stated relationship; structural connection alone does not establish semantics |
| Supported interpretation | Qualified reviewer passes all seven semantic dimensions with written reasons |
| Primary discovery success | Every primary expected discovery is exact; secondary discovery is reported independently |

All required source IDs from a key remain required. No subset is silently deemed
decisive. A single finding containing all IDs is only structurally eligible.
Repeated/copy-forward evidence is not independent corroboration. Hypotheses,
timelines, retrieval summaries and report prose cannot silently supply missing
finding links. Rejected findings cannot establish discovery. Unresolved findings
may qualify only where the key accepts unresolved outcomes and the reviewer
confirms correctly limited conclusions.

## Domain semantics

| Domain | Relationship to establish | Mandatory cautions / false positives |
| --- | --- | --- |
| Timeline contradiction | Explicitly compare incompatible histories or event claims with original event and documentation chronology | Examine documentation delay, precision, transcription and episode continuity; earlier symptoms do not establish a medication's causal effect |
| Medication reconciliation discrepancy | Connect order/discontinuation/hold/restart instructions to later lists or patient reports, identifying the discrepant state | Separate prescribed, dispensed, administered and reported use; stale lists and uncertain last doses do not prove ingestion or harm |
| Result-to-follow-up discrepancy | Connect finalized abnormal result and recommendation to routing, acknowledgment, communication and completed follow-up | Administrative closure is not completed care; absent documentation does not prove absent communication or negligence |
| Diagnostic hypothesis challenge | Compare working explanation against objective supporting and weakening evidence across records | A challenge does not prove an alternative diagnosis or exclude the original explanation; nonspecific tests require uncertainty |
| Longitudinal laboratory concern | Connect relevant baseline, intermediate changes and recovery/persistence with units, sampling times and context | Verify values and comparable analytes; fasting/random status, reference ranges, illness and competing exposures matter; abnormality alone is not a diagnosis |

## Deterministic and reviewer decisions

Deterministic checks validate finalized report schema, key/spec/case identities,
source ownership, exact anchors, hashes, required-source coverage and group
membership, including the key's specified quote/value anchors inside that group.
They do not turn runtime `verified` labels into clinical truth.
Initial source version 1 is the adapter's explicit supported scope. Patient and
imaging-asset metadata anchors are not reconstructed by this adapter and fail
closed. Canonical document projection matches the existing public DTO. Registered
asset bytes and all source files are separately checked by the frozen inventory;
the scorer does not interpret images or re-render PDFs.

Seven semantic judgments require qualified review: relationship entailment,
claim correctness, contradictory evidence treatment, unsupported causality,
uncertainty correctness, missing evidence and false-positive conditions. Each
decision is `pass`, `fail` or `review` with a nonempty rationale. No keywords,
terminology overlap, declared finding type, or self-reported confidence establish
these judgments. A causal or definitive diagnostic conclusion stays unassessed
until review, and is unsupported when the reviewer rejects it.

## Outcomes (per expected discovery)

- `exact`: full valid evidence within one finding or explicit linked group,
  required roles established, acceptable finding outcomes, all semantic checks
  passed and no unresolved specification role gaps.
- `partial`: valid relevant evidence exists but required sources/roles or the
  complete consolidated relationship are missing. This is not semantic success.
- `missed`: no eligible finding cites a required source.
- `unsupported`: relevant evidence has no valid citations, the selected group
  contains invalid/foreign provenance, or a reviewer rejects a semantic criterion.
- `not_assessable`: a structurally complete valid group exists but clinical
  meaning or specification detail still needs review.

Semantic failures take precedence over coverage. Missing sources cannot become
exact even with an all-pass review. A disconnected citation union remains partial
even at 100% coverage. Missing tool traces are unknown (`null`), not failed
retrieval. Findings not mapped to expected discoveries are outside discovery
recall; this scorer does not claim whole-report false-positive precision.

## Versioned specifications and review protocol

`evaluation/clinical-discovery/v1/CASE-*.json` adapts unchanged key claims into
domains, primary/secondary priorities and source roles, bound to key SHA-256.
The exact claims, counterevidence and non-finding rubrics come from those keys.
CASE-004–006 use generic `Objective testing` anchors. Their provisional
`pending_role_review` roles explicitly prevent exact scoring. A qualified reviewer
must publish a revised versioned specification with decisive passages, proper
roles and contextual checks; no new patient facts may be introduced. All six
cases require semantic review. These drafts are not clinician-approved keys.

An optional review JSON follows `Review`/`Judgment` in
`scripts/clinical_discovery.py`: version, report/spec/case SHA-256, reviewer,
qualification, reviewed_at and judgments. Each judgment identifies finding_key,
finding_ids, linked_relationship, source_roles, decisions and rationale. A group
of multiple findings additionally requires `link_claim_finding_id` identifying an
original report finding whose exact claim equals `linked_relationship` and
explicitly references every other finding ID in the group. A reviewer cannot
invent a relationship or retrospectively connect unrelated observations. Review
is external to the report: report-supplied adjudication is never read. Hashes
prevent reusing an approval after claims or sources change. Reviewer identity is
recorded, not cryptographically authenticated; operator access controls must
protect sidecars. Authored control oracles test protocol behavior, not human
clinical proficiency. Do not create baseline approvals from automated guesses.
Machine-readable schemas are published beside the specifications as
`review.schema.json` and `specification.schema.json`.

Run the single-report CLI with report, original key, versioned spec and canonical
case paths, optionally `--review` and `--tools`. Run the frozen cohort with:

```text
uv run --project apps/api --locked python scripts/baseline_clinical_discovery.py --output docs/evaluation/artifacts/phase2-01/after --phase after
```

Outputs include both scorers, per-discovery criteria, candidate group IDs,
missing citations, review requirements and input hashes. Output directories must
be new. Both original before/after cohorts are scored without executing agents.
