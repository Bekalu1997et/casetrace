"""Maintenance-only source validation. Never imported by agent code."""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from app.hospital.assets import AssetInfo, LocalAssetStorage
from app.hospital.schemas import ClinicalCase, ImagingAsset

# These sections are explicitly evaluator/editor-only. Never persist or serve them.
EDITOR_FIELDS = {
    "title",
    "description",
    "metadata",
    "ground_truth",
    "investigation_target",
    "timeline_relationships",
    "evidence_relationships",
    "red_herrings",
    "noise",
}


class CaseValidationError(ValueError):
    pass


@dataclass(frozen=True)
class ValidatedCase:
    clinical: ClinicalCase
    assets: dict[str, AssetInfo]


def validate_case(path: Path, storage: LocalAssetStorage) -> ValidatedCase:
    try:
        raw: Any = json.loads(path.read_text(encoding="utf-8-sig"))
        if not isinstance(raw, dict):
            raise ValueError("case root must be an object")
        clinical = ClinicalCase.model_validate(
            {key: value for key, value in raw.items() if key not in EDITOR_FIELDS}
        )
        if clinical.status != "ready":
            raise ValueError("only ready clinical cases can be ingested")
        groups: list[list[Any]] = [
            clinical.encounters,
            clinical.documents,
            clinical.clinical_events,
            clinical.observations,
            clinical.medications,
            clinical.imaging_studies,
            clinical.imaging_assets,
            clinical.referrals,
            clinical.diagnoses,
            clinical.symptoms,
            clinical.diagnostic_reports,
        ]
        all_ids = [clinical.patient.id] + [r.id for group in groups for r in group]
        if len(set(all_ids)) != len(all_ids):
            raise ValueError("duplicate canonical record ID")
        encounters = {r.id for r in clinical.encounters}
        documents = {r.id for r in clinical.documents}
        studies = {r.id for r in clinical.imaging_studies}
        for group in groups:
            for record in group:
                if hasattr(record, "patient_id") and record.patient_id != clinical.patient.id:
                    raise ValueError(f"{record.id}: patient_id does not match case patient")
                encounter = getattr(record, "encounter_id", None)
                if encounter is not None and encounter not in encounters:
                    raise ValueError(f"{record.id}: encounter_id {encounter} does not exist")
                source = getattr(record, "source_document_id", None)
                report = getattr(record, "report_document_id", None)
                for reference in [source, report]:
                    if reference is not None and reference not in documents:
                        raise ValueError(f"{record.id}: source document {reference} does not exist")
        observations = {record.id for record in clinical.observations}
        for report in clinical.diagnostic_reports:
            if report.document_id is not None and report.document_id not in documents:
                raise ValueError(f"{report.id}: document_id does not exist")
            if report.imaging_study_id is not None and report.imaging_study_id not in studies:
                raise ValueError(f"{report.id}: imaging_study_id does not exist")
            if len(set(report.observation_ids)) != len(report.observation_ids):
                raise ValueError(f"{report.id}: duplicate observation link")
            for reference in report.observation_ids:
                if reference not in observations:
                    raise ValueError(f"{report.id}: observation {reference} does not exist")
        assets = {}
        for record in clinical.documents + clinical.imaging_assets:
            if isinstance(record, ImagingAsset):
                if record.imaging_study_id not in studies:
                    raise ValueError(f"{record.id}: imaging_study_id does not exist")
            key = record.storage_path
            if key:
                try:
                    assets[record.id] = storage.inspect(key, clinical.case_id, record.mime_type)
                except ValueError as exc:
                    raise ValueError(f"{record.id}: {exc}") from exc
        return ValidatedCase(clinical, assets)
    except (OSError, ValueError, ValidationError) as exc:
        raise CaseValidationError(f"{path}: {exc}") from exc
