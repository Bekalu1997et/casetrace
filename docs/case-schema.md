# CASETRACE Case Schema

Storage alignment: canonical CASE-001 through CASE-010 source data stays under `data/cases/`; generated assets remain in documented asset directories. Imported source records and runtime investigations live in SQLite, with evaluator-only ground truth excluded from runtime import and mounts. Runtime investigations never overwrite canonical cases. See [development stack](development-stack.md) and [demo reset](demo-runbook.md).

**Status:** Canonical  
**Purpose:** Define the structure, semantics, validation rules, and ground-truth representation for synthetic CASETRACE investigations.

---

## 1. Purpose

`case-schema.md` defines how synthetic medical cases are represented before they are loaded into the CASETRACE simulated hospital system.

A CASETRACE case is not a single document.

It is a connected collection of:

- Patient demographics
- Encounters
- Clinical events
- Symptoms
- Diagnoses
- Laboratory observations
- Medications
- Clinical notes
- Diagnostic reports
- Imaging studies
- Imaging assets
- Referrals
- Timeline relationships
- Intended clinical mystery
- Ground-truth investigation answer

The case schema must support realistic longitudinal investigations where important information may be distributed across multiple encounters and document types.

---

# 2. Core Principle

A case must behave like a real patient's longitudinal clinical record.

The important finding should usually **not** exist as one explicit sentence.

Instead, the evidence should be distributed across records.

Example:

```text
Visit 1
  ↓
symptom documented

Visit 2
  ↓
lab abnormality

Visit 3
  ↓
medication changed

Visit 4
  ↓
specialist note

Visit 5
  ↓
diagnostic finding

Investigation
  ↓
connects all evidence
  ↓
discovers contradiction
```

The case should reward **cross-record reasoning**, not keyword matching.

---

# 3. Case Identity

Every case has a stable identifier.

```yaml
case_id: CASE-001
version: "1.0"
status: ready
```

### Required fields

| Field | Type | Description |
|---|---|---|
| `case_id` | string | Stable case identifier |
| `version` | string | Schema/case version |
| `status` | enum | draft / validating / ready / deprecated |
| `title` | string | Internal case title |
| `description` | string | Short internal description |
| `created_at` | datetime | Case creation timestamp |
| `updated_at` | datetime | Last modification timestamp |

Example:

```yaml
case_id: CASE-001
version: "1.0"
status: ready
title: "The Missing Timeline"
description: >
  A longitudinal case where the true chronology of a clinically important
  event becomes visible only after connecting multiple encounters.
```

---

# 4. Case Metadata

Metadata describes the intended investigation without revealing the answer to runtime agents.

```yaml
metadata:
  specialty: internal_medicine
  difficulty: hard
  estimated_investigation_minutes: 5
  primary_mystery_type: timeline_contradiction
  secondary_mystery_types:
    - medication_change
    - documentation_delay

  tags:
    - longitudinal
    - multi_visit
    - laboratory
    - medication
    - documentation
```

### Supported mystery types

```text
timeline_contradiction
medication_mystery
lab_trend
diagnostic_delay
documentation_delay
cross_department_conflict
imaging_clinical_mismatch
referral_gap
duplicate_or_conflicting_record
```

A case may contain multiple mystery types, but one must be designated as the **primary mystery**.

---

# 5. Patient

```yaml
patient:
  id: PAT-001
  synthetic_identifier: "MRN-SYN-000001"
  display_name: "Samuel Bekele"
  date_of_birth: "1984-07-14"
  sex: male
```

### Required fields

```yaml
patient:
  id: string
  synthetic_identifier: string
  display_name: string
  date_of_birth: date
  sex: enum
```

### Allowed sex values

```text
male
female
other
unknown
```

All patient data must be synthetic.

No real person's identifiable medical information may be used.

---

# 6. Encounters

Encounters represent visits or clinical interactions.

```yaml
encounters:
  - id: ENC-001
    patient_id: PAT-001
    encounter_type: outpatient
    department: "Primary Care"
    provider_name: "Dr. Hana Tesfaye"
    started_at: "2026-01-12T09:15:00"
    ended_at: "2026-01-12T09:45:00"
    status: completed
```

### Encounter types

```text
outpatient
inpatient
emergency
specialist
telemedicine
laboratory
radiology
procedure
follow_up
```

