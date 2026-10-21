# Phase 4 browser workspace

The hospital dashboard, patient chart, investigation workspace and report now use
the existing hospital/investigation APIs. No new backend route, schema migration,
UI framework or dependency was required.

## Local operation

Keep the existing local `.env`; do not replace configured secrets. The API loads
root settings; Next loads `apps/web/.env.local`. Set only the public API origin
in the web environment, normally `NEXT_PUBLIC_API_URL=http://localhost:8000`.

Before starting the API, from `apps/api`:

```sh
uv run --locked alembic upgrade head
uv run --locked python -m app.hospital.cli validate CASE-001
uv run --locked python -m app.hospital.cli import CASE-001
uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000
```

From `apps/web`, run `pnpm dev`. Windows PowerShell may require `pnpm.cmd`.
Use one API process. Maintenance commands must finish before serving.
For a repeatable rules-mode demonstration set `LLM_PROVIDER=rules` in the API
process environment before starting; reports explicitly say `deterministic_rules`.
Optional configured provider behavior remains governed by Phase 3.

Open `/`, search for the imported synthetic patient, open their chart, review
records, choose **Start investigation**, review context, then **Begin investigation**.
Creation executes the existing worker automatically; there is no separate execute
request. Buttons lock during submission; the session retains the idempotency key
after network failure. A confirmed workspace arrival clears that pending key so
a later intentional launch can create a new run.

## Routes and interaction

| Route | Behavior |
| --- | --- |
| `/` | API health and searchable imported patient directory |
| `/patients` | Paginated/searchable patient discovery |
| `/patients/[patientId]` | Existing clinical sections and original assets; investigation context/launch |
| `/investigations/[investigationId]` | REST state, findings, timeline, hypotheses, persisted activity and source comparison |
| `/investigations/[investigationId]/report` | Backend report, verification/limitations, original evidence, timeline and execution history; browser printing |

Findings can be filtered by category/status. Contradictions are placed first by
display order; no clinical interpretation is calculated in the frontend. Compare
opens primary supporting/conflicting sources side by side, grouping repeated
fields per source. All contextual citations remain individually accessible.
Original patient, encounter, note, observation, medication, event, diagnostic
report, imaging-study, imaging-asset, referral, diagnosis and symptom records resolve through
allowlisted hospital APIs. Document/image assets reuse the existing safe viewer.
Unsupported source kinds fail visibly rather than switching to another record.

Single-source selection uses `source` and `source_type` query parameters so refresh
and shared URLs restore the source. Clinical content, hashes and quotes do not
enter the URL. Cross-patient records are rejected before rendering. The inspector
shows the current hospital record, warns on changed anchor fields, and distinguishes it from the version/hash
verified during investigation; this is not an archived-version API. PDF page or
text-offset anchors are not invented.

## State and activity

`useInvestigation` fetches REST state/findings and drains paginated event history.
The reusable fetch-stream reader then consumes SSE frames, including unknown named
event types. IDs deduplicate activity; server sequences order it. Snapshot refreshes
are coalesced, never overlap, and never infer activity from REST status.

On disconnect, persisted content remains visible with an error/reconnect indicator.
After 2.5 seconds the client reconciles REST state, backfills committed history and
reopens SSE from the cursor. Terminal state restores the final history and closes
live transport; reload never restarts a worker. Unmount aborts requests/streams
and clears timers. Failure never enables a successful-looking report. There is no
retry/cancel execution endpoint; an intentional retry is a new investigation.

## Checks

From `apps/web`: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`,
then `pnpm exec playwright test` with API and web already running.
The existing Playwright suite is reused; no test library was added. If Chromium
is absent, install it or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed
compatible browser. Validation used installed Edge after the browser download
timed out. `tests/e2e/investigation.spec.ts` uses real CASE-001 APIs and execution,
not mocked successful findings. Screenshots and a printed PDF land in ignored
`apps/web/test-results/`.

The control-hospital E2E requires `HOSPITAL_CONTROL_SMOKE=1` and its isolated fixture;
it intentionally skips in the normal CASE-001 environment. Backend tests continue
to use isolated temporary databases. See [completion report](phase-4-report.md).
