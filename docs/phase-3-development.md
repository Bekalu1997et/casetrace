# Phase 3 development

Read [contract decisions](phase-3-decisions.md) and [SQLite operations](development-stack.md).
Use one API process; maintenance and standalone worker commands must not run against
the same writable database while the API is serving. No queue service is needed.

From apps/api, with locked native-platform uv dependencies:

```sh
uv run --locked alembic upgrade head
uv run --locked python -m app.hospital.cli validate CASE-001
uv run --locked python -m app.hospital.cli import CASE-001
uv run --locked python ../../scripts/run_investigation.py SYN-001 --output ../../data/runtime/phase3-report.json
# Separate offline evaluator, after runtime report finalization:
uv run --locked python ../../scripts/evaluate_investigation.py ../../data/runtime/phase3-report.json ../../evaluation/CASE-001/answer-key.json
uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000
```

POST `/api/investigations` with `{"patient_id":"SYN-001"}` returns 202 and a run ID.
GET that ID for authoritative state, `/events?after=0&limit=1000` for activity,
`/findings` or `/findings/{id}` for verified/rejected/unresolved claims, `/report`
for final output and `/stream?after=0` for SSE. Stream IDs are integer sequences;
reconnect with Last-Event-ID. Report before finalization returns 409. Source
anchors resolve through the existing versioned hospital endpoints. Full Phase 4
workspace and stream presentation are out of scope; use the typed client or API.

`LLM_PROVIDER=rules` is the default and performs no inference. To enable Gemini,
set LLM_PROVIDER=gemini, LLM_MODEL and LLM_API_KEY locally. No model name is chosen
for you. The adapter follows Google's [generateContent API](https://ai.google.dev/api/generate-content)
and validates AgentResult JSON. There is one model proposal request per run plus
at most LLM_MAX_RETRIES transient retries. No retries for malformed output or
nontransient errors; no fabricated model fallback. Model failure is audited and
produces completed_with_limitations if the deterministic workflow remains usable.
Only proposals/anchors enter persistence, never raw model deliberation. Provider
calls receive candidate evidence, not raw case files or evaluator keys.

Each specialist runs once; the tool budgets, context size, request timeout and
overall deadline are configured in .env.example. Timeline and evidence verification
are deterministic. Laboratory/medication reads run concurrently with independent
sessions; writes are serialized in the persistence service. All state mutations
allocate event sequence and CAS version in the same transaction. No transaction
is held across model calls, asset reads or SSE delivery.

Restart recovery fails interrupted work and closes in-flight audits. Retry with a
new POST/key; do not reopen terminal runs. Idempotency-Key repeats return the same
run and reject conflicting request bodies. Process-local tasks are not durable jobs.
No retry/cancel API or distributed worker support is claimed.

Analysis scope: explicit first-onset/no-prior-symptom assertions compared with
earlier contemporaneous clinical-event records; same-analyte/unit lab changes;
medication statuses/periods with source notes; unresolved referral completion
status; competing documentation explanations. Narrative parsing is intentionally
narrow. Missing follow-up documentation is not proof of missed care. Broad
diagnosis hypothesis generation, semantic paraphrase verification, OCR, clinical
calibration and expert medical interpretation remain review tasks. No unsupported
clinical causality or adherence conclusion is verified.

Tests use temporary migrated databases and imported fixtures. CASE-001 keys enter
evaluation only after execution. Run `uv run --locked --group case-data pytest -q`,
`uv run --locked ruff check .`, `uv run --locked ruff format --check .` and
`uv run --locked mypy`. The Windows symlink test explicitly skips only when the OS
denies the required privilege; it must run on Linux/privileged Windows CI.

For web client checks use pnpm install --frozen-lockfile, pnpm typecheck, pnpm lint
and pnpm test from apps/web. Windows PowerShell may require pnpm.cmd because the
PowerShell shim is blocked by local script policy.