### Required fields

```yaml
id: string
patient_id: string
encounter_type: string
department: string
provider_name: string
started_at: datetime
ended_at: datetime
status: string
```

---

# 7. Clinical Events

Clinical events represent things that happened to or were observed about the patient.

```yaml
clinical_events:
  - id: EVT-001
    patient_id: PAT-001
    encounter_id: ENC-001
    event_type: symptom
    occurred_at: "2026-01-12T09:20:00"
    documented_at: "2026-01-12T09:35:00"
    description: >
      Patient reports intermittent episodes of dizziness
      beginning approximately two weeks earlier.
```

### Event types

```text
symptom
diagnosis
procedure
clinical_observation
adverse_event
referral
medication_change
test_order
test_result
hospitalization
discharge
follow_up
```

### Important timestamp rule

Every event that can create timeline ambiguity should distinguish:

```text
occurred_at
documented_at
```

These timestamps must **not** be collapsed.

Example:

```yaml
occurred_at: "2026-01-10T18:00:00"
documented_at: "2026-01-12T09:30:00"
```

This allows CASETRACE to distinguish:

> Something happened on January 10 but was documented on January 12.

from:

> The event actually happened on January 12.

---

# 8. Symptoms

Symptoms may be represented as clinical events or explicit symptom records.

```yaml
symptoms:
  - id: SYM-001
    patient_id: PAT-001
    encounter_id: ENC-001
    name: dizziness
    onset_at: "2026-01-01"
    severity: moderate
    frequency: intermittent
    status: active
    description: >
      Episodes lasting approximately 5-10 minutes.
```

### Required fields

```yaml
id
patient_id
encounter_id
name
onset_at
status
```

Optional:

```yaml
severity
frequency
duration
description
```

---

# 9. Diagnoses

```yaml
diagnoses:
  - id: DX-001
    patient_id: PAT-001
    encounter_id: ENC-002
    name: "Hypertension"
    code_system: ICD-10
    code: I10
    status: active
    diagnosed_at: "2026-01-20"
```

Diagnosis records must preserve uncertainty.

Supported status:

```text
suspected
provisional
confirmed
resolved
historical
ruled_out
```

---

# 10. Laboratory Observations

Laboratory results are one of the most important evidence types in CASETRACE.

```yaml
observations:
  - id: LAB-001
    patient_id: PAT-001
    encounter_id: ENC-002

    test_code: HGB
    test_name: Hemoglobin

    value_numeric: 10.4
    value_text: null
    unit: g/dL

    reference_range_low: 12.0
    reference_range_high: 17.0

    status: final

    specimen_collected_at: "2026-01-20T10:15:00"
    reported_at: "2026-01-20T14:20:00"

    source_document_id: DOC-004
```

### Required fields

```yaml
id
patient_id
test_name
status
specimen_collected_at
reported_at
```

At least one of:

```text
value_numeric
value_text
```

must be present.

### Status

```text
ordered
preliminary
final
corrected
cancelled
```

---

# 11. Medication Records

Medication history must distinguish prescription events from actual documented use whenever possible.

```yaml
medications:
  - id: MED-001
    patient_id: PAT-001
    encounter_id: ENC-002

    medication_name: "Amlodipine"
    generic_name: "amlodipine"

    dose: 5
    dose_unit: mg

    route: oral
    frequency: once_daily

    start_at: "2026-01-20"
    end_at: null

    status: active

    prescriber: "Dr. Hana Tesfaye"
    ordered_at: "2026-01-20T10:00:00"

    source_document_id: DOC-005
```

### Medication status

```text
ordered
active
discontinued
held
completed
unknown
```

### Critical rule

Medication records must preserve:

```text
ordered_at
start_at
end_at
status
```

Do not assume these timestamps are identical.

---

# 12. Clinical Documents

Documents are the primary unstructured evidence layer.

```yaml
documents:
  - id: DOC-001
    patient_id: PAT-001
    encounter_id: ENC-001

    document_type: progress_note
    title: "Primary Care Visit Note"

    author: "Dr. Hana Tesfaye"

    event_at: "2026-01-12T09:40:00"
    authored_at: "2026-01-12T10:15:00"

    mime_type: text/plain

    text_content: |
      Patient presents with intermittent dizziness...

    storage_path: null

    metadata:
      department: primary_care
```

