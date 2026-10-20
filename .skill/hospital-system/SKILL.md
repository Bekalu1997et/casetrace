---
name: hospital-system
description: 'Build and maintain the simulated hospital information system (HIS) that CASETRACE agents query. This is a realistic, reproducible adapter over synthetic patient records, not a real EHR connection. Use for: Use for hospital API endpoints, data loading, patient lookup, encounter and artifact retrieval, cross-record queries, tool interfaces, auditing, or tests involving hospital records. Read the specialized file for each operation.'
---

# CASETRACE Hospital System — Skill

## Purpose
Build and maintain the **simulated hospital information system (HIS)** that CASETRACE agents query. This is a realistic, reproducible adapter over **synthetic** patient records, not a real EHR connection.

## When to use
Use for hospital API endpoints, data loading, patient lookup, encounter and artifact retrieval, cross-record queries, tool interfaces, auditing, or tests involving hospital records. Read the specialized file for each operation.

## Required project context
Read `AGENT.md`, `case-schema.md`, `hospital-api.md`, `agent-tools.md`, `backend-architecture.md`, `frontend-backend-contract.md` when present. **Existing contracts take precedence** over examples here. Do not silently invent endpoint names, IDs, fields, or database tables if a contract defines them.

## System boundary
`CASETRACE agent -> approved tool -> hospital service -> synthetic database / artifact store -> provenance-aware response`

The agent never reads source JSON files, database internals, or ground-truth answer keys directly. Those are private to setup/validation. All investigation evidence must be acquired through documented, audited hospital tools.

## Non-negotiable rules
1. Synthetic data only; identifiers and facility names must not represent real patients or imply actual care.
2. A single stable `patient_id`, `encounter_id`, `record_id`, `artifact_id`, and `case_id` scheme throughout a case. Avoid using display labels as primary keys.
3. Preserve original record text, event time, recording time, author, status, and source. Never overwrite evidence to repair a contradiction.
4. All patient-scoped reads enforce access checks and patient/tenant scope **in the service layer**, not only in UI.
5. Agent-facing tools are read-only for the hackathon unless a separate approved write action exists in the API contract.
6. Search results and summaries are not primary evidence. Every cited finding resolves to a source record or artifact span.
7. `occurred_at`, `recorded_at`, `resulted_at`, and `amended_at` are distinct when appropriate; keep timezone offsets and precision.
8. Every tool call yields an auditable outcome with request ID, tool name, actor, purpose/investigation ID, scope, time, result count, and error code (without leaking private content into logs).
9. Never expose the hidden ground-truth answer key to investigating agents or frontend client.
10. Clinical conclusions are investigator hypotheses, not verified diagnoses; no treatment recommendations are issued by retrieval tools.

## Common response envelope (illustrative; defer to hospital-api.md)
```json
{
  "request_id": "req_123",
  "data": [],
  "page": {"limit": 25, "next_cursor": null},
  "provenance": {"source_system": "synthetic_his", "case_id": "CASE-001"}
}
```
Errors should use a stable machine code, descriptive safe message, and `request_id`, e.g. `PATIENT_NOT_FOUND`, `ACCESS_DENIED`, `INVALID_FILTER`, `ARTIFACT_UNAVAILABLE`. Do not return an empty success response on failures.

## Workflow
1. Inspect relevant schemas and the existing API/tool contracts.
2. Specify input validation, authorization, filters, sort order, pagination, output and provenance.
3. Implement typed repository/service logic and a thin API/tool adapter.
4. Capture auditable tool events; redact clinical content from operational logs.
5. Add contract, tenant-boundary, pagination, adversarial and deterministic fixture tests.
6. Show agent-tool calls in the investigation activity stream using request and record references.

## Skill routing
- Patient identity and selection: `patient-search.md`
- Visits and source encounter events: `encounter-retrieval.md`
- Lab panels and result amendments: `laboratory-retrieval.md`
- Orders, administration, medication history: `medication-retrieval.md`
- Notes, referrals, scanned documents: `document-retrieval.md`
- Imaging studies, reports and rendered assets: `imaging-retrieval.md`
- Time-window and cross-source joins: `cross-record-query.md`

## Definition of done
Every tool returns deterministic fixture-backed results, respects access boundaries, retains exact evidence identifiers, emits a usable audit record, meets existing contracts, and has passing positive/negative tests. The demo can reconstruct CASE-001 by querying the HIS, with no hardcoded revelation.
