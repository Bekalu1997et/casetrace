"""Offline CASE-001 authoring only; never imported by hospital runtime or agents.

Run from apps/api: uv run --group case-data python ../../scripts/generate_case001.py
"""

# ruff: noqa: E501 -- Keep authored clinical paragraphs together for source review.

import argparse
import hashlib
import json
import shutil
from pathlib import Path
from xml.sax.saxutils import escape

import pymupdf
from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
LABEL = "SYNTHETIC — NOT FOR CLINICAL USE"
PATIENT = "SYN-001"
FACILITY = "Aster Vale Demonstration Clinic (fictional)"
DATES = [
    "2026-01-08",
    "2026-02-12",
    "2026-03-19",
    "2026-04-30",
    "2026-06-04",
    "2026-07-08",
    "2026-07-22",
]
CURATED_IMAGING = {
    "IMG-001-01": {
        "source_path": "cases/CASE-001/imaging/IMG-001-01.jpg",
        "asset_type": "reference_radiograph",
        "mime_type": "image/jpeg",
        "width": 2926,
        "height": 2706,
        "panel": "Figure 1a (initial/admission radiograph)",
    },
    "IMG-001-02": {
        "source_path": "cases/CASE-001/imaging/IMG-001-02.jpg",
        "asset_type": "reference_radiograph",
        "mime_type": "image/jpeg",
        "width": 784,
        "height": 732,
        "panel": "Figure 1b (six-week follow-up radiograph)",
    },
}
SOURCE_PUBLICATION = {
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10959314/",
    "title": "Recurrent pneumonia as the presenting manifestation of lung adenocarcinoma",
    "figure": "Figure 1",
    "creator": "Rao VJ, Chavan RN, Pawar RG, Soni P, Pagare PS",
    "license": "CC BY-NC-SA 4.0 (as indicated by the publication record)",
    "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "modification": "Panel crop supplied as a curated reference asset; not an examination of the simulated patient.",
}


def instant(day, clock="09:00"):
    return f"{day}T{clock}:00+03:00"


