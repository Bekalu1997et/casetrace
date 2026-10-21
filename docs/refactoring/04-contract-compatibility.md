# Refactor 01 — Authority, reconciliation and compatibility

Baseline: `d7bbb1a8bfbd1182624f28970cd24c628401d715`. R01 records existing
decisions and proposed future corrections. It grants no blanket approval for
breaking changes. See [audit](01-current-state-audit.md),
[gaps](02-specification-gap-matrix.md) and [backlog](05-refactoring-backlog.md).

R02 verification (2026-10-21): generated OpenAPI is exactly equal before/after;
logical CASE-001 reports, anchors and evaluation results are equivalent. Clinical
data, answer keys, ORM mappings and applied migrations are unchanged. Internal
construction now uses `composition.build_engine` and
`ClinicalTools(ClinicalSource)`; these are internal Python construction changes,
not new HTTP contracts. See [executed report](06-backend-refactor-report.md).

## Specification authority

Apply the current user request and clinical/evidence invariants first, then approved
interface/data/state contracts, explicit later superseding decisions, original
architecture/UI specifications, implementation behavior, and finally illustrative
examples. Current implementation is evidence, not authority to retire a product
requirement. An implementation report can explain a deliberate MVP reduction
without declaring the broader feature obsolete.

| Decision | Original requirement/example | Explicit later decision and current behavior | Conflict / resolution | Compatibility implication |
| --- | --- | --- | --- | --- |
| C-01 Hospital namespace | PRD/backend/frontend/AGENTS show `/api/patients`, `/api/documents` | `CONTRACT_DECISIONS.md` selects hospital-api `/api/hospital/v1`; routers/client use it | Older unversioned hospital examples superseded; no aliases needed | Keep versioned routes and hospital envelopes |
| C-02 Investigation namespace | API examples use `/api/investigations`; lifecycle docs show alternatives | phase-3-decisions and frontend contract retain unversioned investigation namespace | Separate namespaces intentional | No forced `/hospital/v1` or `/v2` move |
| C-03 IDs | PAT/SYN and short IDs vary between examples/prototypes | Contract decisions preserve source IDs verbatim, internal deterministic UUID5; CASE-001 uses SYN-001 and case-qualified resource IDs | Examples do not rename canonical records | Opaque strings everywhere; never map PAT to SYN or parse display labels |
| C-04 States | Proposed state machine uses partial; skill shows created/planning/collecting | Phase 3 maps partial→completed_with_limitations, candidate/under_review→proposed, refuted→rejected, inconclusive→unresolved | Public contract enums authoritative; detailed workflow stages are not run statuses | Keep six run statuses and four finding statuses |
| C-05 Recovery | Original design allows leases/retries/resume/cancel | Phase 3 selects process-local worker, startup failure of interrupted runs, new POST retry; no cancel/resume route | Explicit MVP recovery resolution, not a durable queue | Preserve terminal immutability and old history; cancellation enum remains even without endpoint |
| C-06 Evidence/confidence | Examples use source_ids, page/span, numeric confidence; evidence skill shows refutes/context | Phase 3 Anchor uses source object, field/expected/quote/version/hash; relationships supports/contradicts/contextualizes/derived_from; qualitative support | Keep exact implemented anchor vocabulary; advanced locators remain a gap | No silent field renaming, invented PDF page or probability |
| C-07 Support levels | phase-3-decisions mentions strong/moderate/limited/insufficient | Current Finding schema exposes strong/limited/insufficient only | Record narrower existing wire contract; moderate is a future proposed enum addition | Do not emit moderate during structural refactor |
| C-08 Rule verification | evidence-contract says reviewed-result-before-availability can verify | Current Candidate accepts review_before_result but EvidenceVerifier has no branch; onset_conflict, lab_change, field_observation implemented | Correct docs to mark review rule unsupported. This is an implementation gap, not proof of a verified capability | Keep accepted value; it remains inconclusive until separate implementation and tests |
| C-09 Case serialization | case-schema uses YAML, proposes bulk seeding | Phase 2 explicitly selects case.json serialization of same clinical envelope; seed_all_cases absent | JSON is current approved input; bulk/YAML are deferred capabilities | No auto-conversion or new schema; strict unknown-field rejection |
| C-10 Missing CASE-001/historical gates | Early reports/AGENTS say no case/domain implementation gated | Later CASE-001 authoring and Phases 2–5 implement data/contracts/runtime | Historical statements must be labeled, not applied as a new stop gate | No regeneration; unresolved strict discovery/live/expert/isolation gates remain |
| C-11 Timeline tool | agent-tools §20 describes broad merged timeline | Intro and Phase 3 report explicitly use clinical-event adapter + supervisor merge | Legacy tool behavior retained; richer composed timeline remains a separate contract issue | Preserve name/output until explicit tool evolution |
| C-12 Frontend organization/query library | frontend architecture proposes features tree and TanStack Query | Phase 4 explicitly retains domain components/central clients and custom hooks without new dependency | Functional ownership matters; no forced folder/dependency rewrite | Keep clients/hooks and source deep links |
| C-13 UI route inventory | Design calls for cases, investigation list, dedicated record routes | Phase 4 ships four-screen journey, explicitly no investigation-list API | Later scope reduction explains current state but does not obsolete library/detail requirements | Add APIs and views incrementally; retain working URLs |
| C-14 Search relevance | agent-tools suggests useful ranking | Phase 2 documents exact substring, stable ID order, score=1 | Unranked implementation is intentional MVP decision; targeted filters still incomplete | Never treat score as confidence or promise ranked search |
| C-15 Benchmark success | Phase 3 report says detected 1/1 with earlier scorer | Phase 5 exact-anchor scorer/release report says exact 0/1, partial 1/1; new replay agrees | Phase 5 supersedes earlier performance interpretation, not clinical source truth | Preserve frozen answer key and report actual denominators |
| C-16 Evaluator isolation | API/tool exclusion described alongside inaccessible runtime files | Phase 5 explicitly discloses same-user filesystem access | Logical omission and OS sandbox are distinct; runtime access denial still unverified | Enforce via principal/mount test before stronger claims |
| C-17 Optional exports/providers | Examples include server PDF, several provider implementations | Browser printing and Gemini adapter are actual implementations | Other providers/server PDF not prerequisites for structural alignment | No extra adapters/dependencies solely to match examples |

