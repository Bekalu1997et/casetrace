"""Generate the deterministic CASE-002 medication-reconciliation case."""

# ruff: noqa: E501 -- Keep authored clinical paragraphs together for source review.

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from typing import Any

from reportlab.lib.pagesizes import letter  # type: ignore[import-untyped]
from reportlab.pdfgen import canvas  # type: ignore[import-untyped]

ROOT = Path(__file__).resolve().parents[1]
CASE_DIR = ROOT / "data" / "cases" / "CASE-002"
ASSET_DIR = ROOT / "data" / "assets" / "cases" / "CASE-002" / "documents"
EVAL_DIR = ROOT / "evaluation" / "CASE-002"
LABEL = "SYNTHETIC - NOT FOR CLINICAL USE"
PATIENT = "SYN-002"


def ts(value: str) -> str:
    return f"2026-{value}+03:00"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pdf(path: Path, title: str, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    document = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    document.setTitle(title)
    document.setFont("Helvetica-Bold", 14)
    document.drawString(54, height - 54, "North River Synthetic Hospital")
    document.setFont("Helvetica-Bold", 11)
    document.drawString(54, height - 76, title)
    document.setFont("Helvetica", 8)
    document.drawRightString(width - 54, height - 54, LABEL)
    y = height - 108
    for paragraph in text.splitlines():
        if not paragraph:
            y -= 10
            continue
        words = paragraph.split()
        line = ""
        for word in words:
            candidate = f"{line} {word}".strip()
            if len(candidate) > 105:
                document.drawString(54, y, line)
                y -= 12
                line = word
            else:
                line = candidate
        if line:
            document.drawString(54, y, line)
            y -= 12
        if y < 54:
            document.showPage()
            document.setFont("Helvetica", 9)
            y = height - 54
    document.setFont("Helvetica-Oblique", 7)
    document.drawString(54, 36, LABEL)
    document.save()


def scoped(identifier: str, encounter: str | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {"id": identifier, "patient_id": PATIENT}
    if encounter is not None:
        result["encounter_id"] = encounter
    return result


def main() -> None:
    if CASE_DIR.exists():
        shutil.rmtree(CASE_DIR)
    if ASSET_DIR.parent.exists():
        shutil.rmtree(ASSET_DIR.parent)
    if EVAL_DIR.exists():
        shutil.rmtree(EVAL_DIR)
    CASE_DIR.mkdir(parents=True)
    ASSET_DIR.mkdir(parents=True)
    EVAL_DIR.mkdir(parents=True)

    encounters = [
        (
            "ENC-002-01",
            "outpatient",
            "Primary Care",
            "Dr. Hana Tesfaye",
            "01-08T09:00:00",
            "01-08T10:00:00",
        ),
        (
            "ENC-002-02",
            "outpatient",
            "Primary Care",
            "Dr. Hana Tesfaye",
            "02-12T09:00:00",
            "02-12T10:00:00",
        ),
        (
            "ENC-002-03",
            "emergency",
            "Emergency Medicine",
            "Dr. Samuel Kassa",
            "03-03T18:20:00",
            "03-03T23:10:00",
        ),
        (
            "ENC-002-04",
            "laboratory",
            "Clinical Laboratory",
            "M. Girma, MT",
            "03-10T08:00:00",
            "03-10T09:00:00",
        ),
        (
            "ENC-002-05",
            "outpatient",
            "Primary Care",
            "Dr. Hana Tesfaye",
            "03-18T14:00:00",
            "03-18T15:00:00",
        ),
        (
            "ENC-002-06",
            "specialist",
            "Nephrology",
            "Dr. Leila Morgan",
            "04-02T10:00:00",
            "04-02T11:00:00",
        ),
        (
            "ENC-002-07",
            "follow_up",
            "Primary Care",
            "Dr. Hana Tesfaye",
            "05-14T09:30:00",
            "05-14T10:15:00",
        ),
    ]
    encounter_records = [
        {
            "id": identifier,
            "patient_id": PATIENT,
            "encounter_type": kind,
            "department": department,
            "provider_name": provider,
            "started_at": ts(start),
            "ended_at": ts(end),
            "status": "completed",
        }
        for identifier, kind, department, provider, start, end in encounters
    ]

    documents: list[dict[str, Any]] = []
    document_text: dict[str, str] = {}

    def add_doc(
        identifier: str,
        encounter: str,
        document_type: str,
        title: str,
        author: str,
        event_at: str,
        authored_at: str,
        text: str,
    ) -> None:
        document_text[identifier] = f"{LABEL}\n{text}"
        documents.append(
            {
                **scoped(identifier, encounter),
                "document_type": document_type,
                "title": title,
                "author": author,
                "event_at": ts(event_at),
                "authored_at": ts(authored_at),
                "mime_type": "application/pdf",
                "text_content": document_text[identifier],
                "storage_path": f"cases/CASE-002/documents/{identifier}.pdf",
                "metadata": {
                    "department": next(
                        e["department"] for e in encounter_records if e["id"] == encounter
                    ),
                    "synthetic_label": LABEL,
                },
            }
        )

    add_doc(
        "DOC-002-01",
        "ENC-002-01",
        "progress_note",
        "Baseline primary care assessment",
        "Dr. Hana Tesfaye",
        "01-08T09:40:00",
        "01-08T12:10:00",
        "42-year-old with hypertension and prior borderline renal function. Patient reports taking lisinopril 20 mg every morning and amlodipine 5 mg nightly. No recent vomiting or diarrhea. Plan: continue current medicines and obtain metabolic panel.",
    )
    add_doc(
        "DOC-002-02",
        "ENC-002-01",
        "laboratory_report",
        "Baseline metabolic panel",
        "M. Girma, MT",
        "01-08T09:20:00",
        "01-08T11:00:00",
        "Creatinine 1.18 mg/dL; eGFR 58 mL/min/1.73 m2; potassium 4.6 mmol/L; sodium 139 mmol/L; BUN 20 mg/dL. Results are final.",
    )
    add_doc(
        "DOC-002-03",
        "ENC-002-02",
        "progress_note",
        "Hypertension treatment review",
        "Dr. Hana Tesfaye",
        "02-12T09:40:00",
        "02-12T12:00:00",
        "Blood pressure remains above goal. Patient reports using ibuprofen several days per week for knee pain. Lisinopril is discontinued in the prescribing plan and losartan 50 mg daily is ordered. Repeat renal panel in four weeks.",
    )
    add_doc(
        "DOC-002-04",
        "ENC-002-02",
        "medication_reconciliation",
        "Medication reconciliation at treatment review",
        "Nurse R. Ali",
        "02-12T09:15:00",
        "02-12T11:30:00",
        "Patient-reported home medicines: lisinopril 20 mg each morning, amlodipine 5 mg nightly. Patient says a new replacement medicine was discussed but has not yet started it. Lisinopril marked to stop in the plan.",
    )
    add_doc(
        "DOC-002-05",
        "ENC-002-02",
        "prescription",
        "Losartan prescription",
        "Dr. Hana Tesfaye",
        "02-12T09:45:00",
        "02-12T09:45:00",
        "Losartan 50 mg tablet, take one tablet by mouth once daily. Intended start 2026-02-13. Prescription is an order and does not establish dispensing or ingestion.",
    )
    add_doc(
        "DOC-002-06",
        "ENC-002-02",
        "medication_order",
        "Lisinopril discontinuation order",
        "Dr. Hana Tesfaye",
        "02-12T09:46:00",
        "02-12T09:46:00",
        "Lisinopril 20 mg tablet is discontinued in the electronic order list on 2026-02-12. The order status does not establish when the patient stopped taking previously supplied tablets.",
    )
    add_doc(
        "DOC-002-07",
        "ENC-002-03",
        "emergency_note",
        "Emergency visit for gastroenteritis",
        "Dr. Samuel Kassa",
        "03-03T20:10:00",
        "03-03T23:00:00",
        "Two days of poor intake and watery diarrhea. Received IV fluids. Patient states she takes lisinopril for blood pressure but is unsure of the replacement name. Avoid NSAIDs during illness. Discharge medication list imported from an outside pharmacy includes lisinopril 20 mg daily and amlodipine 5 mg nightly.",
    )
    add_doc(
        "DOC-002-08",
        "ENC-002-03",
        "medication_reconciliation",
        "Emergency medication reconciliation",
        "Nurse T. Bekele",
        "03-03T19:00:00",
        "03-03T22:20:00",
        "External medication list reviewed: lisinopril 20 mg daily marked active; losartan not visible. Patient is unable to confirm the last dose. This is a reconciliation source, not proof of administration.",
    )
    add_doc(
        "DOC-002-09",
        "ENC-002-03",
        "discharge_summary",
        "Emergency discharge summary",
        "Dr. Samuel Kassa",
        "03-03T22:45:00",
        "03-04T08:00:00",
        "Discharged after fluids with improved symptoms. Follow up with primary care for renal panel and medication reconciliation. The imported list may be outdated.",
    )
    add_doc(
        "DOC-002-10",
        "ENC-002-04",
        "laboratory_report",
        "Early March renal panel",
        "M. Girma, MT",
        "03-10T08:25:00",
        "03-10T10:00:00",
        "Creatinine 1.55 mg/dL; eGFR 41 mL/min/1.73 m2; potassium 5.2 mmol/L; sodium 137 mmol/L; BUN 31 mg/dL. Results are final.",
    )
    add_doc(
        "DOC-002-11",
        "ENC-002-05",
        "progress_note",
        "Primary care reassessment after illness",
        "Dr. Hana Tesfaye",
        "03-18T14:35:00",
        "03-18T17:00:00",
        "Renal function is worse than baseline after a diarrheal illness. Patient brought an old bottle labeled lisinopril 20 mg and says she may have taken it until the emergency visit; she cannot state how often. Losartan is listed in the clinic plan, but actual start date is uncertain. Hold NSAIDs and repeat labs.",
    )
    add_doc(
        "DOC-002-12",
        "ENC-002-05",
        "medication_reconciliation",
        "Clinic medication reconciliation",
        "Nurse R. Ali",
        "03-18T14:10:00",
        "03-18T16:30:00",
        "Patient-reported: amlodipine daily; lisinopril bottle present, use uncertain; losartan prescription present in chart, patient reports not recognizing the name. Reconciliation remains unresolved.",
    )
    add_doc(
        "DOC-002-13",
        "ENC-002-05",
        "laboratory_report",
        "Mid-March metabolic panel",
        "M. Girma, MT",
        "03-18T14:20:00",
        "03-18T16:00:00",
        "Creatinine 1.42 mg/dL; eGFR 46 mL/min/1.73 m2; potassium 4.8 mmol/L; sodium 138 mmol/L; BUN 27 mg/dL. Results are final.",
    )
    add_doc(
        "DOC-002-14",
        "ENC-002-06",
        "specialist_consult",
        "Nephrology consultation",
        "Dr. Leila Morgan",
        "04-02T10:35:00",
        "04-02T13:15:00",
        "The creatinine rise has partially improved after fluids. Possible contributors include volume depletion, NSAID exposure, and uncertain renin-angiotensin medication exposure. The available records do not establish which medicine was taken on each date. Recommend medication bottle review, avoid NSAIDs, and repeat renal panel.",
    )
    add_doc(
        "DOC-002-15",
        "ENC-002-06",
        "medication_reconciliation",
        "Nephrology medication review",
        "Dr. Leila Morgan",
        "04-02T10:20:00",
        "04-02T12:30:00",
        "Clinic list shows losartan 50 mg daily and amlodipine. Patient reports taking 'the old blood pressure pill' until early March but cannot distinguish tablets. No administration record is available.",
    )
    add_doc(
        "DOC-002-16",
        "ENC-002-06",
        "laboratory_report",
        "April renal panel",
        "M. Girma, MT",
        "04-02T10:10:00",
        "04-02T12:00:00",
        "Creatinine 1.31 mg/dL; eGFR 51 mL/min/1.73 m2; potassium 4.7 mmol/L; sodium 140 mmol/L; BUN 23 mg/dL. Results are final.",
    )
    add_doc(
        "DOC-002-17",
        "ENC-002-07",
        "progress_note",
        "Primary care follow-up",
        "Dr. Hana Tesfaye",
        "05-14T09:55:00",
        "05-14T12:00:00",
        "Patient has avoided ibuprofen and reports improved hydration. She now uses a pill organizer but still cannot confirm whether the old lisinopril tablets were taken after the February visit. Current plan lists losartan and amlodipine. Repeat labs are stable.",
    )
    add_doc(
        "DOC-002-18",
        "ENC-002-07",
        "laboratory_report",
        "May renal panel",
        "M. Girma, MT",
        "05-14T09:40:00",
        "05-14T11:00:00",
        "Creatinine 1.27 mg/dL; eGFR 53 mL/min/1.73 m2; potassium 4.5 mmol/L; sodium 139 mmol/L; BUN 21 mg/dL. Results are final.",
    )
    add_doc(
        "DOC-002-19",
        "ENC-002-05",
        "patient_instruction",
        "Medication safety instructions",
        "Dr. Hana Tesfaye",
        "03-18T14:45:00",
        "03-18T17:00:00",
        "Bring all medication containers to the next visit. Do not use non-prescribed NSAIDs while renal function is being monitored. This instruction is synthetic and does not constitute treatment advice.",
    )
    add_doc(
        "DOC-002-20",
        "ENC-002-06",
        "referral_letter",
        "Nephrology referral letter",
        "Dr. Hana Tesfaye",
        "03-20T09:00:00",
        "03-20T09:00:00",
        "Referral reason: change in creatinine with incomplete medication reconciliation after a prescription change and intercurrent diarrheal illness. Please assess renal trend and clarify documented exposure.",
    )

    observations: list[dict[str, Any]] = []

    def add_panel(
        prefix: str,
        encounter: str,
        collected: str,
        reported: str,
        values: dict[str, tuple[float, str, float, float]],
    ) -> None:
        for index, (name, (value, unit, low, high)) in enumerate(values.items(), 1):
            observation_id = f"LAB-002-{prefix}-{index:02d}"
            observations.append(
                {
                    **scoped(observation_id, encounter),
                    "test_code": name.upper().replace(" ", "_"),
                    "test_name": name,
                    "value_numeric": value,
                    "value_text": None,
                    "unit": unit,
                    "reference_range_low": low,
                    "reference_range_high": high,
                    "status": "final",
                    "specimen_collected_at": ts(collected),
                    "reported_at": ts(reported),
                    "source_document_id": f"DOC-002-{prefix_to_doc[prefix]:02d}",
                }
            )

    prefix_to_doc = {"01": 2, "02": 10, "03": 13, "04": 16, "05": 18, "06": 2, "07": 13}
    panels = [
        (
            "01",
            "ENC-002-01",
            "01-08T09:20:00",
            "01-08T11:00:00",
            {
                "Creatinine": (1.18, "mg/dL", 0.55, 1.02),
                "eGFR": (58, "mL/min/1.73 m2", 60, 120),
                "Potassium": (4.6, "mmol/L", 3.5, 5.1),
                "Sodium": (139, "mmol/L", 135, 145),
                "BUN": (20, "mg/dL", 7, 25),
            },
        ),
        (
            "02",
            "ENC-002-03",
            "03-03T19:10:00",
            "03-03T21:00:00",
            {
                "Creatinine": (1.68, "mg/dL", 0.55, 1.02),
                "eGFR": (37, "mL/min/1.73 m2", 60, 120),
                "Potassium": (5.4, "mmol/L", 3.5, 5.1),
                "Sodium": (136, "mmol/L", 135, 145),
                "BUN": (38, "mg/dL", 7, 25),
            },
        ),
        (
            "03",
            "ENC-002-05",
            "03-18T14:20:00",
            "03-18T16:00:00",
            {
                "Creatinine": (1.42, "mg/dL", 0.55, 1.02),
                "eGFR": (46, "mL/min/1.73 m2", 60, 120),
                "Potassium": (4.8, "mmol/L", 3.5, 5.1),
                "Sodium": (138, "mmol/L", 135, 145),
                "BUN": (27, "mg/dL", 7, 25),
            },
        ),
        (
            "04",
            "ENC-002-06",
            "04-02T10:10:00",
            "04-02T12:00:00",
            {
                "Creatinine": (1.31, "mg/dL", 0.55, 1.02),
                "eGFR": (51, "mL/min/1.73 m2", 60, 120),
                "Potassium": (4.7, "mmol/L", 3.5, 5.1),
                "Sodium": (140, "mmol/L", 135, 145),
                "BUN": (23, "mg/dL", 7, 25),
            },
        ),
        (
            "05",
            "ENC-002-07",
            "05-14T09:40:00",
            "05-14T11:00:00",
            {
                "Creatinine": (1.27, "mg/dL", 0.55, 1.02),
                "eGFR": (53, "mL/min/1.73 m2", 60, 120),
                "Potassium": (4.5, "mmol/L", 3.5, 5.1),
                "Sodium": (139, "mmol/L", 135, 145),
                "BUN": (21, "mg/dL", 7, 25),
            },
        ),
    ]
    for panel in panels:
        add_panel(*panel)

    medications = [
        {
            **scoped("MED-002-01", "ENC-002-01"),
            "medication_name": "Lisinopril 20 mg tablet",
            "generic_name": "lisinopril",
            "dose": 20,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "once daily",
            "start_at": "2025-06-01",
            "end_at": None,
            "status": "active",
            "prescriber": "Dr. Hana Tesfaye",
            "ordered_at": "2025-06-01T09:00:00+03:00",
            "source_document_id": "DOC-002-01",
        },
        {
            **scoped("MED-002-02", "ENC-002-02"),
            "medication_name": "Lisinopril 20 mg tablet",
            "generic_name": "lisinopril",
            "dose": 20,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "once daily",
            "start_at": "2025-06-01",
            "end_at": "2026-02-12",
            "status": "discontinued",
            "prescriber": "Dr. Hana Tesfaye",
            "ordered_at": ts("02-12T09:46:00"),
            "source_document_id": "DOC-002-06",
        },
        {
            **scoped("MED-002-03", "ENC-002-02"),
            "medication_name": "Losartan 50 mg tablet",
            "generic_name": "losartan",
            "dose": 50,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "once daily",
            "start_at": "2026-02-13",
            "end_at": None,
            "status": "ordered",
            "prescriber": "Dr. Hana Tesfaye",
            "ordered_at": ts("02-12T09:45:00"),
            "source_document_id": "DOC-002-05",
        },
        {
            **scoped("MED-002-04", "ENC-002-01"),
            "medication_name": "Amlodipine 5 mg tablet",
            "generic_name": "amlodipine",
            "dose": 5,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "once nightly",
            "start_at": "2025-06-01",
            "end_at": None,
            "status": "active",
            "prescriber": "Dr. Hana Tesfaye",
            "ordered_at": "2025-06-01T09:00:00+03:00",
            "source_document_id": "DOC-002-01",
        },
        {
            **scoped("MED-002-05", "ENC-002-03"),
            "medication_name": "Lisinopril 20 mg tablet",
            "generic_name": "lisinopril",
            "dose": 20,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "once daily",
            "start_at": "2026-02-01",
            "end_at": None,
            "status": "active",
            "prescriber": "Outside pharmacy list",
            "ordered_at": None,
            "source_document_id": "DOC-002-08",
        },
        {
            **scoped("MED-002-06", "ENC-002-03"),
            "medication_name": "Amlodipine 5 mg tablet",
            "generic_name": "amlodipine",
            "dose": 5,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "once nightly",
            "start_at": "2025-06-01",
            "end_at": None,
            "status": "active",
            "prescriber": "Outside pharmacy list",
            "ordered_at": None,
            "source_document_id": "DOC-002-08",
        },
        {
            **scoped("MED-002-07", "ENC-002-05"),
            "medication_name": "Losartan 50 mg tablet",
            "generic_name": "losartan",
            "dose": 50,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "once daily",
            "start_at": "2026-02-13",
            "end_at": None,
            "status": "active",
            "prescriber": "Dr. Hana Tesfaye",
            "ordered_at": ts("02-12T09:45:00"),
            "source_document_id": "DOC-002-12",
        },
        {
            **scoped("MED-002-08", "ENC-002-05"),
            "medication_name": "Ibuprofen 400 mg tablet",
            "generic_name": "ibuprofen",
            "dose": 400,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "as needed",
            "start_at": "2026-01-20",
            "end_at": "2026-03-03",
            "status": "unknown",
            "prescriber": "Patient-reported over-the-counter use",
            "ordered_at": None,
            "source_document_id": "DOC-002-11",
        },
        {
            **scoped("MED-002-09", "ENC-002-06"),
            "medication_name": "Losartan 50 mg tablet",
            "generic_name": "losartan",
            "dose": 50,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "once daily",
            "start_at": "2026-03-18",
            "end_at": None,
            "status": "active",
            "prescriber": "Dr. Leila Morgan",
            "ordered_at": ts("04-02T10:30:00"),
            "source_document_id": "DOC-002-15",
        },
        {
            **scoped("MED-002-10", "ENC-002-07"),
            "medication_name": "Losartan 50 mg tablet",
            "generic_name": "losartan",
            "dose": 50,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "once daily",
            "start_at": "2026-03-18",
            "end_at": None,
            "status": "active",
            "prescriber": "Dr. Hana Tesfaye",
            "ordered_at": ts("05-14T09:50:00"),
            "source_document_id": "DOC-002-17",
        },
        {
            **scoped("MED-002-11", "ENC-002-07"),
            "medication_name": "Amlodipine 5 mg tablet",
            "generic_name": "amlodipine",
            "dose": 5,
            "dose_unit": "mg",
            "route": "oral",
            "frequency": "once nightly",
            "start_at": "2025-06-01",
            "end_at": None,
            "status": "active",
            "prescriber": "Dr. Hana Tesfaye",
            "ordered_at": ts("05-14T09:50:00"),
            "source_document_id": "DOC-002-17",
        },
    ]

    clinical_events = [
        {
            **scoped("EVT-002-01", "ENC-002-01"),
            "event_type": "assessment",
            "occurred_at": ts("01-08T09:40:00"),
            "documented_at": ts("01-08T12:10:00"),
            "description": "Baseline hypertension and renal risk assessment.",
            "source_document_id": "DOC-002-01",
        },
        {
            **scoped("EVT-002-02", "ENC-002-02"),
            "event_type": "medication_change",
            "occurred_at": ts("02-12T09:45:00"),
            "documented_at": ts("02-12T12:00:00"),
            "description": "Lisinopril discontinued in the prescribing plan and losartan ordered.",
            "source_document_id": "DOC-002-03",
        },
        {
            **scoped("EVT-002-03", "ENC-002-03"),
            "event_type": "acute_illness",
            "occurred_at": ts("03-03T20:10:00"),
            "documented_at": ts("03-03T23:00:00"),
            "description": "Diarrheal illness with poor intake and emergency hydration.",
            "source_document_id": "DOC-002-07",
        },
        {
            **scoped("EVT-002-04", "ENC-002-05"),
            "event_type": "medication_discrepancy",
            "occurred_at": ts("03-18T14:35:00"),
            "documented_at": ts("03-18T17:00:00"),
            "description": "Old lisinopril bottle and uncertain reported use conflict with current clinic list.",
            "source_document_id": "DOC-002-11",
        },
        {
            **scoped("EVT-002-05", "ENC-002-06"),
            "event_type": "specialist_review",
            "occurred_at": ts("04-02T10:35:00"),
            "documented_at": ts("04-02T13:15:00"),
            "description": "Nephrology reviews partial renal recovery and multiple possible contributors.",
            "source_document_id": "DOC-002-14",
        },
        {
            **scoped("EVT-002-06", "ENC-002-07"),
            "event_type": "follow_up",
            "occurred_at": ts("05-14T09:55:00"),
            "documented_at": ts("05-14T12:00:00"),
            "description": "Renal values remain improved but above baseline; exposure history remains uncertain.",
            "source_document_id": "DOC-002-17",
        },
    ]

    reports = []
    for index, prefix in enumerate(("01", "02", "03", "04", "05"), 1):
        report_doc = f"DOC-002-{prefix_to_doc[prefix]:02d}"
        report_obs = [o["id"] for o in observations if o["source_document_id"] == report_doc]
        reports.append(
            {
                **scoped(
                    f"RPT-002-{index:02d}",
                    next(
                        e["id"]
                        for e in encounter_records
                        if e["id"] == observations[(index - 1) * 5]["encounter_id"]
                    ),
                ),
                "report_type": "laboratory",
                "title": documents[[d["id"] for d in documents].index(report_doc)]["title"],
                "status": "final",
                "issued_at": documents[[d["id"] for d in documents].index(report_doc)]["event_at"],
                "conclusion": "Final laboratory results; interpret with clinical context.",
                "document_id": report_doc,
                "observation_ids": report_obs,
                "imaging_study_id": None,
            }
        )

    case: dict[str, Any] = {
        "case_id": "CASE-002",
        "version": "1.0",
        "status": "ready",
        "title": "The Medication List That Never Caught Up",
        "description": "A synthetic longitudinal medication-reconciliation and renal laboratory investigation.",
        "created_at": ts("10-22T09:00:00"),
        "updated_at": ts("10-22T14:00:00"),
        "patient": {
            "id": PATIENT,
            "synthetic_identifier": "MRN-SYN-000002",
            "display_name": "A. Patient (synthetic)",
            "date_of_birth": "1984-07-14",
            "sex": "female",
        },
        "encounters": encounter_records,
        "clinical_events": clinical_events,
        "observations": observations,
        "medications": medications,
        "documents": documents,
        "imaging_studies": [],
        "imaging_assets": [],
        "referrals": [
            {
                **scoped("REF-002-01", "ENC-002-05"),
                "referring_department": "Primary Care",
                "referred_department": "Nephrology",
                "reason": "Creatinine change with unresolved medication reconciliation",
                "ordered_at": ts("03-20T09:00:00"),
                "appointment_at": ts("04-02T10:00:00"),
                "status": "completed",
            }
        ],
        "diagnoses": [
            {
                **scoped("DX-002-01", "ENC-002-01"),
                "name": "Essential hypertension",
                "code_system": "ICD-10-CM",
                "code": "I10",
                "status": "confirmed",
                "diagnosed_at": "2025-06-01",
            },
            {
                **scoped("DX-002-02", "ENC-002-01"),
                "name": "Chronic kidney disease risk, stage 3 range",
                "code_system": "ICD-10-CM",
                "code": "N18.3",
                "status": "provisional",
                "diagnosed_at": "2026-01-08",
            },
            {
                **scoped("DX-002-03", "ENC-002-03"),
                "name": "Volume depletion during diarrheal illness",
                "code_system": "ICD-10-CM",
                "code": "E86.0",
                "status": "resolved",
                "diagnosed_at": "2026-03-03",
            },
        ],
        "symptoms": [
            {
                **scoped("SYM-002-01", "ENC-002-03"),
                "name": "Diarrhea",
                "onset_at": ts("03-01T08:00:00"),
                "severity": "moderate",
                "frequency": "multiple episodes daily",
                "status": "resolved",
                "description": "Self-reported watery diarrhea with poor intake.",
            }
        ],
        "diagnostic_reports": reports,
    }

    for document in documents:
        file_path = ASSET_DIR / f"{document['id']}.pdf"
        pdf(file_path, document["title"], document_text[document["id"]])

    case_path = CASE_DIR / "case.json"
    case_path.write_text(json.dumps(case, indent=2) + "\n", encoding="utf-8")
    assets = []
    source_links: dict[str, list[str]] = {document["id"]: [] for document in documents}
    for record_group in ("clinical_events", "observations", "medications"):
        for record in case[record_group]:
            source_document_id = record.get("source_document_id")
            if source_document_id in source_links:
                source_links[source_document_id].append(record["id"])
    for document in documents:
        file_path = ASSET_DIR / f"{document['id']}.pdf"
        assets.append(
            {
                "id": document["id"],
                "storage_path": document["storage_path"],
                "mime_type": "application/pdf",
                "sha256": sha(file_path),
                "byte_size": file_path.stat().st_size,
                "patient_id": PATIENT,
                "source_version": 1,
                "page_count": 1,
                "encounter_id": document["encounter_id"],
                "event_at": document["event_at"],
                "authored_at": document["authored_at"],
                "linked_record_ids": sorted(
                    source_links[document["id"]]
                    + [r["id"] for r in reports if r["document_id"] == document["id"]]
                ),
            }
        )
    manifest = {
        "case_id": "CASE-002",
        "version": "1.0",
        "synthetic_label": LABEL,
        "case_sha256": sha(case_path),
        "generator": "scripts/generate_case002.py",
        "counts": {
            key: len(case[key]) if isinstance(case[key], list) else 1
            for key in (
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
            )
        },
        "assets": assets,
    }
    (CASE_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    answer_key = {
        "case_id": "CASE-002",
        "dataset_version": "1.0",
        "synthetic_label": LABEL,
        "expected_findings": [
            {
                "finding_key": "medication-reconciliation-discrepancy-1",
                "type": "medication_reconciliation_discrepancy",
                "required_source_ids": [
                    "DOC-002-03",
                    "DOC-002-06",
                    "DOC-002-07",
                    "DOC-002-11",
                    "DOC-002-14",
                ],
                "expected_claim": "The February prescribing record discontinued lisinopril and ordered losartan, but later emergency and primary-care records retain or report lisinopril exposure with uncertain timing; the records establish a documentation discrepancy, not confirmed ingestion.",
                "acceptable_outcomes": ["verified", "unresolved"],
                "alternatives_to_check": [
                    "documentation_delay",
                    "patient_report_uncertain",
                    "outside_pharmacy_list_stale",
                ],
                "anchors": [
                    {
                        "source_id": "DOC-002-06",
                        "field": "text_content",
                        "quote": "Lisinopril 20 mg tablet is discontinued in the electronic order list",
                    },
                    {
                        "source_id": "DOC-002-07",
                        "field": "text_content",
                        "quote": "Discharge medication list imported from an outside pharmacy includes lisinopril 20 mg daily",
                    },
                    {
                        "source_id": "DOC-002-11",
                        "field": "text_content",
                        "quote": "Patient brought an old bottle labeled lisinopril 20 mg",
                    },
                ],
                "counterevidence": "The patient could not confirm the last dose, and no administration or dispensing record proves ingestion.",
            },
            {
                "finding_key": "renal-trend-1",
                "type": "laboratory_trend",
                "required_source_ids": [
                    "DOC-002-02",
                    "DOC-002-10",
                    "DOC-002-13",
                    "DOC-002-16",
                    "DOC-002-18",
                ],
                "expected_claim": "Creatinine rose from 1.18 mg/dL at baseline to 1.68 mg/dL during the diarrheal illness, then partially improved to 1.27 mg/dL; potassium was transiently elevated and later normalized.",
                "acceptable_outcomes": ["verified"],
                "alternatives_to_check": [
                    "volume_depletion",
                    "NSAID_exposure",
                    "renin_angiotensin_exposure",
                ],
                "anchors": [
                    {
                        "source_id": "DOC-002-02",
                        "field": "text_content",
                        "quote": "Creatinine 1.18 mg/dL",
                    },
                    {
                        "source_id": "DOC-002-10",
                        "field": "text_content",
                        "quote": "Creatinine 1.55 mg/dL",
                    },
                    {
                        "source_id": "DOC-002-18",
                        "field": "text_content",
                        "quote": "Creatinine 1.27 mg/dL",
                    },
                ],
                "counterevidence": "The renal trend overlaps with poor intake, diarrhea, and reported NSAID exposure; causation is not established.",
            },
        ],
        "expected_non_findings": [
            {
                "claim": "Definitive medication-induced kidney injury",
                "source_ids": ["DOC-002-14"],
                "reason": "Specialist documentation lists multiple plausible contributors and explicitly preserves uncertainty.",
            },
            {
                "claim": "Confirmed lisinopril ingestion after discontinuation",
                "source_ids": ["DOC-002-11"],
                "reason": "Patient report and an old bottle indicate possible exposure but do not prove ingestion dates.",
            },
        ],
        "evaluation_criteria": [
            "Find the cross-record medication discrepancy.",
            "Verify the structured renal laboratory trend.",
            "Separate order, reconciliation, patient report, and ingestion.",
            "Represent volume depletion and NSAID exposure as competing contributors.",
            "Cite source IDs and preserve uncertainty.",
        ],
        "acceptable_uncertainty": [
            "The exact last lisinopril dose is unknown.",
            "Dispensing and administration are not available.",
            "Causality between any medicine and renal change is unproven.",
        ],
        "source_checksums": {
            asset["id"]: asset["sha256"]
            for asset in assets
            if asset["id"]
            in {
                "DOC-002-02",
                "DOC-002-03",
                "DOC-002-06",
                "DOC-002-07",
                "DOC-002-10",
                "DOC-002-11",
                "DOC-002-13",
                "DOC-002-14",
                "DOC-002-16",
                "DOC-002-18",
            }
        },
        "clinical_review": "Synthetic data consistency review only; no independent medical expert validation was performed.",
    }
    (EVAL_DIR / "answer-key.json").write_text(
        json.dumps(answer_key, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