def scoped(record_id, visit):
    return {
        "id": record_id,
        "patient_id": PATIENT,
        "encounter_id": f"ENC-001-{visit:02}",
    }


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    content = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()
    path.write_bytes(content)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_case():
    case = {
        "case_id": "CASE-001",
        "version": "1.1",
        "status": "ready",
        "created_at": "2026-10-21T09:00:00+03:00",
        "updated_at": "2026-10-22T14:00:00+03:00",
        "patient": {
            "id": PATIENT,
            "synthetic_identifier": "MRN-SYN-000001",
            "display_name": "Daniel M. (synthetic)",
            "date_of_birth": "1978-10-06",
            "sex": "male",
        },
        **{
            key: []
            for key in [
                "encounters",
                "clinical_events",
                "observations",
                "medications",
                "documents",
                "imaging_studies",
                "imaging_assets",
                "referrals",
                "diagnoses",
                "symptoms",
                "diagnostic_reports",
            ]
        },
    }
    departments = [
        "Primary Care",
        "Primary Care",
        "Primary Care",
        "Primary Care",
        "Internal Medicine",
        "Urgent Assessment",
        "Respiratory Medicine",
    ]
    providers = ["Dr Mira Vale (fictional)"] * 4 + [
        "Dr Leon Ash (fictional)",
        "Dr Nia Reed (fictional)",
        "Dr Ivo Fern (fictional)",
    ]
    for visit, day in enumerate(DATES, 1):
        case["encounters"].append(
            {
                "id": f"ENC-001-{visit:02}",
                "patient_id": PATIENT,
                "encounter_type": "specialist" if visit in [5, 7] else "outpatient",
                "department": departments[visit - 1],
                "provider_name": providers[visit - 1],
                "started_at": instant(day),
                "ended_at": instant(day, "12:30"),
                "status": "completed",
            }
        )

    def document(number, visit, kind, title, text, clock="09:40", authored=None):
        record_id = f"DOC-001-{number:02}"
        case["documents"].append(
            {
                **scoped(record_id, visit),
                "document_type": kind,
                "title": title,
                "author": providers[visit - 1],
                "event_at": instant(DATES[visit - 1], clock),
                "authored_at": authored or instant(DATES[visit - 1], "12:45"),
                "mime_type": "application/pdf",
                "storage_path": f"cases/CASE-001/documents/{record_id}.pdf",
                "text_content": f"{LABEL}\n{text}",
                "metadata": {
                    "department": departments[visit - 1],
                    "synthetic_label": LABEL,
                },
            }
        )
        return record_id

    notes = [
        (
            1,
            "progress_note",
            "Primary care assessment",
            "Chief concern: Dry cough and intermittent heartburn.\nHistory: Cough present for about ten days, mainly evenings; no fever, hemoptysis or breathlessness. Never smoked. No previous lung disease. No regular medication and no previous ACE inhibitor use reported. Works at a fictional stationery office; no dust exposure reported. No known drug allergies reported.\nExamination: Temperature 36.7 C, pulse 76/min, BP 148/92 mmHg, oxygen saturation 98% on air. Chest clear. Weight 82.0 kg.\nAssessment: Recent cough with symptomatic reflux; post-viral cough also possible. Elevated office BP requires repeat assessment.\nPlan: Four-week omeprazole trial for heartburn; review persistent cough and repeat BP. Return earlier for breathlessness, blood in sputum or systemic symptoms.",
        ),
        (
            2,
            "progress_note",
            "Blood pressure and symptom review",
            "Interval history: Heartburn improved after the four-week course. Dry cough continues intermittently and has not fully settled. No dyspnea at rest, hemoptysis or fever.\nExamination: BP 152/94 mmHg after rest, pulse 78/min, oxygen saturation 98% on air. Weight 81.5 kg. Chest clear.\nAssessment: Repeated hypertension; cough of uncertain cause.\nPlan: Lisinopril 5 mg once daily prescribed, first intended dose tomorrow. Discuss possible cough as an adverse effect. Renal function and potassium sampled today; repeat at next visit. Chest radiograph requested if cough persists. Medication order is not confirmation of ingestion.",
        ),
        (
            3,
            "progress_note",
            "Persistent cough review",
            "History: Reports taking lisinopril since February 13. Cough persists, with occasional scant clear sputum. Heartburn remains better. No fever or hemoptysis.\nFindings: BP 138/86 mmHg, saturation 97% on air, weight 80.8 kg. Faint right basal crackles, no wheeze.\nAssessment: Persistent cough; chest radiograph and blood tests obtained today.\nPlan: Review finalized results; radiograph follow-up will be arranged according to report. Renal function monitoring after starting lisinopril. Return for worsening symptoms.",
        ),
        (
            4,
            "progress_note",
            "Follow-up consultation",
            "History: Cough remains daily; has reduced exercise tolerance on stairs. No fever or hemoptysis. Reports regular lisinopril use.\nExamination: BP 136/84 mmHg, saturation 97% on air, weight 79.5 kg; right basal crackles remain subtle.\nAssessment: Persistent respiratory symptoms. Repeat chest radiograph obtained today.\nPlan: Await radiology comparison. Internal medicine review requested. Patient advised to seek urgent review for breathlessness at rest or hemoptysis.",
        ),
        (
            5,
            "consultation_note",
            "Internal medicine consultation",
            "Reason for review: Cough, intermittent reflux and worry about work.\nHistory: Cough first began on May 26, 2026; no cough before then. Taking lisinopril 5 mg daily since February. Reports occasional heartburn and poor sleep when anxious. Denies fever and hemoptysis.\nExam: BP 132/82 mmHg, saturation 97% on air, weight 78.8 kg. No wheeze.\nWorking impression: ACE inhibitor-associated cough is possible; reflux and anxiety may amplify symptoms. Previous radiology documents are not attached to this consultation packet.\nPlan: Short symptom diary, trial reflux treatment for recurrent heartburn, arrange medication review and obtain prior imaging reports. No definitive etiology established.",
        ),
        (
            6,
            "emergency_note",
            "Urgent ambulatory assessment",
            "Presentation: Increasing cough, fatigue and breathlessness walking uphill. No breathlessness at rest, hemoptysis or fever. Reports ongoing lisinopril use through this morning.\nExam: Temperature 37.0 C, pulse 92/min, BP 130/80 mmHg, oxygen saturation 95% on air, weight 77.0 kg. Right basal crackles without wheeze.\nResults: Blood tests and chest radiograph obtained; see linked reports.\nAssessment: Persistent cough with weight loss and unresolved radiographic abnormality requires expedited respiratory assessment. ACE inhibitor contribution remains possible.\nPlan: Stop lisinopril today; prescribe losartan for BP. Urgent respiratory referral and CT chest requested. Stable for ambulatory follow-up after assessment; explicit return precautions given. No final diagnosis assigned.",
        ),
        (
            7,
            "specialist_note",
            "Respiratory consultation",
            "History: Persistent cough and reduced exercise tolerance. Patient reports stopping lisinopril on July 8 and taking losartan thereafter. Cough has not clearly changed over the subsequent two weeks. Reflux symptoms improved with treatment. No hemoptysis.\nExam: BP 132/84 mmHg, saturation 96% on air, weight 77.2 kg; persistent right basal crackles.\nAssessment: Etiology remains unresolved. Focal radiographic opacity and inflammatory-marker trend need further characterization. A short interval after stopping an ACE inhibitor does not settle its contribution. Anxiety may coexist and does not explain the imaging finding by itself.\nPlan: CT chest booked for July 29; no completed CT result is available in this record. Spirometry requested; no result yet. Review after imaging; urgent return for worsening breathlessness, chest pain or hemoptysis.",
        ),
    ]
    for number, (visit, kind, title, text) in enumerate(notes, 1):
        document(number, visit, kind, title, text)
    document(
        8,
        1,
        "nursing_note",
        "Initial intake",
        "Intake: Daniel M., synthetic age 47. Describes a dry cough during the past week and a half, disturbing sleep twice. Heartburn after late meals. No regular medicines reported. No known allergies reported. Never smoked. Able to walk to clinic without dyspnea.",
        "09:10",
        instant(DATES[0], "09:20"),
    )
    document(
        9,
        3,
        "administrative_note",
        "Results contact record",
        "Telephone contact at 16:00: Patient informed that chest radiograph needs repeat imaging in six weeks. Repeat radiograph due April 30, 2026. Patient acknowledged plan. No new symptoms reported during call.",
        "16:00",
        instant(DATES[2], "16:15"),
    )
    document(
        10,
        4,
        "administrative_note",
        "Scheduling review",
        "At checkout the prior repeat-radiograph task is still displayed as outstanding. Patient reports attending imaging earlier today; finalized result is not yet visible to scheduling staff. Internal medicine appointment requested. Task completion will require report reconciliation.",
        "11:00",
        instant(DATES[3], "11:10"),
    )
    document(
        11,
        6,
        "discharge_summary",
        "Ambulatory follow-up instructions",
        "Ambulatory disposition following urgent assessment. Stop lisinopril; losartan 25 mg once daily prescribed from tomorrow. Do not take both medicines together. Respiratory review booked July 22. CT requested, appointment pending. Seek urgent care for breathlessness at rest, hemoptysis, chest pain or rapid deterioration. No CT or spirometry result available today.",
        "12:15",
    )
    document(
        12,
        7,
        "nursing_note",
        "Medication reconciliation",
        "Patient reports no lisinopril since July 8 and reports taking losartan 25 mg each morning since July 9. No dispensing or administration record supplied. Omeprazole course for recurrent heartburn completed July 2; symptoms improved. No clear cough improvement yet. This is patient-reported use, not observed administration.",
        "09:15",
        instant(DATES[6], "09:25"),
    )

    # Five coherent panels, rendered directly from these same structured values.
    analytes = [
        ("HGB", "Hemoglobin", "g/dL", 13.2, 16.6),
        ("WBC", "White blood cells", "10^9/L", 3.4, 9.6),
        ("CRP", "C-reactive protein", "mg/L", 0.0, 5.0),
        ("CREAT", "Creatinine", "mg/dL", 0.74, 1.35),
        ("K", "Potassium", "mmol/L", 3.6, 5.2),
    ]
    panels = [
        (2, [14.1, 7.2, 4, 0.92, 4.2]),
        (3, [13.6, 8.0, 12, 0.96, 4.4]),
        (4, [13.1, 8.4, 18, 0.95, 4.3]),
        (6, [12.4, 9.8, 31, 0.98, 4.5]),
        (7, [12.5, 9.2, 28, 0.96, 4.4]),
    ]
    for panel, (visit, values) in enumerate(panels, 1):
        doc_id = f"DOC-001-{12 + panel:02}"
        lines = [
            "Specimen collected: " + instant(DATES[visit - 1], "09:20"),
            "Results finalized: " + instant(DATES[visit - 1], "11:00"),
            "Adult male local synthetic reference intervals; not universal clinical thresholds.",
        ]
        ids = []
        for index, ((code, name, unit, low, high), value) in enumerate(
            zip(analytes, values, strict=True), 1
        ):
            lab_id = f"LAB-001-{(panel - 1) * 5 + index:02}"
            ids.append(lab_id)
            flag = "LOW" if value < low else "HIGH" if value > high else "within interval"
            lines.append(f"{lab_id} | {name}: {value} {unit} | reference {low}-{high} | {flag}")
            case["observations"].append(
                {
                    **scoped(lab_id, visit),
                    "test_code": code,
                    "test_name": name,
                    "value_numeric": value,
                    "unit": unit,
                    "reference_range_low": low,
                    "reference_range_high": high,
                    "status": "final",
                    "specimen_collected_at": instant(DATES[visit - 1], "09:20"),
                    "reported_at": instant(DATES[visit - 1], "11:00"),
                    "source_document_id": doc_id,
                }
            )
        document(
            12 + panel,
            visit,
            "lab_report",
            "Hematology and chemistry report",
            "\n".join(lines),
            "09:20",
            instant(DATES[visit - 1], "11:05"),
        )
        case["diagnostic_reports"].append(
            {
                **scoped(f"RPT-001-L{panel}", visit),
                "report_type": "laboratory",
                "title": "Hematology and chemistry",
                "status": "final",
                "issued_at": instant(DATES[visit - 1], "11:00"),
                "document_id": doc_id,
                "observation_ids": ids,
            }
        )

    findings = [
        "Comparison: None available. Findings: Small ill-defined right lower-zone air-space opacity. No pleural effusion. Cardiomediastinal silhouette not enlarged. Impression: Nonspecific right basal opacity; inflammatory change or subsegmental atelectatic change are considerations. Repeat chest radiograph in six weeks to assess resolution.",
        "Comparison: March 19, 2026. Findings: Right lower-zone opacity persists without convincing interval clearing. No effusion or new diffuse change. Impression: Persistent nonspecific right basal opacity. Respiratory assessment and CT characterization are advised; a specific diagnosis cannot be assigned on this radiograph.",
        "Comparison: April 30, 2026. Findings: Persistent right basal opacity, slightly more conspicuous; no pleural effusion. Impression: Unresolved focal opacity. Expedite CT chest and respiratory review. Radiograph alone does not establish etiology.",
    ]
    for index, (visit, finding) in enumerate(zip([3, 4, 6], findings, strict=True), 1):
        number = 17 + index
        doc_id = document(
            number,
            visit,
            "radiology_report",
            "Chest radiograph report",
            "Exam: PA and lateral chest radiograph.\nIndication: Persistent cough.\nTechnique: Standard two-view study (fictional report).\n"
            + finding
            + "\nAny attached image is an externally sourced reference radiograph, not an examination of this simulated patient.",
            "10:00",
            instant(DATES[visit - 1], "12:00"),
        )
        case["documents"][-1]["author"] = "Dr Sera Flint, radiology (fictional)"
        study = f"IMG-001-{index:02}"
        case["imaging_studies"].append(
            {
                **scoped(study, visit),
                "modality": "X_RAY",
                "body_region": "chest",
                "performed_at": instant(DATES[visit - 1], "10:00"),
                "reported_at": instant(DATES[visit - 1], "12:00"),
                "status": "final",
                "report_document_id": doc_id,
            }
        )
        case["diagnostic_reports"].append(
            {
                **scoped(f"RPT-001-I{index}", visit),
                "report_type": "radiology",
                "title": "Chest radiograph",
                "status": "final",
                "issued_at": instant(DATES[visit - 1], "12:00"),
                "document_id": doc_id,
                "imaging_study_id": study,
                "conclusion": finding,
            }
        )
        curated = CURATED_IMAGING.get(study)
        if curated:
            case["imaging_assets"].append(
                {
                    "id": f"IMG-ASSET-001-{index:02}",
                    "imaging_study_id": study,
                    "asset_type": curated["asset_type"],
                    "mime_type": curated["mime_type"],
                    "storage_path": curated["source_path"],
                    "metadata": {
                        "width": curated["width"],
                        "height": curated["height"],
                        "synthetic_label": LABEL,
                    },
                }
            )

    document(
        21,
        1,
        "prescription",
        "Reflux prescription",
        "MED-001-01: Omeprazole 20 mg orally once daily, January 9 through February 5, 2026, for symptomatic heartburn. Ordered January 8 at 09:45 +03:00. Intended course only; administration not observed.",
        "09:45",
    )
    document(
        22,
        2,
        "prescription",
        "Blood pressure prescription",
        "MED-001-02: Lisinopril 5 mg orally once daily; intended start February 13, 2026. Ordered February 12 at 09:45 +03:00. Review potassium and renal function. Possible adverse effects including cough discussed. Prescription does not establish actual exposure.",
        "09:45",
    )
    document(
        23,
        6,
        "prescription",
        "Medication change instructions",
        "MED-001-05: Stop lisinopril on July 8, 2026 at 12:00 +03:00. MED-001-06: Losartan 25 mg orally once daily from July 9, 2026. Ordered July 8 at 12:00 +03:00. Check potassium and renal function at follow-up. These are instructions, not observed administration.",
        "12:00",
    )

    med_specs = [
        (
            1,
            1,
            "Omeprazole",
            20,
            "2026-01-09",
            "2026-02-05",
            "completed",
            21,
            "2026-01-08",
            "09:45",
        ),
        (
            2,
            2,
            "Lisinopril",
            5,
            "2026-02-13",
            None,
            "ordered",
            22,
            "2026-02-12",
            "09:45",
        ),
        (3, 3, "Lisinopril", 5, "2026-02-13", None, "active", 3, None, None),
        (
            4,
            5,
            "Omeprazole",
            20,
            "2026-06-05",
            "2026-07-02",
            "ordered",
            5,
            "2026-06-04",
            "09:40",
        ),
        (
            5,
            6,
            "Lisinopril",
            5,
            "2026-02-13",
            "2026-07-08",
            "discontinued",
            23,
            None,
            None,
        ),
        (
            6,
            6,
            "Losartan",
            25,
            "2026-07-09",
            None,
            "ordered",
            23,
            "2026-07-08",
            "12:00",
        ),
        (7, 7, "Losartan", 25, "2026-07-09", None, "active", 12, None, None),
    ]
    for (
        number,
        visit,
        name,
        dose,
        start,
        end,
        status,
        source,
        ordered_day,
        clock,
    ) in med_specs:
        case["medications"].append(
            {
                **scoped(f"MED-001-{number:02}", visit),
                "medication_name": name,
                "generic_name": name.lower(),
                "dose": dose,
                "dose_unit": "mg",
                "route": "oral",
                "frequency": "once_daily",
                "start_at": start,
                "end_at": end,
                "status": status,
                "prescriber": providers[visit - 1] if ordered_day else None,
                "ordered_at": instant(ordered_day, clock) if ordered_day else None,
                "source_document_id": f"DOC-001-{source:02}",
            }
        )
    # Explicit source narrative for the June prescription, rather than an invented order source.
    case["documents"][4]["text_content"] += (
        "\nPrescription MED-001-04: Omeprazole 20 mg orally once daily from June 5 through July 2, ordered today at 09:40 +03:00 for recurrent heartburn."
    )
    event_specs = [
        (
            1,
            "symptom",
            "2026-01-08",
            "09:10",
            8,
            "Patient reports dry cough for about ten days.",
        ),
        (
            2,
            "medication_change",
            "2026-02-12",
            "09:45",
            22,
            "Lisinopril prescribed; intended start February 13, ingestion not observed.",
        ),
        (
            3,
            "test_result",
            "2026-03-19",
            "12:00",
            18,
            "Chest radiograph report finalized with right basal opacity.",
        ),
        (
            3,
            "follow_up",
            "2026-03-19",
            "16:00",
            9,
            "Repeat chest radiograph due April 30; patient informed.",
        ),
        (
            4,
            "procedure",
            "2026-04-30",
            "10:00",
            19,
            "Repeat chest radiograph performed.",
        ),
        (
            5,
            "clinical_observation",
            "2026-06-04",
            "09:40",
            5,
            "Consultation records cough onset as May 26, with possible medication or reflux contribution.",
        ),
        (
            6,
            "medication_change",
            "2026-07-08",
            "12:00",
            23,
            "Lisinopril discontinued; losartan prescribed from July 9.",
        ),
        (
            7,
            "follow_up",
            "2026-07-22",
            "09:40",
            7,
            "CT chest booked for July 29; no completed CT or spirometry result in supplied record.",
        ),
    ]
    for number, (visit, kind, day, clock, source, description) in enumerate(event_specs, 1):
        case["clinical_events"].append(
            {
                **scoped(f"EVT-001-{number:02}", visit),
                "event_type": kind,
                "occurred_at": instant(day, clock),
                "documented_at": instant(day, "16:15") if source == 9 else instant(day, "12:45"),
                "description": description,
                "source_document_id": f"DOC-001-{source:02}",
            }
        )
    case["referrals"] = [
        {
            **scoped("REF-001-01", 4),
            "referring_department": "Primary Care",
            "referred_department": "Internal Medicine",
            "reason": "Persistent cough and unresolved imaging finding",
            "ordered_at": instant(DATES[3], "10:45"),
            "appointment_at": instant(DATES[4]),
            "status": "completed",
        },
        {
            **scoped("REF-001-02", 6),
            "referring_department": "Urgent Assessment",
            "referred_department": "Respiratory Medicine",
            "reason": "Persistent opacity, cough, weight loss and reduced exercise tolerance",
            "ordered_at": instant(DATES[5], "12:00"),
            "appointment_at": instant(DATES[6]),
            "status": "completed",
        },
    ]
    case["diagnoses"] = [
        {
            **scoped("DX-001-01", 1),
            "name": "Symptomatic gastroesophageal reflux",
            "status": "provisional",
            "diagnosed_at": DATES[0],
        },
        {
            **scoped("DX-001-02", 2),
            "name": "Hypertension",
            "status": "confirmed",
            "diagnosed_at": DATES[1],
        },
        {
            **scoped("DX-001-03", 5),
            "name": "ACE inhibitor-associated cough",
            "status": "suspected",
            "diagnosed_at": DATES[4],
        },
    ]
    case["symptoms"] = [
        {
            **scoped("SYM-001-01", 1),
            "name": "Cough",
            "status": "active",
            "description": "Reported as present for about ten days at January 8 encounter; exact onset not established.",
        }
    ]
    return case


