# Phase 3 implementation decisions

The frontend/backend contract owns public investigation enums: queued, running,
completed, completed_with_limitations, failed, cancelled. The proposed state
machine's `partial` maps to `completed_with_limitations`; candidate/under_review
map to proposed, refuted to rejected, inconclusive to unresolved. Verification
uses verified/rejected/inconclusive. No competing public enums are introduced.

The database catalog owns table names (agent_executions, tool_calls, evidence_refs,
reports). Public IDs preserve source IDs; run IDs are UUID-based INV identifiers.
Each state/event mutation is serialized, version guarded and committed together.
The process-local worker claims queued runs once. Startup marks interrupted queued
or running work failed, retaining audits; retry is a new POST, never reopening a
terminal run. One API process is required. No cancellation endpoint is added.

Missing evidence contracts are extended in evidence-contract.md. Numerical
confidence examples are illustrative only; use strong/moderate/limited/insufficient.
Clinical interpretations remain unresolved unless a deterministic rule verifies
the precise proposition. Source existence alone cannot verify an interpretation.

Timeline, hypotheses and trace are additive fields in investigation state/report.
No new clinical endpoints are needed. Events use the frontend envelope plus an
integer sequence; SSE IDs are that sequence, replayed with Last-Event-ID or after.
Report requests before report availability return 409. Creation returns 202.
POST accepts optional Idempotency-Key (max 100 characters); reusing it with a
different patient/objective returns 409. No arbitrary resume or retry route.

Runtime tools use hospital service DTOs in short sessions, with explicit per-agent
allowlists, patient scope, bounded pagination and audited failures. Document text
is untrusted. Source anchors use DTO field names, source version and canonical
DTO SHA-256 (sorted compact JSON, UTF-8). Asset integrity uses the existing service.

CASE-001 was added during this implementation in commits 0d8d7f4/494ce16/4aa95d3.
It validates and imports with 26 assets. Runtime replay now uses that canonical
dataset; independent synthetic controls validate negative behavior. Evaluation
reads the isolated answer key only after a report has been finalized.
No provider/model is selected in existing settings. Default execution is explicit
deterministic rules mode, with no claim of LLM reasoning. An optional configured
provider can propose typed hypotheses/candidates; failures produce limitations.
