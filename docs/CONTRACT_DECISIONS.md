# Phase 2 hospital contract decisions

Scope: hospital data only. Investigation enums, SSE and finding anchors remain
gated for Phase 3. No clinical narrative or answer key is established here.

- `hospital-api.md` owns the `/api/hospital/v1` namespace and DTOs. Older
  unversioned examples are not additional endpoints. Phase 1 health stays intact.
- Preserve canonical public IDs verbatim; never translate PAT to SYN. Internal
  IDs are UUID5 derived from case ID, version, resource type and canonical ID.
  Public resource IDs must be globally unique in this single demo installation;
  conflicting imports fail rather than silently remap evidence references.
- The hospital table catalog is the persistence baseline. The canonical case
  observations have no lab-order identity: `lab_order_id` is nullable; no order
  is synthesized. API names map explicitly to typed persistence columns.
- Persist encounter department/provider, document title/MIME, medication generic
  name/prescriber and source-document links required by the API. Clinical events
  preserve description. Do not substitute facility for department.
- Initial supported importer format is `case.json`, a JSON serialization of the
  canonical case-schema envelope. YAML support remains a gap; do not auto-convert
  source files. Unknown clinical fields fail validation. Evaluation sections are
  discarded by an allowlist before persistence and never hashed into public data.
- Medication date-only start/end values remain dates in the original literal;
  they never enter an instant timeline. Known instants require offsets. Preserve
  the original validated clinical payload separately from UTC searchable columns.
- Assets use keys relative to `ASSET_STORAGE_PATH`, under `cases/<case_id>/`.
  Importers never copy clinical or evaluation files into that root automatically.
  Only registered document/image references can be served; HTML is download-only.
- Reimport of identical clinical data and asset bytes is a no-op. Changed content
  for an existing case/version fails; version advancement also fails on reused
  public IDs. An explicit amendment/version workflow is required before updates.
- Phase 2 implements patients, encounters, events, observations, medication
  history, documents/versions, imaging/assets, referrals, diagnoses, symptoms and
  diagnostic reports. The latter three use the existing hospital API fields,
  added explicitly to the database catalog. Date-only symptom onset/diagnosis
  times stay in source payloads without an invented UTC instant. Diagnostic
  report observation links use a junction table and are validated before import.

CASE-001 audit (2026-10-20): its directory and the shared assets directory are
empty. No manifest, demographics, encounters, labs, medications, notes, reports,
images, referrals, chronology or private answer key exists in this checkout.
Examples in architecture documents are not canonical clinical records. The test
fixture is a separate synthetic pipeline control, not a replacement CASE-001.

- Source metadata is restricted to department, width, height and synthetic_label.
  Unknown clinical keys (including evaluator annotations) fail validation.
- Exact substring document search has an unranked relevance_score of 1 for every
  match, sorted by ID. It never estimates evidence quality or clinical confidence.
- Demo access is trusted local access; no authentication mechanism was introduced.
  Runtime asset reads materialize metadata and close the DB transaction before
  integrity checking/streaming files. Local process ACL isolation remains separate
  from API/DB answer-key exclusion tests.

- Dataset seeded_at is the actual UTC maintenance time, distinct from source
  creation/documentation times. Determinism comparisons exclude that operational
  timestamp while checking every clinical field, UUID, link and asset hash.