### Document types

```text
progress_note
consultation_note
discharge_summary
emergency_note
nursing_note
lab_report
radiology_report
pathology_report
medication_order
prescription
referral
procedure_note
patient_message
specialist_note
administrative_note
```

---

# 13. Document Assets

Documents may exist as generated files.

Example:

```yaml
storage_path: "cases/CASE-001/documents/DOC-004.pdf"
mime_type: application/pdf
```

Supported:

```text
application/pdf
image/png
image/jpeg
text/plain
text/html
```

The database stores metadata and extracted text.

The actual file is stored through the asset storage abstraction.

---

# 14. Imaging Studies

```yaml
imaging_studies:
  - id: IMG-001
    patient_id: PAT-001
    encounter_id: ENC-004

    modality: CT
    body_region: chest

    performed_at: "2026-02-05T11:20:00"
    reported_at: "2026-02-05T16:30:00"

    status: final

    report_document_id: DOC-018
```

### Supported modalities

```text
X_RAY
CT
MRI
ULTRASOUND
ECG
ECHOCARDIOGRAM
OTHER
```

---

# 15. Imaging Assets

Images are separate from imaging study metadata.

```yaml
imaging_assets:
  - id: IMG-ASSET-001
    imaging_study_id: IMG-001
    asset_type: radiology_image
    mime_type: image/png
    storage_path: "cases/CASE-001/imaging/IMG-001-01.png"
    metadata:
      width: 2048
      height: 2048
```

For the hackathon, generated or synthetic images are acceptable.

The case must never imply that a generated image came from a real patient.

---

# 16. Referrals

```yaml
referrals:
  - id: REF-001
    patient_id: PAT-001
    encounter_id: ENC-003

    referring_department: "Primary Care"
    referred_department: "Cardiology"

    reason: >
      Persistent dizziness with abnormal ECG.

    ordered_at: "2026-01-28T11:30:00"
    appointment_at: "2026-02-04T09:00:00"

    status: completed
```

Supported status:

```text
ordered
scheduled
completed
cancelled
no_show
unknown
```

---

# 17. Timeline Relationships

Cases may explicitly define relationships between events.

```yaml
timeline_relationships:
  - id: REL-001
    from_event_id: EVT-003
    to_event_id: EVT-008
    relationship: precedes
```

Supported relationships:

```text
precedes
follows
causes
possibly_causes
responds_to
documents
updates
contradicts
duplicates
references
```

These relationships are useful for case validation and evaluation.

They should not automatically be exposed to runtime agents.

---

# 18. Case Evidence Graph

A case may define expected relationships between records.

```yaml
evidence_relationships:
  - id: ER-001
    source_id: LAB-003
    target_id: MED-002
    relationship: contextualizes

  - id: ER-002
    source_id: DOC-009
    target_id: EVT-006
    relationship: documents
```

Supported relationships:

```text
supports
contradicts
contextualizes
documents
derived_from
references
```

These relationships form part of the evaluator's ground truth.

---

# 19. Intended Investigation

Every case must define what the investigation is expected to discover.

This information belongs to the **evaluation layer**, not the normal clinical record layer.

```yaml
investigation_target:
  primary_question: >
    What important timeline inconsistency is hidden across the patient's records?

  primary_mystery_type: timeline_contradiction

  required_discovery:
    description: >
      A clinically important event was documented as occurring later
      than evidence showing that it had already occurred.

  required_evidence:
    - DOC-009
    - EVT-006
    - LAB-004

  acceptable_conclusions:
    - timeline_contradiction
    - documentation_delay

  unacceptable_conclusions:
    - unsupported_causal_claim
    - fabricated_event
```

---

# 20. Ground Truth

Ground truth is **strictly isolated from normal runtime access**.

It exists only for:

- Case validation
- Automated evaluation
- Developer debugging
- Demo preparation

Agents must never receive this object.

