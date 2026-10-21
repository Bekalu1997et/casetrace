"""Clinical tool handlers over injected DTO capabilities."""

from datetime import UTC, datetime

from app.clinical.ports import ClinicalSource
from app.hospital.errors import HospitalError
from app.schemas.investigation import SourceRecord, SourceRef, SourceType, ToolInput, ToolResult


class ClinicalTools:
    def __init__(self, source: ClinicalSource):
        self.source = source

    async def resolve(self, patient_id: str, source: SourceRef) -> SourceRecord:
        return await self.source.resolve(patient_id, source)

    async def list_records(self, source_type: SourceType, args: ToolInput) -> ToolResult:
        filters = args.model_dump(exclude_none=True)
        # Tool identifiers/search are not DTO equality filters.
        for key in ["patient_id", "record_id", "other_id", "query"]:
            filters.pop(key, None)
        records, total = await self.source.records(source_type, args.patient_id, filters)
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
        hits, total = await clinical.source.search_documents(
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