def render_pdf(path, case, doc):
    path.parent.mkdir(parents=True, exist_ok=True)
    rl_config.invariant = 1
    styles = getSampleStyleSheet()
    styles["BodyText"].fontSize = 10
    styles["BodyText"].leading = 14
    body = [
        Paragraph(escape(FACILITY), styles["Title"]),
        Paragraph(escape(doc["title"]), styles["Heading2"]),
    ]
    header = [
        f"Patient: {case['patient']['display_name']} | ID: {PATIENT} | DOB: 1978-10-06",
        f"Encounter: {doc['encounter_id']} | Source: {doc['id']} | Type: {doc['document_type']}",
        f"Clinical time: {doc['event_at']}",
        f"Documented: {doc['authored_at']} | Author: {doc['author']}",
    ]
    for line in header:
        body.append(Paragraph(escape(line), styles["BodyText"]))
    body.append(Spacer(1, 6 * mm))
    for line in doc["text_content"].splitlines():
        body.append(Paragraph(escape(line), styles["BodyText"]))
        body.append(Spacer(1, 2 * mm))

    def footer(canvas, document):
        canvas.setFillColor(colors.HexColor("#9c2535"))
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(18 * mm, 14 * mm, LABEL)
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(192 * mm, 14 * mm, f"{doc['id']} | Page {document.page}")

    SimpleDocTemplate(
        str(path),
        pagesize=(210 * mm, 297 * mm),
        topMargin=18 * mm,
        bottomMargin=24 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        title=doc["title"],
        author=FACILITY,
    ).build(body, onFirstPage=footer, onLaterPages=footer)