```yaml
ground_truth:
  primary_finding:
    id: GT-001

    finding_type: timeline_contradiction

    claim: >
      The patient's clinically significant event occurred before
      the date stated in a later clinical note.

    confidence: definitive

  supporting_sources:
    - DOC-009
    - EVT-006
    - LAB-004

  contradiction:
    event_a: EVT-006
    event_b: DOC-009

    expected_relationship: contradicts

  explanation: >
    Earlier records establish that the event occurred on January 18,
    while a later note describes the event as beginning on January 24.

  expected_agent_behavior:
    - identify_candidate
    - retrieve_original_sources
    - compare_timestamps
    - verify_source_content
    - classify_contradiction
    - cite_evidence
```

### Ground truth must never be:

- Returned by a clinical API
- Returned by an agent tool
- Included in an agent prompt
- Included in investigation context
- Included in frontend investigation responses
- Stored in normal clinical tables
- Searchable through normal document retrieval

---

# 21. Red Herrings

Realistic cases may contain irrelevant or misleading information.

```yaml
red_herrings:
  - id: RH-001
    source_id: DOC-006
    description: >
      A mild abnormality that appears clinically relevant but
      does not explain the primary mystery.

    relevance: low
```

Red herrings must still be medically plausible.

Do not create obviously fake distractions.

---

# 22. Case Noise

Cases should contain realistic documentation imperfections.

Examples:

```yaml
noise:
  - duplicate_note
  - delayed_documentation
  - abbreviation
  - missing_optional_field
  - inconsistent_provider_wording
  - different_date_formats
  - repeated_lab_result
```

Noise should increase realism without making the case impossible.

---

# 23. Case Quality Levels

Each case should be assigned a difficulty.

```text
easy
medium
hard
expert
```

### Easy

Primary evidence appears in 2–3 records.

### Medium

Evidence spans multiple record types.

### Hard

Evidence spans multiple encounters and requires chronology reconstruction.

### Expert

Evidence requires:

- Multiple encounters
- Conflicting documentation
- Temporal normalization
- Multiple evidence types
- Targeted retrieval
- Verification
- Rejection of plausible false positives

CASE-001 should be **hard**.

---

# 24. Complete Case YAML Structure

The canonical structure is:

```yaml
case_id: CASE-001
version: "1.0"
status: ready

title: "The Missing Timeline"

description: >
  Longitudinal synthetic clinical investigation.

metadata:
  specialty: internal_medicine
  difficulty: hard
  primary_mystery_type: timeline_contradiction
  secondary_mystery_types:
    - documentation_delay
    - medication_change

patient:
  id: PAT-001
  synthetic_identifier: "MRN-SYN-000001"
  display_name: "Samuel Bekele"
  date_of_birth: "1984-07-14"
  sex: male

encounters: []

clinical_events: []

symptoms: []

diagnoses: []

observations: []

medications: []

documents: []

imaging_studies: []

imaging_assets: []

referrals: []

timeline_relationships: []

evidence_relationships: []

investigation_target: {}

red_herrings: []

noise: {}

ground_truth: {}
```

---

# 25. ID Conventions

IDs must be globally unique within a case.

Recommended format:

```text
CASE-001

PAT-001

ENC-001
EVT-001
SYM-001
DX-001

LAB-001
MED-001

DOC-001

IMG-001
IMG-ASSET-001

REF-001

REL-001
ER-001

GT-001
RH-001
```

IDs must remain stable after seeding.

Agents should cite these IDs when referring to evidence.

---

# 26. Temporal Rules

Temporal consistency is critical.

The validator must check:

### Encounter

```text
started_at <= ended_at
```

### Laboratory

```text
specimen_collected_at <= reported_at
```

### Document

```text
event_at <= authored_at
```

unless the case explicitly defines delayed or retrospective documentation.

### Medication

```text
ordered_at <= start_at
```

when both exist.

### Referral

```text
ordered_at <= appointment_at
```

when completed normally.

Exceptions must be explicitly marked.

---

# 27. Documentation Delay

Documentation delay is legitimate clinical behavior.

Example:

```yaml
occurred_at: "2026-02-01T14:00:00"
documented_at: "2026-02-03T09:00:00"
```

This is not automatically a contradiction.

The contradiction investigator must determine whether the discrepancy is:

```text
VERIFIED_CONTRADICTION
DOCUMENTATION_DELAY
AMBIGUOUS
FALSE_POSITIVE
INSUFFICIENT_EVIDENCE
```

---

# 28. Source Provenance

Every clinically meaningful record must be traceable.

