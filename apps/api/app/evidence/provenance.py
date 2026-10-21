"""Exact anchor checks shared independently of candidate classification rules."""

from app.schemas.investigation import Anchor, SourceRecord


def anchor_matches(source: SourceRecord, anchor: Anchor) -> bool:
    return (
        source.source_version == anchor.source_version
        and source.source_hash == anchor.source_hash
        and source.data.get("encounter_id") == anchor.encounter_id
        and anchor.field in source.data
        and source.data[anchor.field] == anchor.expected
        and (
            anchor.quote is None
            or isinstance(source.data[anchor.field], str)
            and anchor.quote in source.data[anchor.field]
        )
    )