Open product decisions: neutral case-list/readiness DTOs; run-list filtering and
paging; typed tool evolution/versioning; archived source/anchor locator schema;
semantic assessment representation; stage outcome semantics; approved amendment
workflow. Resolve before dependent behavior changes. This audit recommends these
capabilities; it does not silently approve their wire formats.

## Existing public route inventory

Source of executable inventory: `apps/api/app/api/routes/{health,hospital,investigations}.py`,
`hospital/service.py:RESOURCES` and DTO modules. No application startup or DB
connection is needed to inspect the route definitions.

| Namespace | Method and route | Request/query | Successful contract |
| --- | --- | --- | --- |
| Health | GET `/api/health` | None | Health DTO status/version/database; 503 on DB failure |
| Hospital | GET `/api/hospital/v1/patients` | query, limit 1–100, offset >=0 | CollectionResponse[PatientResponse] |
| Hospital | GET `/api/hospital/v1/patients/{patient_id}` | Opaque patient ID | ResourceResponse[PatientResponse] |
| Hospital | GET `/api/hospital/v1/patients/{patient_id}/summary` | Patient | ResourceResponse[PatientSummary] |
| Hospital | GET `/api/hospital/v1/patients/{patient_id}/timeline` | Filters | CollectionResponse[TimelineEntry]; known instants only |
| Hospital | GET `/api/hospital/v1/encounters/{encounter_id}/records` | Encounter | ResourceResponse[EncounterRecords]; related source ID lists |
| Hospital | GET `/api/hospital/v1/patients/{patient_id}/observations/series` | required test_code, start_at/end_at | ResourceResponse[LabSeries]; mixed units refused |
| Hospital | GET `/api/hospital/v1/patients/{patient_id}/documents/search` | required q, document_type, start_at/end_at, limit/offset | CollectionResponse[DocumentSearchHit], unranked score=1 |
| Hospital | GET `/api/hospital/v1/patients/{patient_id}/{resource}` | Common Filters; meaning depends on resource | CollectionResponse[resource DTO] |
| Hospital | GET `/api/hospital/v1/{resource}/{record_id}` | Source ID | ResourceResponse[resource DTO] |
| Hospital | GET `/api/hospital/v1/documents/{document_id}/asset` | Registered document | Checked MIME bytes, inline except HTML attachment |
| Hospital | GET `/api/hospital/v1/imaging-studies/{study_id}/assets` | limit/offset | CollectionResponse[ImagingAssetResponse] |
| Hospital | GET `/api/hospital/v1/imaging-assets/{asset_id}/content` | Registered image asset | Checked MIME bytes |
| Hospital | GET `/api/hospital/v1/imaging-studies/{study_id}/report` | Study ID | ResourceResponse[DocumentResponse] |
| Investigation | POST `/api/investigations` | CreateInvestigation; optional Idempotency-Key <=100 chars | **202** CreationResponse; worker scheduled once on new create |
| Investigation | GET `/api/investigations/{id}` | Run ID | InvestigationState with version/progress/agents/timeline/hypotheses/limitations |
| Investigation | GET `/api/investigations/{id}/events` | after >=0, limit 1–1000 | EventPage {items,total}; total is returned page count |
| Investigation | GET `/api/investigations/{id}/findings` | Run ID | FindingPage {items,total} |
| Investigation | GET `/api/investigations/{id}/findings/{finding_id}` | Run + finding ID | Finding or FINDING_NOT_FOUND |
| Investigation | GET `/api/investigations/{id}/report` | Run ID | Persisted Report; **409 REPORT_NOT_READY** before publication |
| Investigation | GET `/api/investigations/{id}/stream` | after and numeric Last-Event-ID | text/event-stream, event ID = integer sequence, replay greater than cursor |