Examples:

```yaml
source_document_id: DOC-014
```

or:

```yaml
source_refs:
  - type: document
    id: DOC-014
```

The system must never produce an evidence-backed finding where the original source cannot be retrieved.

---

# 29. Synthetic Document Requirements

Documents should not all be clean database strings.

A realistic case may contain:

```text
Structured lab result
PDF laboratory report
Clinical note
Scanned prescription
Radiology report
Referral document
Discharge summary
Medication order
Patient message
```

When appropriate, the same fact may appear in multiple representations.

Example:

```text
Database observation
        +
Lab PDF
        +
Doctor note
```

This allows CASETRACE to demonstrate multimodal evidence retrieval.

---

# 30. Multimodal Case Requirements

A complete high-quality case should ideally contain:

### Structured

- Patient
- Encounters
- Labs
- Medications
- Diagnoses

### Unstructured

- Clinical notes
- Specialist notes
- Referral notes
- Discharge summaries

### Documents

- PDF lab reports
- Prescriptions
- Referral forms

### Imaging

- Radiology report
- At least one synthetic image where clinically relevant

Not every case needs every modality.

However, CASETRACE should demonstrate that its architecture can handle all of them.

---

# 31. Case Generation Rules

Synthetic cases must be generated from a **ground-truth-first** process.

Correct order:

```text
1. Design clinical mystery
2. Define ground truth
3. Define required evidence
4. Define timeline
5. Create encounters
6. Create clinical events
7. Create labs
8. Create medications
9. Create documents
10. Create imaging/referrals
11. Add realistic noise
12. Validate chronology
13. Validate evidence links
14. Validate ground truth
15. Seed hospital system
16. Run investigation
17. Evaluate investigation
```

Do NOT generate random medical records first and invent the mystery afterward.

---

# 32. Case Validation

Every case must pass validation before it can be marked:

```yaml
status: ready
```

Validation must check:

### Structural

- Required fields exist
- IDs are unique
- IDs follow naming conventions

### Referential

- Every patient reference exists
- Every encounter reference exists
- Every source document exists
- Every imaging asset points to an imaging study

### Temporal

- Dates are logically valid
- Timestamp relationships are valid
- Explicit exceptions are documented

### Evidence

- Ground-truth sources exist
- Required evidence is retrievable
- Findings can be independently verified

### Asset

- Every referenced PDF exists
- Every referenced image exists
- MIME types match files

### Ground truth

- Primary finding is defined
- Required evidence is defined
- Expected classification is defined

---

# 33. Runtime Isolation

The case loader must separate:

```text
CLINICAL DATA
```

from:

```text
EVALUATION DATA
```

Conceptually:

```text
case.yaml
   │
   ├── clinical records ─────→ simulated hospital
   │
   └── ground truth ─────────→ evaluator only
```

The runtime database must never expose:

```text
ground_truth
investigation_target.required_discovery
acceptable_conclusions
red_herring labels
expected evidence relationships
```

---

# 34. Case Seeding

Cases are loaded through:

```text
scripts/validate_case.py
scripts/seed_case.py
scripts/seed_all_cases.py
```

Example:

```bash
python scripts/validate_case.py cases/CASE-001
```

Then:

```bash
python scripts/seed_case.py cases/CASE-001
```

Multiple cases:

```bash
python scripts/seed_all_cases.py
```

Seeding must be deterministic.

Running the seed process twice must not create duplicate clinical records.

---

# 35. Case Directory Structure

Recommended structure:

```text
cases/
  CASE-001/
    case.yaml

    documents/
      DOC-001.pdf
      DOC-002.pdf
      DOC-003.txt

    imaging/
      IMG-001-01.png
      IMG-001-02.png

    prescriptions/
      RX-001.pdf

    expected/
      ground_truth.yaml
```

For stronger isolation, `expected/` should be excluded from runtime application assets.

---

# 36. Case-001 Requirements

CASE-001 is the primary development case.

It must demonstrate:

```text
Multiple encounters
        ↓
Distributed evidence
        ↓
Timeline inconsistency
        ↓
Candidate contradiction
        ↓
Targeted retrieval
        ↓
Source verification
        ↓
Evidence-backed finding
        ↓
Final investigation report
```

Minimum recommended record set:

