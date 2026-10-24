"""Select complete evidence objects within the configured model context budget."""

import json
from typing import Any

from app.schemas.investigation import Candidate, SourceRecord


def proposal_context(
    objective: str, candidates: list[Candidate], records: list[SourceRecord], max_chars: int
) -> dict[str, Any]:
    context: dict[str, Any] = {
        "objective": objective,
        "candidates": [],
        "sources": [],
        "limitations": [],
    }
    originals = {(r.source.type, r.source.id): r for r in records if r.representation == "source"}
    included: set[tuple[str, str]] = set()
    skipped = 0
    for candidate in sorted(candidates, key=lambda c: c.type != "timeline_contradiction"):
        keys = {(a.source.type, a.source.id) for a in candidate.anchors}
        sources = [
            originals[k].model_dump(mode="json") for k in sorted(keys - included) if k in originals
        ]
        proposed = {
            **context,
            "candidates": context["candidates"] + [candidate.model_dump(mode="json")],
            "sources": context["sources"] + sources,
        }
        if (
            len(proposed["candidates"]) > 8
            or len(json.dumps(proposed, ensure_ascii=False)) > max_chars - 500
        ):
            skipped += 1
            continue
        context = proposed
        included.update(keys)
    if skipped:
        context["limitations"] = [f"{skipped} candidates omitted from bounded model context."]
    return context
