"""Offline dataset/asset/evaluator checks, beyond the runtime ingestion validator."""

import argparse
import hashlib
import json
import sys
from datetime import date, datetime
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from app.hospital.assets import LocalAssetStorage  # noqa: E402
from app.hospital.validation import validate_case  # noqa: E402


def require(condition, message):
    if not condition:
        raise ValueError(message)


def normalized(text):
    return " ".join(text.split())


def validate(root):
    source = root / "data/cases/CASE-001/case.json"
    asset_root = root / "data/assets"
    validated = validate_case(source, LocalAssetStorage(asset_root))
    case = json.loads(source.read_text(encoding="utf-8"))
    manifest = json.loads((source.parent / "manifest.json").read_text(encoding="utf-8"))
    key = json.loads((root / "evaluation/CASE-001/answer-key.json").read_text(encoding="utf-8"))
    require(
        hashlib.sha256(source.read_bytes()).hexdigest() == manifest["case_sha256"],
        "case checksum mismatch",
    )
    require(
        manifest["version"] == case["version"] == key["dataset_version"],
        "version mismatch",
    )
    groups = [v for v in case.values() if isinstance(v, list)]
    records = {r["id"]: r for group in groups for r in group}
    records[case["patient"]["id"]] = case["patient"]
    require(
        manifest["counts"] == {k: len(v) for k, v in case.items() if isinstance(v, list)},
        "manifest counts mismatch",
    )
    require(
        set(validated.assets) == {r["id"] for r in manifest["assets"]},
        "asset registry mismatch",
    )
    pages = 0
    for entry in manifest["assets"]:
        info = validated.assets[entry["id"]]
        require(
            info.sha256 == entry["sha256"] == key["source_checksums"][entry["id"]],
            "asset checksum mismatch",
        )
        require(info.byte_size == entry["byte_size"], "asset size mismatch")
        path = asset_root / entry["storage_path"]
        record = records[entry["id"]]
        require(entry["patient_id"] == case["patient"]["id"], "manifest patient mismatch")
        require(
            all(r in records for r in entry.get("linked_record_ids", [])),
            "manifest source link missing",
        )
        if entry["mime_type"] == "application/pdf":
            with pymupdf.open(path) as pdf:
                require(len(pdf) > 0, "empty PDF")
                require(len(pdf) == entry["page_count"], "manifest page count mismatch")
                text = "\n".join(page.get_text() for page in pdf)
                for page in pdf:
                    require(
                        "NOT FOR CLINICAL USE" in page.get_text(),
                        "missing per-page label",
                    )
                    # Decode and render each page, not just its magic bytes.
                    pix = page.get_pixmap(matrix=pymupdf.Matrix(1, 1))
                    require(pix.width > 500 and pix.height > 700, "PDF render failed")
                    for block in page.get_text("blocks"):
                        require(
                            block[0] >= 0
                            and block[1] >= 0
                            and block[2] <= page.rect.width
                            and block[3] <= page.rect.height,
                            "PDF text clips outside page",
                        )
                require(
                    normalized(record["text_content"]) in normalized(text),
                    f"PDF content mismatch: {record['id']}",
                )
                for value in [
                    record["id"],
                    record["encounter_id"],
                    case["patient"]["id"],
                    case["patient"]["date_of_birth"],
                ]:
                    require(value in text, f"PDF identity mismatch: {value}")
                pages += len(pdf)
        else:
            with Image.open(path) as image:
                image.load()
                require(
                    image.format == "PNG"
                    and image.size == (record["metadata"]["width"], record["metadata"]["height"]),
                    "invalid image dimensions/type",
                )
    for doc in case["documents"]:
        require(
            datetime.fromisoformat(doc["event_at"]) <= datetime.fromisoformat(doc["authored_at"]),
            "document chronology",
        )
        require("SYNTHETIC" in doc["text_content"], "missing synthetic label")
    for med in case["medications"]:
        if med["ordered_at"]:
            require(
                datetime.fromisoformat(med["ordered_at"]).date()
                <= date.fromisoformat(med["start_at"]),
                "medication ordered after start",
            )
    for study in case["imaging_studies"]:
        report = records[study["report_document_id"]]
        require(
            study["performed_at"] <= study["reported_at"] == report["authored_at"],
            "imaging/report chronology",
        )
        require(
            study["encounter_id"] == report["encounter_id"],
            "imaging/report encounter mismatch",
        )
    for report in case["diagnostic_reports"]:
        for observation_id in report.get("observation_ids", []):
            lab = records[observation_id]
            require(
                lab["source_document_id"] == report["document_id"]
                and lab["encounter_id"] == report["encounter_id"],
                "lab report linkage mismatch",
            )
            require(
                lab["reported_at"] == report["issued_at"],
                "lab report issue time mismatch",
            )
    # Case-specific checks are evaluator checks, never a runtime contradiction detector.
    for finding in key["expected_findings"]:
        require(
            all(r in records for r in finding["required_source_ids"]),
            "unresolved gold evidence",
        )
        for anchor in finding["anchors"]:
            actual = records[anchor["source_id"]][anchor["field"]]
            require(
                anchor["quote"] in actual if "quote" in anchor else actual == anchor["value"],
                "gold anchor mismatch",
            )
    for non_finding in key["expected_non_findings"]:
        require(
            all(r in records for r in non_finding["source_ids"]),
            "unresolved counterevidence",
        )
    require(
        records["DOC-001-01"]["authored_at"]
        < records["MED-001-02"]["ordered_at"]
        < records["DOC-001-05"]["event_at"],
        "decisive temporal chain changed",
    )
    require(
        "no cough before then" in records["DOC-001-05"]["text_content"],
        "missing conflicting history",
    )
    require(
        records["IMG-001-02"]["performed_at"]
        < records["DOC-001-10"]["event_at"]
        < records["IMG-001-02"]["reported_at"],
        "follow-up status lag not supported",
    )
    crp = [r["value_numeric"] for r in case["observations"] if r["test_code"] == "CRP"]
    require(crp == [4, 12, 18, 31, 28], "inflammatory trend changed")
    for lab in case["observations"]:
        doc = records[lab["source_document_id"]]
        expected = f"{lab['id']} | {lab['test_name']}: {lab['value_numeric']} {lab['unit']}"
        require(expected in doc["text_content"], "lab narrative/value mismatch")
    for ref in case["referrals"]:
        require(ref["ordered_at"] <= ref["appointment_at"], "referral chronology")
    require(
        not set(case) & {"ground_truth", "expected_findings", "investigation_target"},
        "evaluation fields in clinical source",
    )
    return {
        "case_id": "CASE-001",
        "status": "valid",
        "assets": len(validated.assets),
        "pdf_pages_rendered": pages,
        "counts": manifest["counts"],
        "clinical_review": "pending independent expert review",
        "investigation_replay": "not implemented; dataset readiness only",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    try:
        result = validate(args.root)
    except (ValueError, OSError, KeyError) as exc:
        parser.exit(2, f"CASE-001 validation failed: {exc}\n")
    output = json.dumps(result, indent=2) + "\n"
    if args.report:
        args.report.write_text(output, encoding="utf-8")
    print(output, end="")