```text
5+ encounters
8+ clinical documents
5+ laboratory observations
3+ medication records
1+ diagnostic report
1+ referral
1+ intentional timeline contradiction
2+ plausible red herrings
```

The exact clinical story must remain medically coherent.

---

# 37. Case Evaluation Contract

The evaluator should be able to answer:

```text
Did the system discover the intended mystery?

Did it identify the correct records?

Did it cite the correct sources?

Did it reconstruct the timeline correctly?

Did it distinguish documentation delay from contradiction?

Did it avoid unsupported causal claims?

Did it reject plausible false positives?

Did the final report match the ground truth?
```

Suggested metrics:

```text
finding_recall
evidence_precision
source_citation_accuracy
timeline_accuracy
contradiction_classification_accuracy
false_positive_rate
unsupported_claim_rate
```

---

# 38. What Agents May Assume

Agents may assume:

```text
Records are synthetic.
Source IDs are stable.
Tool results contain provenance.
Missing data may be meaningful.
Documentation timestamps may differ from event timestamps.
Records may conflict.
Some records may be irrelevant.
```

Agents must NOT assume:

```text
The newest record is correct.
A note's authored date equals event date.
A medication order means the patient took the medication.
A diagnosis is confirmed merely because it appears in a note.
A contradiction is real without source verification.
```

---

# 39. What Agents Must Never Do

Agents must never:

```text
Invent a clinical record.
Invent a laboratory value.
Invent a timestamp.
Invent a medication.
Invent an imaging finding.
Invent a source ID.
Infer a missing record as fact.
Access ground truth.
Bypass clinical tools.
Query the database directly.
Treat model confidence as evidence.
```

If evidence is insufficient, the agent must say:

```text
INSUFFICIENT_EVIDENCE
```

rather than inventing an answer.

---

# 40. Design Principle

The case schema exists to make the following behavior possible:

```text
The agent does not know the answer.

The agent discovers records.

The agent builds a timeline.

The agent notices something unusual.

The agent retrieves the original evidence.

The agent tests the hypothesis.

The system verifies the evidence.

Only then does CASETRACE make the finding.
```

That is the fundamental behavior CASETRACE is designed to demonstrate.

---

# 41. Final Rule

When adding or modifying a case:

> **Do not optimize the case for what the LLM is likely to answer. Optimize it for whether a careful investigator could prove the answer from the available evidence.**

CASETRACE is an evidence reconstruction system.

Therefore:

**Evidence → Timeline → Hypothesis → Retrieval → Verification → Finding**

not:

**LLM → Guess → Explanation**

# Phase 2 implemented serialization

The maintenance CLI currently accepts `data/cases/<case_id>/case.json`, a JSON
serialization of the canonical envelope above. It does not introduce a second
clinical field schema. The required case identity/version/status/created_at/
updated_at and typed clinical fields are validated with Pydantic. Clinical arrays
may be empty when source data is absent. JSON source dictionaries must not contain
unknown clinical fields. YAML parsing is not implemented yet; a missing JSON
file fails explicitly, without converting or modifying source files.

Optional `diagnostic_reports` uses exactly the DiagnosticReport fields from
`hospital-api.md`; observations are linked by `observation_ids`. Diagnoses and
symptoms use those same documented public schemas. The illustrative diagnosis
`status: active` above is not an accepted diagnosis enum; use its actual
source-supported uncertainty state rather than translating it silently.

Known clinical instants require explicit offsets despite older naive examples.
Medication start/end and diagnosis/symptom onset may remain ISO dates. They do
not enter the instant-only chronology as assumed midnight. Completed observation
values must be present; ordered/cancelled observations may have no result.

Storage paths are relative to configured `ASSET_STORAGE_PATH`, under
`cases/<case_id>/`. Registering an asset requires existing bytes of the declared
MIME; import does not generate or copy assets. Metadata accepts department,
width, height, synthetic_label only. HTML attachments are download-only.

Top-level editor/evaluation sections (title, description, metadata, ground_truth,
investigation_target, timeline_relationships, evidence_relationships,
red_herrings, noise) never enter hospital persistence. Validation of the hidden
clinical mystery/evaluation graph is still an offline CASE-001 acceptance gate;
clinical import success is not a claim that the intended mystery is complete.