def evaluation(case, manifest):
    return {
        "case_id": "CASE-001",
        "dataset_version": "1.1",
        "synthetic_label": LABEL,
        "blueprint": {
            "background": "Fictional 47-year-old man, never smoker, reflux symptoms and newly confirmed hypertension.",
            "presenting_complaint": "Cough already present January 8; progressively limiting through July.",
            "working_diagnosis": "Initial reflux/post-viral possibility; later ACE inhibitor contribution, reflux and anxiety considered.",
            "encounters": [{"id": r["id"], "date": r["started_at"]} for r in case["encounters"]],
            "medication_timeline": "Lisinopril ordered February 12, intended February 13; use reported March 19 and July 8. Stop July 8; losartan thereafter by patient report. No administration proof.",
            "laboratory_trend": "CRP 4, 12, 18, 31, 28 mg/L; HGB 14.1, 13.6, 13.1, 12.4, 12.5 g/dL. Nonspecific; no etiologic diagnosis.",
            "imaging": "Right basal opacity March 19, persistent April 30 and July 8. CT booked July 29, beyond dataset cutoff.",
            "follow_up": "April 30 repeat imaging completed even though scheduling task still outstanding; report not yet finalized at scheduling review.",
            "turning_point": "July 8 symptom progression, weight loss and unresolved focal opacity prompt expedited referral.",
            "ground_truth_interpretation": "June history conflicts with contemporaneous January and March symptom records. Cough predates lisinopril prescription; medication contribution to persistence is still possible. Underlying etiology is unresolved. No proven malpractice, malignancy, infection or causal harm.",
        },
        "expected_findings": [
            {
                "finding_key": "timeline-contradiction-1",
                "type": "temporal_conflict",
                "required_source_ids": [
                    "DOC-001-01",
                    "DOC-001-08",
                    "DOC-001-03",
                    "DOC-001-05",
                    "DOC-001-22",
                    "MED-001-02",
                ],
                "expected_claim": "June consultation states cough first began May 26 with none before; contemporaneous January 8 and March 19 records establish earlier cough, including before lisinopril was prescribed.",
                "acceptable_outcomes": ["verified"],
                "alternatives_to_check": [
                    "documentation_delay",
                    "timestamp_precision",
                    "history transcription",
                    "new episode versus persistent symptoms",
                ],
                "anchors": [
                    {
                        "source_id": "DOC-001-01",
                        "field": "text_content",
                        "quote": "Cough present for about ten days",
                    },
                    {
                        "source_id": "DOC-001-03",
                        "field": "text_content",
                        "quote": "Cough persists",
                    },
                    {
                        "source_id": "DOC-001-05",
                        "field": "text_content",
                        "quote": "Cough first began on May 26, 2026; no cough before then.",
                    },
                    {
                        "source_id": "MED-001-02",
                        "field": "ordered_at",
                        "value": instant("2026-02-12", "09:45"),
                    },
                ],
                "counterevidence": "June note may reflect erroneous or incomplete history; no proven deliberate action. January and March documentation are contemporaneous, not late July entries. No documented full resolution between visits.",
            }
        ],
        "expected_non_findings": [
            {
                "claim": "Repeat April radiograph was never performed",
                "source_ids": ["DOC-001-09", "DOC-001-10", "DOC-001-19", "IMG-001-02"],
                "reason": "Scheduling task reviewed at 11:00 before report finalized at 12:00; imaging performed at 10:00. Status lag is not evidence of absent care.",
            },
            {
                "claim": "Lisinopril definitively caused or cannot contribute to cough",
                "source_ids": ["DOC-001-01", "DOC-001-22", "DOC-001-07", "DOC-001-12"],
                "reason": "Earlier cough challenges sole-onset attribution; contribution remains uncertain. Two-week withdrawal interval is inconclusive.",
            },
            {
                "claim": "GERD or anxiety alone explains deterioration, or opacity establishes cancer/infection",
                "source_ids": [
                    "DOC-001-02",
                    "DOC-001-05",
                    "DOC-001-07",
                    "DOC-001-20",
                    "LAB-001-18",
                ],
                "reason": "Reflux improved but cough persisted; opacity and inflammatory markers nonspecific. CT, spirometry and pathology unavailable.",
            },
        ],
        "evaluation_criteria": [
            "Resolve all decisive IDs and exact quote anchors",
            "Compare original event and documentation times",
            "Cite both conflicting histories",
            "Distinguish prescription from reported use",
            "Do not infer unrecorded care or a final diagnosis",
        ],
        "acceptable_uncertainty": [
            "Precise cough onset",
            "ACE inhibitor contribution",
            "Underlying cause of opacity and inflammatory trend",
            "Outcome after July 22",
        ],
        "source_checksums": {r["id"]: r["sha256"] for r in manifest["assets"]},
        "source_publication": SOURCE_PUBLICATION,
        "clinical_review": "Pending independent expert review; automated consistency checks do not establish clinical accuracy.",
    }


