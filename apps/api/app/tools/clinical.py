"""Hospital service adapters. No raw case files or evaluator dependencies."""

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel

from app.core.database import Database
from app.hospital.asset_service import ClinicalAssetService, verified_asset_path
from app.hospital.repository import HospitalRepository
from app.hospital.service import RESOURCES, ClinicalRecordService, HospitalError
from app.orchestration.store import digest
from app.schemas.investigation import SourceRecord, SourceRef, SourceType, ToolInput, ToolResult

RESOURCE_TYPES = {
    "encounter": "encounters",
    "clinical_event": "clinical-events",
    "observation": "observations",
    "medication": "medications",
    "document": "documents",
    "imaging_study": "imaging-studies",
    "referral": "referrals",
    "diagnostic_report": "diagnostic-reports",
    "diagnosis": "diagnoses",
    "symptom": "symptoms",
}


class ClinicalTools:
    def __init__(self, database: Database, asset_root: Any):
        self.database, self.asset_root = database, asset_root

    async def resolve(self, patient_id: str, source: SourceRef) -> SourceRecord:
        async with self.database.session() as session:
            repo = HospitalRepository(session)
            service = ClinicalRecordService(repo)
            patient = await service.patient(patient_id)
            if source.type == "imaging_asset":
                metadata, version = await ClinicalAssetService(repo).metadata(patient_id, source.id)
                data = metadata.model_dump(mode="json")
                return SourceRecord(
                    source=source, source_version=version, source_hash=digest(data), data=data
                )
            row: Any
            dto: BaseModel
            if source.type == "patient":
                if source.id != patient_id:
                    raise HospitalError()
                row, dto = patient, await service.patient_dto(patient)
            else:
                resource = RESOURCE_TYPES[source.type]
                row = await repo.get(RESOURCES[resource][1], source.id)
                if row is None or row.patient_id != patient.id:
                    raise HospitalError()
                dto = await service.project(resource, row)
            data = dto.model_dump(mode="json")
            result = SourceRecord(
                source=source,
                source_version=row.source_version,
                source_hash=digest(data),
                data=data,
            )
            descriptor = None
            if source.type == "document" and data.get("has_asset"):
                descriptor = await ClinicalAssetService(repo).document(source.id)
        if descriptor:
            await verified_asset_path(self.asset_root, descriptor)
        return result

    async def list_records(self, source_type: SourceType, args: ToolInput) -> ToolResult:
        async with self.database.session() as session:
            service = ClinicalRecordService(HospitalRepository(session))
            filters = args.model_dump(exclude_none=True)
            # Tool-only identifiers/search are never forwarded as DTO equality filters.
            for key in ["patient_id", "record_id", "other_id", "query"]:
                filters.pop(key, None)
            rows, total = await service.list_records(
                RESOURCE_TYPES[source_type],
                args.patient_id,
                filters,
            )
            ids = [str(row.model_dump()["id"]) for row in rows]
        records = [
            await self.resolve(args.patient_id, SourceRef(type=source_type, id=id_)) for id_ in ids
        ]
        return result_for(records, total, args.offset)


def result_for(records: list[SourceRecord], total: int, offset: int = 0) -> ToolResult:
    more = offset + len(records) < total
    return ToolResult(
        status="partial" if more else "success" if records else "empty",
        records=records,
        source_refs=[r.source for r in records],
        total=total,
        has_more=more,
        retrieved_at=datetime.now(UTC),
    )


# name -> source type, operation. Descriptions and schemas are exposed by the registry.
TOOL_SPECS: dict[str, tuple[SourceType, str]] = {
    "get_patient": ("patient", "get"),
    "search_patient": ("patient", "get"),
    "get_encounters": ("encounter", "list"),
    "get_encounter": ("encounter", "get"),
    "build_patient_timeline": ("clinical_event", "list"),
    "search_clinical_notes": ("document", "search"),
    "get_clinical_note": ("document", "get"),
    "search_documents": ("document", "search"),
    "get_document": ("document", "get"),
    "get_lab_results": ("observation", "list"),
    "get_lab_result": ("observation", "get"),
    "compare_lab_results": ("observation", "compare"),
    "get_medication_history": ("medication", "list"),
    "get_medication": ("medication", "get"),
    "get_diagnostic_reports": ("diagnostic_report", "list"),
    "get_diagnostic_report": ("diagnostic_report", "get"),
    "get_imaging_studies": ("imaging_study", "list"),
    "get_imaging_asset_metadata": ("imaging_asset", "get"),
    "get_imaging_report": ("document", "imaging_report"),
    "get_referrals": ("referral", "list"),
}


async def dispatch(clinical: ClinicalTools, name: str, args: ToolInput) -> ToolResult:
    kind, operation = TOOL_SPECS[name]
    if operation == "list":
        return await clinical.list_records(kind, args)
    if operation == "search":
        async with clinical.database.session() as session:
            service = ClinicalRecordService(HospitalRepository(session))
            hits, total = await service.search_documents(
                args.patient_id,
                args.query,
                {
                    "limit": args.limit,
                    "offset": args.offset,
                    "start_at": args.start_at,
                    "end_at": args.end_at,
                },
            )
        # Metadata/snippets only. Original text requires a separate get_document call.
        records = []
        for hit in hits:
            record = await clinical.resolve(args.patient_id, SourceRef(type="document", id=hit.id))
            record.data = hit.model_dump(mode="json")
            records.append(record)
        return result_for(records, total, args.offset)
    identifier = args.record_id or (args.patient_id if kind == "patient" else None)
    if not identifier:
        raise HospitalError("INVALID_ARGUMENT", 422)
    if operation == "imaging_report":
        study = await clinical.resolve(
            args.patient_id, SourceRef(type="imaging_study", id=identifier)
        )
        identifier = study.data.get("report_document_id")
        if not identifier:
            raise HospitalError()
    records = [await clinical.resolve(args.patient_id, SourceRef(type=kind, id=identifier))]
    if operation == "compare":
        if not args.other_id:
            raise HospitalError("INVALID_ARGUMENT", 422)
        other = await clinical.resolve(args.patient_id, SourceRef(type=kind, id=args.other_id))
        if records[0].data.get("unit") != other.data.get("unit") or records[0].data.get(
            "test_name"
        ) != other.data.get("test_name"):
            raise HospitalError("INCOMPARABLE_OBSERVATIONS", 422)
        records.append(other)
    return result_for(records, len(records))
