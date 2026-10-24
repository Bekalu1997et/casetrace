"""Readable original-record excerpts when no validated conversational answer exists."""

from typing import Any


def record_excerpts(context: dict[str, Any]) -> str:
    lines = []
    seen = set()
    for item in context["records"]:
        source = item["source"]
        kind = source["source"]["type"]
        if kind in seen:
            continue
        seen.add(kind)
        data = source["data"]
        fields = {
            "patient": ("display_name", "date_of_birth", "sex"),
            "encounter": ("encounter_type", "department", "started_at", "status"),
            "document": ("title", "event_at", "authored_at", "text_content"),
            "observation": (
                "test_name",
                "value_numeric",
                "value_text",
                "unit",
                "specimen_collected_at",
                "reported_at",
            ),
            "medication": (
                "medication_name",
                "dose",
                "dose_unit",
                "status",
                "ordered_at",
                "start_at",
                "end_at",
            ),
        }.get(kind, ("description", "status", "occurred_at", "documented_at"))
        parts = [
            f"{field.replace('_', ' ')}: {str(data[field])[:240]}"
            for field in fields
            if data.get(field) is not None
        ]
        if parts:
            lines.append(
                f"- {kind.replace('_', ' ').capitalize()}: "
                + "; ".join(parts)
                + f" [{item['citation_id']}]"
            )
        if len(lines) == 6:
            break
    return "\n".join(lines)