def generate(root):
    case = build_case()
    case_source = root / "data/cases/CASE-001/case.json"
    asset_root = root / "data/assets"
    for doc in case["documents"]:
        render_pdf(asset_root / doc["storage_path"], case, doc)
    for asset in case["imaging_assets"]:
        destination = asset_root / asset["storage_path"]
        curated_source = ROOT / "data/assets" / asset["storage_path"]
        destination.parent.mkdir(parents=True, exist_ok=True)
        if curated_source.resolve() != destination.resolve():
            shutil.copy2(curated_source, destination)
    dump(case_source, case)
    manifest = {
        "case_id": "CASE-001",
        "version": "1.1",
        "synthetic_label": LABEL,
        "case_sha256": sha(case_source),
        "generator": "scripts/generate_case001.py",
        "counts": {k: len(v) for k, v in case.items() if isinstance(v, list)},
        "assets": [],
    }
    for record in case["documents"] + case["imaging_assets"]:
        path = asset_root / record["storage_path"]
        details = {"patient_id": PATIENT, "source_version": 1}
        if record["mime_type"] == "application/pdf":
            with pymupdf.open(path) as pdf:
                details["page_count"] = len(pdf)
            details["encounter_id"] = record["encounter_id"]
            details["event_at"] = record["event_at"]
            details["authored_at"] = record["authored_at"]
            details["linked_record_ids"] = [
                r["id"]
                for group in case.values()
                if isinstance(group, list)
                for r in group
                if r.get("source_document_id") == record["id"]
                or r.get("report_document_id") == record["id"]
                or r.get("document_id") == record["id"]
            ]
        else:
            details["imaging_study_id"] = record["imaging_study_id"]
            curated = CURATED_IMAGING[record["imaging_study_id"]]
            details["width"] = curated["width"]
            details["height"] = curated["height"]
            details["asset_type"] = curated["asset_type"]
            details["provenance"] = {
                **SOURCE_PUBLICATION,
                "panel": curated["panel"],
            }
        manifest["assets"].append(
            {
                "id": record["id"],
                "storage_path": record["storage_path"],
                "mime_type": record["mime_type"],
                "sha256": sha(path),
                "byte_size": path.stat().st_size,
                **details,
            }
        )
    dump(case_source.parent / "manifest.json", manifest)
    dump(root / "evaluation/CASE-001/answer-key.json", evaluation(case, manifest))
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate fictional CASE-001 maintenance inputs")
    parser.add_argument("--output-root", type=Path, default=ROOT)
    args = parser.parse_args()
    print(json.dumps(generate(args.output_root)["counts"], indent=2))