Dynamic resources are exactly `diagnoses`, `symptoms`, `diagnostic-reports`,
`encounters`, `clinical-events`, `observations`, `medications`, `documents`,
`imaging-studies`, `referrals`. Imaging assets have their explicit routes above.
No case-list, run-list, general `/api/assets`, cancel, retry-execution or resume
endpoint exists. Do not implement speculative calls from components.

Common hospital Filters currently declare limit/offset, start_at/end_at,
encounter_id/type, department, status, test_code/name, medication_name,
document_type, event_type/event_types and sort. Their actual resource-specific
semantics are not uniform: generic service listing always sorts encounters
descending and other resources ascending, and skips `sort`; `event_types` has
timeline-specific use. This behavior must be characterized before fixing it,
not mistaken for fully implemented independent filters on every route. Date
query instants require offsets. Asset APIs never accept a filesystem path.

## Wire schemas that structural refactoring must preserve

Hospital collections use `{data,pagination:{limit,offset,total,has_more},meta}`;
resources use `{data,meta}`. Hospital errors use `{error:{code,message},meta}`.
Health/investigation errors use `{error:{code,message,request_id}}`. The shared
HTTP client handles both; unifying them silently would break clients.

CreateInvestigation accepts patient_id and the five objectives
full_record_investigation, timeline_investigation, contradiction_investigation,
medication_investigation, laboratory_investigation (default full). The objective
currently records intent but does not choose a different execution plan. Keep
that behavior for R02; objective-aware selection belongs to R05.

Run states: queued, running, completed, completed_with_limitations, failed,
cancelled. Finding states: proposed, verified, rejected, unresolved. Verification:
verified, rejected, inconclusive. Agent public states: pending, running,
completed, failed. Report response carries a run status, not the internal
reports-table status ready. Current progress has five stages. The database stores
stage/agent/tool states separately; do not expose internal enum names as new
public run statuses.

Anchor preserves `source:{type,id}`, source_version, source_hash, encounter_id,
field, expected, optional quote and relationship. Supported source kinds are
patient, encounter, clinical_event, observation, medication, document,
imaging_study, imaging_asset, referral, diagnostic_report, diagnosis, symptom.
Hash is SHA-256 of sorted compact canonical DTO JSON encoded as UTF-8; it is not
the PDF byte hash or extracted text hash. Equality checks are currently exact DTO
field comparisons, while rule chronology normalizes comparable instants to UTC.
Retain original offset/precision and separate clinical timestamps.

