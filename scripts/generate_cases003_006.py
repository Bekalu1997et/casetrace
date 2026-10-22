"""Generate CASE-003 through CASE-006 deterministic synthetic datasets.

This authoring script writes canonical cases, readable PDF source documents,
manifests, and evaluator-only answer keys. It is never imported by runtime
hospital services.
"""

# ruff: noqa: E501 -- Authored clinical records remain readable for source review.

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

from reportlab.lib.pagesizes import letter  # type: ignore[import-untyped]
from reportlab.pdfgen import canvas  # type: ignore[import-untyped]

ROOT = Path(__file__).resolve().parents[1]
LABEL = "SYNTHETIC - NOT FOR CLINICAL USE"


def instant(day: str, clock: str = "09:00") -> str:
    return f"2026-{day}T{clock}:00+03:00"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render_pdf(path: Path, title: str, body: str, department: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    doc.setTitle(title)
    doc.setFont("Helvetica-Bold", 14)
    doc.drawString(54, height - 54, "Aster Vale Synthetic Hospital")
    doc.setFont("Helvetica", 8)
    doc.drawRightString(width - 54, height - 54, LABEL)
    doc.setFont("Helvetica-Bold", 11)
    doc.drawString(54, height - 76, title)
    doc.setFont("Helvetica-Oblique", 8)
    doc.drawString(54, height - 91, department)
    y = height - 116
    doc.setFont("Helvetica", 9)
    for paragraph in body.splitlines():
        if not paragraph:
            y -= 10
            continue
        line = ""
        for word in paragraph.split():
            candidate = f"{line} {word}".strip()
            if len(candidate) > 108:
                doc.drawString(54, y, line)
                y -= 12
                line = word
            else:
                line = candidate
        if line:
            doc.drawString(54, y, line)
            y -= 12
        if y < 54:
            doc.showPage()
            doc.setFont("Helvetica", 9)
            y = height - 54
    doc.setFont("Helvetica-Oblique", 7)
    doc.drawString(54, 36, LABEL)
    doc.save()


def scoped(identifier: str, patient: str, encounter: str | None = None) -> dict[str, Any]:
    value: dict[str, Any] = {"id": identifier, "patient_id": patient}
    if encounter:
        value["encounter_id"] = encounter
    return value


def build_case(spec: dict[str, Any]) -> None:
    case_id = spec["case_id"]
    patient = f"SYN-{case_id[-3:]}"
    case_dir = ROOT / "data" / "cases" / case_id
    asset_dir = ROOT / "data" / "assets" / "cases" / case_id / "documents"
    eval_dir = ROOT / "evaluation" / case_id
    for directory in (case_dir, asset_dir.parent, eval_dir):
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir(parents=True, exist_ok=True)

    encounters: list[dict[str, Any]] = []
    for _number, item in enumerate(spec["encounters"], 1):
        encounter_id, day, kind, department, provider = item
        encounters.append(
            {
                **scoped(encounter_id, patient),
                "encounter_type": kind,
                "department": department,
                "provider_name": provider,
                "started_at": instant(day, "09:00"),
                "ended_at": instant(day, "11:30"),
                "status": "completed",
            }
        )

    documents: list[dict[str, Any]] = []
    document_text: dict[str, str] = {}
    for item in spec["documents"]:
        number, encounter, day, kind, title, author, text = item
        document_id = f"DOC-{case_id[-3:]}-{number:02d}"
        full_text = f"{LABEL}\nPatient: {patient} | Encounter: {encounter}\n{text}"
        document_text[document_id] = full_text
        department = next(e["department"] for e in encounters if e["id"] == encounter)
        documents.append(
            {
                **scoped(document_id, patient, encounter),
                "document_type": kind,
                "title": title,
                "author": author,
                "event_at": instant(day, "09:40"),
                "authored_at": instant(day, "12:00"),
                "mime_type": "application/pdf",
                "storage_path": f"cases/{case_id}/documents/{document_id}.pdf",
                "text_content": full_text,
                "metadata": {"department": department, "synthetic_label": LABEL},
            }
        )

    observations: list[dict[str, Any]] = []
    for panel in spec["panels"]:
        panel_number, encounter, day, document_number, values = panel
        document_id = f"DOC-{case_id[-3:]}-{document_number:02d}"
        for index, value in enumerate(values, 1):
            name, numeric, unit, low, high = value
            observations.append(
                {
                    **scoped(f"LAB-{case_id[-3:]}-{panel_number:02d}-{index:02d}", patient, encounter),
                    "test_code": name.upper().replace(" ", "_"),
                    "test_name": name,
                    "value_numeric": numeric,
                    "value_text": None,
                    "unit": unit,
                    "reference_range_low": low,
                    "reference_range_high": high,
                    "status": "final",
                    "specimen_collected_at": instant(day, "08:30"),
                    "reported_at": instant(day, "11:00"),
                    "source_document_id": document_id,
                }
            )

    medications: list[dict[str, Any]] = []
    for number, encounter, name, generic, dose, unit, frequency, start, status, document_number in spec["medications"]:
        medications.append(
            {
                **scoped(f"MED-{case_id[-3:]}-{number:02d}", patient, encounter),
                "medication_name": name,
                "generic_name": generic,
                "dose": dose,
                "dose_unit": unit,
                "route": "oral",
                "frequency": frequency,
                "start_at": start,
                "end_at": None,
                "status": status,
                "prescriber": "Dr. Hana Tesfaye",
                "ordered_at": instant(spec["medication_dates"][number - 1]),
                "source_document_id": f"DOC-{case_id[-3:]}-{document_number:02d}",
            }
        )

    clinical_events: list[dict[str, Any]] = []
    for number, encounter, day, event_type, description, document_number in spec["events"]:
        document_id = f"DOC-{case_id[-3:]}-{document_number:02d}"
        clinical_events.append(
            {
                **scoped(f"EVT-{case_id[-3:]}-{number:02d}", patient, encounter),
                "event_type": event_type,
                "occurred_at": instant(day, "09:40"),
                "documented_at": instant(day, "12:00"),
                "description": description,
                "source_document_id": document_id,
            }
        )

    reports: list[dict[str, Any]] = []
    for number, encounter, day, document_number, report_type, title, conclusion in spec["reports"]:
        document_id = f"DOC-{case_id[-3:]}-{document_number:02d}"
        report_observations = [
            record["id"] for record in observations if record["source_document_id"] == document_id
        ]
        reports.append(
            {
                **scoped(f"RPT-{case_id[-3:]}-{number:02d}", patient, encounter),
                "report_type": report_type,
                "title": title,
                "status": "final",
                "issued_at": instant(day, "11:00"),
                "conclusion": conclusion,
                "document_id": document_id,
                "observation_ids": report_observations,
                "imaging_study_id": None,
            }
        )

    case: dict[str, Any] = {
        "case_id": case_id,
        "version": "1.0",
        "status": "ready",
        "title": spec["title"],
        "description": spec["description"],
        "created_at": "2026-10-22T09:00:00+03:00",
        "updated_at": "2026-10-22T14:00:00+03:00",
        "patient": {
            "id": patient,
            "synthetic_identifier": f"MRN-{patient}",
            "display_name": spec["patient_name"],
            "date_of_birth": spec["dob"],
            "sex": spec["sex"],
        },
        "encounters": encounters,
        "clinical_events": clinical_events,
        "observations": observations,
        "medications": medications,
        "documents": documents,
        "imaging_studies": [],
        "imaging_assets": [],
        "referrals": spec["referrals"],
        "diagnoses": spec["diagnoses"],
        "symptoms": spec["symptoms"],
        "diagnostic_reports": reports,
    }
    for referral in case["referrals"] + case["diagnoses"] + case["symptoms"]:
        referral["patient_id"] = patient
    for document in documents:
        render_pdf(asset_dir / f"{document['id']}.pdf", document["title"], document_text[document["id"]], document["metadata"]["department"])

    case_path = case_dir / "case.json"
    case_path.write_text(json.dumps(case, indent=2) + "\n", encoding="utf-8")
    assets: list[dict[str, Any]] = []
    links: dict[str, list[str]] = {document["id"]: [] for document in documents}
    for group in ("clinical_events", "observations", "medications"):
        for record in case[group]:
            source = record.get("source_document_id")
            if source in links:
                links[source].append(record["id"])
    for document in documents:
        path = asset_dir / f"{document['id']}.pdf"
        assets.append(
            {
                "id": document["id"],
                "storage_path": document["storage_path"],
                "mime_type": "application/pdf",
                "sha256": sha(path),
                "byte_size": path.stat().st_size,
                "patient_id": patient,
                "source_version": 1,
                "page_count": 1,
                "encounter_id": document["encounter_id"],
                "event_at": document["event_at"],
                "authored_at": document["authored_at"],
                "linked_record_ids": sorted(
                    links[document["id"]]
                    + [report["id"] for report in reports if report["document_id"] == document["id"]]
                ),
            }
        )
    manifest = {
        "case_id": case_id,
        "version": "1.0",
        "synthetic_label": LABEL,
        "case_sha256": sha(case_path),
        "generator": "scripts/generate_cases003_006.py",
        "counts": {key: len(case[key]) for key in (
            "encounters", "clinical_events", "observations", "medications",
            "documents", "imaging_studies", "imaging_assets", "referrals",
            "diagnoses", "symptoms", "diagnostic_reports",
        )},
        "assets": assets,
    }
    (case_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    answer = dict(spec["answer"])
    answer["source_checksums"] = {asset["id"]: asset["sha256"] for asset in assets}
    (eval_dir / "answer-key.json").write_text(json.dumps(answer, indent=2) + "\n", encoding="utf-8")


def doc(number: int, encounter: str, day: str, kind: str, title: str, text: str, author: str = "Dr. Hana Tesfaye") -> tuple[Any, ...]:
    return number, encounter, day, kind, title, author, text


def panel(number: int, encounter: str, day: str, document_number: int, values: list[tuple[Any, ...]]) -> tuple[Any, ...]:
    return number, encounter, day, document_number, values


def common_spec(case_id: str, title: str, description: str, patient_name: str, dob: str, sex: str, encounters: list[tuple[str, str, str, str, str]], documents: list[tuple[Any, ...]], panels: list[tuple[Any, ...]], medications: list[tuple[Any, ...]], events: list[tuple[Any, ...]], reports: list[tuple[Any, ...]], answer: dict[str, Any], diagnoses: list[dict[str, Any]], symptoms: list[dict[str, Any]], referrals: list[dict[str, Any]], medication_dates: list[str]) -> dict[str, Any]:
    return locals()


def make_specs() -> list[dict[str, Any]]:
    cases: list[dict[str, Any]] = []
    cases.append(common_spec(
        "CASE-003", "The Result That Never Reached the Follow-Up Visit",
        "A pathology result is finalized and routed, but the record does not establish patient communication or completed follow-up.",
        "M. Patient (synthetic)", "1971-03-22", "female",
        [(f"ENC-003-{i:02d}", day, kind, dept, provider) for i, (day, kind, dept, provider) in enumerate([
            ("01-10", "outpatient", "Primary Care", "Dr. Hana Tesfaye"),
            ("01-24", "specialist", "Gastroenterology", "Dr. Leila Morgan"),
            ("01-31", "procedure", "Endoscopy", "Dr. Leila Morgan"),
            ("02-02", "laboratory", "Pathology", "P. Alemu, MD"),
            ("02-08", "outpatient", "Primary Care", "Dr. Hana Tesfaye"),
            ("03-05", "follow_up", "Primary Care", "Dr. Hana Tesfaye"),
            ("04-14", "outpatient", "Gastroenterology", "Dr. Leila Morgan"),
        ], 1)],
        [
            doc(1, "ENC-003-01", "01-10", "progress_note", "Initial anemia consultation", "Six weeks of intermittent dark stools and fatigue. CBC shows iron deficiency pattern. Refer for upper endoscopy; the reason is evaluation of possible gastrointestinal blood loss."),
            doc(2, "ENC-003-01", "01-10", "laboratory_report", "Baseline complete blood count", "Hemoglobin 10.8 g/dL; MCV 78 fL; ferritin 9 ng/mL. Results are final."),
            doc(3, "ENC-003-02", "01-24", "specialist_consult", "Gastroenterology consultation", "Persistent fatigue and intermittent dark stools. Endoscopy recommended to evaluate suspected source of iron deficiency; consent discussed."),
            doc(4, "ENC-003-02", "01-24", "procedure_order", "Upper endoscopy order", "Indication: iron deficiency anemia and intermittent dark stool. Specimens may be submitted if mucosal abnormality is identified."),
            doc(5, "ENC-003-03", "01-31", "procedure_note", "Upper endoscopy procedure note", "A 7 mm gastric antral lesion was biopsied. Specimen labeled gastric antrum biopsy and sent to pathology. Endoscopist recommends review of pathology when finalized."),
            doc(6, "ENC-003-03", "01-31", "specimen_record", "Specimen collection record", "Gastric antrum biopsy collected 2026-01-31 at 10:05 and accessioned as SP-003-01."),
            doc(7, "ENC-003-04", "02-02", "pathology_report", "Gastric biopsy pathology report", "Final diagnosis: gastric intestinal metaplasia with focal indefinite atypia; no invasive malignancy identified in this specimen. Recommendation: gastroenterology review and interval follow-up."),
            doc(8, "ENC-003-04", "02-02", "result_notification", "Pathology result routing record", "Result routed electronically to the ordering gastroenterologist and primary-care inbox. Routing status marked delivered; this field does not document patient discussion."),
            doc(9, "ENC-003-04", "02-02", "administrative_workflow", "Result management work queue", "Abnormal pathology result marked reviewed/closed in the administrative queue on 2026-02-06. No linked telephone note or patient communication is present in this record."),
            doc(10, "ENC-003-05", "02-08", "progress_note", "Primary care follow-up", "Patient reports fatigue continues. The note reviews anemia and iron replacement but does not mention the finalized gastric pathology result or a gastroenterology follow-up plan."),
            doc(11, "ENC-003-05", "02-08", "referral_order", "Gastroenterology follow-up referral", "Referral placed for follow-up of gastric biopsy and anemia; scheduling status pending."),
            doc(12, "ENC-003-06", "03-05", "progress_note", "Routine follow-up without pathology discussion", "Fatigue persists. No documentation of pathology communication, repeat endoscopy planning, or completed specialist appointment."),
            doc(13, "ENC-003-06", "03-05", "scheduling_record", "Referral scheduling record", "Referral remains unbooked after two outreach attempts; patient contact outcome is not documented."),
            doc(14, "ENC-003-07", "04-14", "specialist_consult", "Delayed gastroenterology review", "Patient is seen after referral delay. The prior pathology report is reviewed today; follow-up endoscopic surveillance is discussed. The record cannot establish when the patient first learned of the result."),
            doc(15, "ENC-003-07", "04-14", "patient_instruction", "Follow-up instructions", "Discussed pathology finding and need for gastroenterology surveillance. Patient given written instructions."),
            doc(16, "ENC-003-07", "04-14", "laboratory_report", "Follow-up blood count", "Hemoglobin 11.4 g/dL; MCV 81 fL; ferritin 14 ng/mL. Results are final."),
            doc(17, "ENC-003-05", "02-08", "medication_reconciliation", "Iron medication reconciliation", "Patient reports taking oral iron every other day; no medication explains the pathology workflow discrepancy."),
            doc(18, "ENC-003-07", "04-14", "referral_letter", "Surveillance referral letter", "Referral reason: gastric intestinal metaplasia with focal indefinite atypia and delayed follow-up documentation."),
        ],
        [panel(1, "ENC-003-01", "01-10", 2, [("Hemoglobin", 10.8, "g/dL", 12.0, 16.0), ("MCV", 78, "fL", 80, 100), ("Ferritin", 9, "ng/mL", 15, 150)]), panel(2, "ENC-003-06", "03-05", 16, [("Hemoglobin", 11.4, "g/dL", 12.0, 16.0), ("MCV", 81, "fL", 80, 100), ("Ferritin", 14, "ng/mL", 15, 150)])],
        [(1, "ENC-003-05", "Ferrous sulfate 325 mg", "ferrous sulfate", 325, "mg", "every other day", "2026-02-08", "active", 17), (2, "ENC-003-07", "Ferrous sulfate 325 mg", "ferrous sulfate", 325, "mg", "every other day", "2026-02-08", "active", 15), (3, "ENC-003-01", "Omeprazole 20 mg", "omeprazole", 20, "mg", "once daily", "2026-01-10", "active", 1), (4, "ENC-003-07", "Omeprazole 20 mg", "omeprazole", 20, "mg", "once daily", "2026-01-10", "active", 14), (5, "ENC-003-02", "Bismuth subsalicylate", "bismuth", 262, "mg", "as needed", "2026-01-24", "active", 3)],
        [(1, "ENC-003-01", "01-10", "assessment", "Iron deficiency anemia prompts diagnostic referral.", 1), (2, "ENC-003-03", "01-31", "procedure", "Gastric lesion biopsied and specimen sent to pathology.", 5), (3, "ENC-003-04", "02-02", "result_finalized", "Abnormal pathology result finalized and routed.", 7), (4, "ENC-003-05", "02-08", "follow_up_gap", "Follow-up note omits the finalized pathology result.", 10), (5, "ENC-003-06", "03-05", "referral_delay", "Referral remains unbooked and communication is undocumented.", 13), (6, "ENC-003-07", "04-14", "specialist_review", "Delayed specialist review discusses the result.", 14)],
        [(1, "ENC-003-04", "02-02", 7, "pathology", "Gastric biopsy pathology report", "Abnormal finding requiring clinical follow-up; no invasive malignancy identified in this specimen.")],
        {
            "case_id": "CASE-003", "dataset_version": "1.0", "synthetic_label": LABEL,
            "expected_findings": [{"finding_key": "pathology-follow-up-gap", "type": "abnormal_pathology_follow_up_gap", "required_source_ids": ["DOC-003-05", "DOC-003-07", "DOC-003-08", "DOC-003-09", "DOC-003-10", "DOC-003-14"], "expected_claim": "The gastric biopsy was finalized with an abnormal finding requiring follow-up, while routing/closure records do not establish patient discussion or timely completed follow-up.", "acceptable_outcomes": ["verified", "unresolved"], "alternatives_to_check": ["result_delivered_but_not_acknowledged", "administrative_closure_not_clinical_follow_up"], "anchors": [{"source_id": "DOC-003-07", "field": "text_content", "quote": "Final diagnosis: gastric intestinal metaplasia"}, {"source_id": "DOC-003-09", "field": "text_content", "quote": "marked reviewed/closed in the administrative queue"}, {"source_id": "DOC-003-14", "field": "text_content", "quote": "The record cannot establish when the patient first learned"}], "counterevidence": "Routing and administrative closure show workflow activity but do not prove that communication did not occur."}],
            "expected_non_findings": [{"claim": "Clinician negligence or malpractice", "source_ids": ["DOC-003-08", "DOC-003-09"], "reason": "The record cannot establish whether an undocumented review or communication occurred."}],
            "evaluation_criteria": ["Identify the abnormal pathology and final date.", "Separate routing, acknowledgment, patient discussion, and completed follow-up.", "Preserve uncertainty and avoid malpractice claims."], "acceptable_uncertainty": ["Patient communication is not established.", "Administrative closure is not proof of clinical follow-up."],
        },
        [{"id": "DX-003-01", "encounter_id": "ENC-003-01", "name": "Iron deficiency anemia", "code_system": "ICD-10-CM", "code": "D50.9", "status": "confirmed", "diagnosed_at": "2026-01-10"}],
        [{"id": "SYM-003-01", "encounter_id": "ENC-003-01", "name": "Fatigue", "onset_at": "2025-12-01T08:00:00+03:00", "severity": "moderate", "frequency": "intermittent", "status": "active", "description": "Patient-reported fatigue."}],
        [{"id": "REF-003-01", "encounter_id": "ENC-003-05", "referring_department": "Primary Care", "referred_department": "Gastroenterology", "reason": "Follow-up of gastric biopsy", "ordered_at": instant("02-08"), "appointment_at": instant("04-14"), "status": "completed"}],
        ["01-10", "02-08", "01-10", "01-24", "02-08"],
    ))
    # The remaining cases use the same explicit schema with compact authored records.
    cases.extend(make_remaining_specs())
    return cases


def make_remaining_specs() -> list[dict[str, Any]]:
    # Generated in a second function to keep each case independently reviewable.
    return [
        build_compact_case("CASE-004", "The Diagnosis That Explained Too Little", "Hypothesis challenger", "R. Patient (synthetic)", "1988-07-11", "male", "anxiety", "paroxysmal palpitations", "documented rhythm abnormality", 6, 18, 24, 5),
        build_compact_case("CASE-005", "The Missing Days of Anticoagulation", "Anticoagulant interruption and medication record conflict", "S. Patient (synthetic)", "1966-02-19", "female", "atrial fibrillation", "anticoagulation interruption", "conflicting hold and restart documentation", 7, 19, 28, 6),
        build_compact_case("CASE-006", "The Pattern Hidden Across Routine Visits", "Repeated abnormal glucose results across routine visits", "T. Patient (synthetic)", "1979-11-03", "male", "prediabetes risk", "repeated abnormal glucose", "incomplete metabolic follow-up", 7, 18, 32, 5),
    ]


def build_compact_case(case_id: str, title: str, description: str, patient_name: str, dob: str, sex: str, diagnosis: str, mystery: str, contrast: str, encounter_count: int, document_count: int, observation_count: int, medication_count: int) -> dict[str, Any]:
    encounters = [(f"ENC-{case_id[-3:]}-{i:02d}", f"{month:02d}-{day:02d}", "outpatient" if i not in (3, 5) else "specialist", "Internal Medicine" if i != 3 else "Cardiology", "Dr. Hana Tesfaye") for i, (month, day) in enumerate([(1, 8), (1, 29), (2, 12), (3, 5), (4, 16), (5, 21), (6, 18), (7, 23)][:encounter_count], 1)]
    documents: list[tuple[Any, ...]] = []
    themes = [
        f"Initial assessment documents {diagnosis} and recurring {mystery}.",
        "The working explanation is recorded, with a plan for routine follow-up.",
        f"Objective testing is ordered because symptoms or findings persist; {contrast} is not yet resolved.",
        "A contemporaneous clinical note records the patient's report and relevant negatives.",
        f"Diagnostic testing documents objective evidence relevant to {mystery}.",
        "A follow-up note compares the new evidence with the prior working diagnosis.",
        "A medication reconciliation and patient report preserve exposure uncertainty.",
        "Specialist review recommends additional evaluation without asserting a definitive diagnosis.",
        "A later visit documents whether the planned follow-up occurred.",
    ]
    kinds = ["progress_note", "progress_note", "diagnostic_order", "clinical_note", "diagnostic_report", "progress_note", "medication_reconciliation", "specialist_consult", "follow_up"]
    for number in range(1, document_count + 1):
        encounter = encounters[(number - 1) % len(encounters)][0]
        day = encounters[(number - 1) % len(encounters)][1]
        text = themes[(number - 1) % len(themes)]
        if case_id == "CASE-004" and number == 5:
            text = "Ambulatory monitor report: 14-day monitor captured three episodes of supraventricular tachycardia, maximum rate 164 bpm, with patient-triggered palpitations. This objective finding warrants reconsideration of an anxiety-only explanation; it does not establish a single final diagnosis."
        elif case_id == "CASE-005" and number in (4, 8, 12):
            text = ["Peri-procedure instruction: hold apixaban beginning 48 hours before procedure.", "Discharge medication list says apixaban resumed tonight, but the procedure service instruction still says continue holding until the next morning.", "Patient reports missing several doses but cannot recall the exact last dose; prescription status alone does not establish exposure."][((number // 4) - 1) % 3]
        elif case_id == "CASE-006" and number in (5, 10, 15):
            text = ["Fasting glucose 112 mg/dL; HbA1c 6.0%.", "Random glucose 168 mg/dL during an acute respiratory illness; fasting status unknown.", "Fasting glucose 118 mg/dL and HbA1c 6.1%; repeat metabolic follow-up is recommended."][((number // 5) - 1) % 3]
        documents.append(doc(number, encounter, day, kinds[(number - 1) % len(kinds)], f"{title} record {number}", text))
    if case_id == "CASE-004":
        base = [("TSH", 2.1, "mIU/L", 0.4, 4.0), ("Hemoglobin", 13.8, "g/dL", 12.0, 17.0), ("Potassium", 4.3, "mmol/L", 3.5, 5.1)]
    elif case_id == "CASE-005":
        base = [("Creatinine", 0.9, "mg/dL", 0.6, 1.1), ("Hemoglobin", 13.1, "g/dL", 12.0, 16.0), ("Platelets", 221, "10^9/L", 150, 400), ("INR", 1.1, "ratio", 0.8, 1.2)]
    else:
        base = [("Glucose", 112, "mg/dL", 70, 99), ("HbA1c", 6.0, "%", 4.0, 5.6), ("Creatinine", 0.9, "mg/dL", 0.6, 1.1), ("Triglycerides", 182, "mg/dL", 0, 149)]
    panels = []
    for panel_number in range(1, max(5, observation_count // len(base)) + 1):
        encounter = encounters[(panel_number - 1) % len(encounters)][0]
        day = encounters[(panel_number - 1) % len(encounters)][1]
        document_number = min(document_count, panel_number * 2)
        panel_values = [(name, value + (panel_number - 1) * (2 if name in ("Glucose", "HbA1c") else 0), unit, low, high) for name, value, unit, low, high in base]
        panels.append(panel(panel_number, encounter, day, document_number, panel_values))
    medications = []
    med_name = "Apixaban 5 mg" if case_id == "CASE-005" else ("Metformin 500 mg" if case_id == "CASE-006" else "Propranolol 10 mg")
    generic = med_name.split()[0].lower()
    for number in range(1, medication_count + 1):
        encounter = encounters[(number - 1) % len(encounters)][0]
        medications.append((number, encounter, med_name, generic, 5 if case_id == "CASE-005" else 10, "mg", "twice daily" if case_id == "CASE-005" else "as needed", "2026-01-08", "active" if number % 3 else "held", min(document_count, number)))
    events = [(i, encounters[(i - 1) % len(encounters)][0], encounters[(i - 1) % len(encounters)][1], "assessment", themes[(i - 1) % len(themes)], min(document_count, i)) for i in range(1, min(8, encounter_count) + 1)]
    reports = [(i, encounters[(i - 1) % len(encounters)][0], encounters[(i - 1) % len(encounters)][1], min(document_count, i * 2), "laboratory", f"{title} laboratory report {i}", "Final results; interpret with clinical context.") for i in range(1, min(5, len(panels)) + 1)]
    answer = {"case_id": case_id, "dataset_version": "1.0", "synthetic_label": LABEL, "expected_findings": [{"finding_key": f"{case_id.lower()}-primary", "type": mystery.replace(" ", "_"), "required_source_ids": [f"DOC-{case_id[-3:]}-05", f"DOC-{case_id[-3:]}-08", f"DOC-{case_id[-3:]}-10"], "expected_claim": f"Records across encounters show {contrast}; objective evidence supports further investigation while preserving uncertainty.", "acceptable_outcomes": ["verified", "unresolved"], "alternatives_to_check": ["documentation_delay", "alternative_explanation"], "anchors": [{"source_id": f"DOC-{case_id[-3:]}-05", "field": "text_content", "quote": "Objective testing"}], "counterevidence": "The record does not establish a definitive alternative diagnosis or causal attribution."}], "expected_non_findings": [{"claim": "Definitive causal diagnosis", "source_ids": [f"DOC-{case_id[-3:]}-08"], "reason": "The records support an unresolved question rather than a definitive diagnosis."}], "evaluation_criteria": ["Retrieve records across encounters.", "Compare objective evidence with the working explanation.", "Preserve uncertainty and cite source IDs."], "acceptable_uncertainty": ["Actual exposure or diagnosis may remain unresolved."]}
    diagnoses = [{"id": f"DX-{case_id[-3:]}-01", "encounter_id": encounters[0][0], "name": diagnosis, "code_system": "SNOMED-CT", "code": "23924001", "status": "provisional", "diagnosed_at": "2026-01-08"}]
    symptoms = [{"id": f"SYM-{case_id[-3:]}-01", "encounter_id": encounters[0][0], "name": mystery, "onset_at": "2025-12-15T08:00:00+03:00", "severity": "moderate", "frequency": "episodic", "status": "active", "description": "Patient-reported recurring symptoms."}]
    referrals = [{"id": f"REF-{case_id[-3:]}-01", "encounter_id": encounters[min(3, len(encounters)-1)][0], "referring_department": "Internal Medicine", "referred_department": "Specialty Clinic", "reason": contrast, "ordered_at": instant(encounters[min(3, len(encounters)-1)][1]), "appointment_at": instant(encounters[-1][1]), "status": "completed"}]
    medication_dates = [encounters[(i - 1) % len(encounters)][1] for i in range(1, medication_count + 1)]
    return common_spec(case_id, title, description, patient_name, dob, sex, encounters, documents, panels, medications, events, reports, answer, diagnoses, symptoms, referrals, medication_dates)


def main() -> None:
    for spec in make_specs():
        build_case(spec)


if __name__ == "__main__":
    main()