Finding adds type/title/claim/claim_kind/rule, alternatives, limitations, anchor
list, ID/run, status/support_level, verification checks and creation/verification
times. Report holds summary, timeline, verified/rejected/unresolved findings,
hypotheses, limitations, generation time, execution_mode and execution_config.
Timeline retains timestamp, timestamp_type, precision and named timestamps.

Events contain id, investigation_id, sequence, type, timestamp and payload. SSE
id is sequence, not the UUID-based JSON id. Client deduplicates JSON IDs and
orders by sequence; reconnect uses cursor then REST/history reconciliation.
Unknown event types must survive parsing. Finalization currently emits
investigation.completed with payload.status even for completed_with_limitations.
Do not silently replace it with a different event name.

## Persistence and ingestion compatibility

Retain revision IDs and applied migration contents through 0004_investigation.
Alembic owns schema changes. Do not use create_all against persistent demo data.
Hospital internal UUIDs, source external IDs, DTO mappings, document version
links, registered asset keys/MIME/SHA/size, source payload and dataset seed_hash
are compatibility data. Reimport identical clinical data/assets is a no-op;
changed same-version data and reused conflicting IDs fail closed.

Investigation tables retain run/version/context, stages, agent_executions,
tool_calls, ordered investigation_events, evidence_refs, findings,
finding_evidence_links and reports. Preserve finding logical-key uniqueness and
report `(investigation_id,version)` uniqueness. JSON bodies are durable contracts
too: validate older stored rows when changing internal schemas. New required
fields need defaults/backfill or a versioned reader. No data migration in R02.

## Frontend dependencies

`lib/api/client.ts` owns configured base URL, safe HTTP errors and transport;
`hospital.ts` owns versioned routes, parsing and patient/ID checks;
`investigations.ts` owns create/state/events/findings/report and DTO validation;
`lib/sse/investigation-stream.ts` owns stream parsing; `use-investigation.ts`
owns authoritative refresh/history/reconnect. Source selection uses source and
source_type query params. Browser asset object URLs are temporary; backend file
paths must not enter route state or responses.

Routes `/patients/{id}` and `/investigations/{id}[/report]` must remain navigable
through all refactors. New contextual routes should redirect or share components,
not invalidate saved evidence links. Do not change underscore field names to the
camelCase illustrative frontend interfaces on the wire.

## Proposed evolution and migration strategy

| Future change | Risk / migration requirement | Earliest milestone |
| --- | --- | --- |
| Typed per-tool inputs and richer compare/search outputs | Internal callers, catalog/provider prompts and tests depend on shared ToolInput; retain legacy adapter, introduce explicit schema version if semantics change | R04 |
| Case/run inventory APIs | Additive route/schema decision; pagination/readiness must use clinical metadata only, never evaluator labels | R07/R08 |
| Page/span/region and archived source retrieval | Add discriminated anchor kind while accepting legacy field anchors; version stored finding/report reader, append-only source-version policy | R03/R06 |
| Evidence creator/tool attribution | New nullable/backfilled lineage fields and reviewed migration; retain historical unknown rather than inventing creator | R06 |
| Stage outcome/report publication changes | Characterize old event/state output, add outcome fields where possible, update client/tests before new required semantics | R05/R06 |
| Semantic hypothesis assessments | Keep old hypotheses readable; add explicit assessment/uncertainty state rather than upgrading verdict from citation validity | R06 |
| Normalized evidence queries | Migrate from JSON only if concrete integrity/query need; back up, copy, verify counts/IDs/anchors and test rollback | R06 |
| Production authorization or recovery policy | Separate reviewed product/security contract, denied-source tests, no silent local-demo credential requirement | R10 or later |

No breaking change is implemented or required by Refactor 01/02. If future work
cannot be additive, record a new decision, publish a versioned contract/adapter,
test old and new clients/stored reports, and retire the old behavior only after
an explicit migration window.
