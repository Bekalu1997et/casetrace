"""Reusable deterministic analyses of retrieved records; no hidden answer identifiers."""

import re
from datetime import UTC, date, datetime

from app.schemas.investigation import Anchor, Candidate, Hypothesis, SourceRecord, TimelineEvent

TIME_FIELDS = (
    "occurred_at",
    "documented_at",
    "started_at",
    "ended_at",
    "event_at",
    "authored_at",
    "specimen_collected_at",
    "reported_at",
    "ordered_at",
    "start_at",
    "end_at",
    "performed_at",
    "appointment_at",
    "issued_at",
    "diagnosed_at",
    "onset_at",
)
PRIMARY = {
    "encounter": "started_at",
    "clinical_event": "occurred_at",
    "document": "event_at",
    "observation": "specimen_collected_at",
    "medication": "start_at",
    "imaging_study": "performed_at",
    "referral": "ordered_at",
    "diagnostic_report": "issued_at",
    "diagnosis": "diagnosed_at",
    "symptom": "onset_at",
}


def instant(value: object) -> datetime | None:
    if not isinstance(value, str) or len(value) <= 10:
        return None
    try:
        result = datetime.fromisoformat(value)
        return result.astimezone(UTC) if result.utcoffset() is not None else None
    except ValueError:
        return None


def anchor(record: SourceRecord, field: str, quote: str | None = None) -> Anchor:
    return Anchor(
        source=record.source,
        source_version=record.source_version,
        source_hash=record.source_hash,
        encounter_id=record.data.get("encounter_id"),
        field=field,
        expected=record.data.get(field),
        quote=quote,
    )


def timeline(records: list[SourceRecord]) -> list[TimelineEvent]:
    events = []
    for record in records:
        field = PRIMARY.get(record.source.type, "occurred_at")
        raw = record.data.get(field)
        events.append(
            TimelineEvent(
                id=f"TL-{record.source.type}-{record.source.id}",
                source=record.source,
                timestamp=raw,
                timestamp_type=field,
                precision="unknown" if raw is None else "day" if len(raw) == 10 else "instant",
                timestamps={k: record.data[k] for k in TIME_FIELDS if k in record.data},
                title=str(
                    next(
                        (
                            record.data[k]
                            for k in [
                                "title",
                                "description",
                                "test_name",
                                "medication_name",
                                "reason",
                                "department",
                            ]
                            if record.data.get(k)
                        ),
                        record.source.id,
                    )
                ),
            )
        )
    # Partial days and unknown times remain explicit; never replace with invented midnight.
    events.sort(
        key=lambda e: (
            e.timestamp is None,
            parsed.isoformat() if (parsed := instant(e.timestamp)) else e.timestamp or "",
            e.id,
        )
    )
    return events


# Narrow parser: an explicit first-onset assertion, not general clinical NLP.
ONSET = re.compile(
    r"\b([A-Za-z][A-Za-z -]{0,35}?)\s+(?:first\s+)?began on "
    r"([A-Z][a-z]+ \d{1,2}, \d{4});\s*no \1 before then\b",
    re.IGNORECASE,
)


def onset_claim(text: str) -> tuple[str, date, str] | None:
    for match in ONSET.finditer(text):
        try:
            return (
                match[1].strip().casefold(),
                datetime.strptime(match[2], "%B %d, %Y").date(),
                match[0],
            )
        except ValueError:
            continue
    return None


def onset_pair(note: SourceRecord, event: SourceRecord) -> bool:
    claim = onset_claim(str(note.data.get("text_content") or ""))
    occurred = instant(event.data.get("occurred_at"))
    documented = instant(event.data.get("documented_at"))
    note_time = note.data.get("event_at") or note.data.get("authored_at")
    if not claim or not occurred or not documented or not instant(note_time):
        return False
    note_zone = datetime.fromisoformat(str(note_time)).tzinfo
    description = str(event.data.get("description", ""))
    # Match the same symptom as a word and exclude negation; no inference from an absent record.
    mentions = re.search(rf"\b{re.escape(claim[0])}\b", description, re.IGNORECASE)
    negative = re.search(
        rf"\b(?:no|denies|without)\s+(?:\w+\s+){{0,2}}"
        rf"{re.escape(claim[0])}\b",
        description,
        re.IGNORECASE,
    )
    return bool(
        mentions
        and not negative
        and occurred.astimezone(note_zone).date() < claim[1]
        and documented.astimezone(note_zone).date() < claim[1]
    )


def contradictions(notes: list[SourceRecord], events: list[SourceRecord]) -> list[Candidate]:
    candidates = []
    for note in notes:
        for event in events:
            if not onset_pair(note, event):
                continue
            parsed = onset_claim(str(note.data["text_content"]))
            assert parsed is not None
            context = []
            for earlier in notes:
                when = instant(earlier.data.get("event_at"))
                entered = instant(earlier.data.get("authored_at"))
                text = str(earlier.data.get("text_content") or "")
                mention = re.search(rf"\b{re.escape(parsed[0])}\b", text, re.IGNORECASE)
                if (
                    when
                    and entered
                    and when.date() < parsed[1]
                    and entered.date() < parsed[1]
                    and mention
                ):
                    item = anchor(earlier, "text_content", mention[0])
                    item.relationship = "contextualizes"
                    context.append(item)
            # Both original source documents and event-level timestamps remain reviewable.
            context = context[:8]
            candidates.append(
                Candidate(
                    type="timeline_contradiction",
                    title="Conflicting documented symptom chronology",
                    claim=f"{note.source.id} states {parsed[2]}, while {event.source.id} records "
                    f"{event.data['description']} at {event.data['occurred_at']}.",
                    claim_kind="chronology",
                    rule="onset_conflict",
                    anchors=[
                        anchor(note, "text_content", parsed[2]),
                        anchor(event, "description"),
                        anchor(event, "occurred_at"),
                        anchor(event, "documented_at"),
                        *context,
                    ],
                    alternatives=[
                        "Retrospective history may be inaccurate or describe a new episode."
                    ],
                    limitations=[
                        "A record-level discrepancy does not establish true onset, cause or error."
                    ],
                )
            )
            break  # Earliest sufficient comparison; avoid duplicate same-proposition findings.
    return candidates


def lab_changes(records: list[SourceRecord]) -> list[Candidate]:
    groups: dict[tuple[str, str], list[SourceRecord]] = {}
    for record in records:
        if record.data.get("value_numeric") is None or not instant(
            record.data.get("specimen_collected_at"),
        ):
            continue
        key = (
            str(record.data.get("test_code") or record.data["test_name"]),
            str(record.data.get("unit")),
        )
        groups.setdefault(key, []).append(record)
    findings = []
    for group in groups.values():
        group.sort(key=lambda r: (instant(r.data["specimen_collected_at"]), r.source.id))
        first, last = group[0], group[-1]
        if first.data["value_numeric"] == last.data["value_numeric"]:
            continue
        findings.append(
            Candidate(
                type="laboratory_change",
                title=f"Recorded change in {first.data['test_name']}",
                claim=f"{first.source.id} and {last.source.id} record different values.",
                claim_kind="observation",
                rule="lab_change",
                anchors=[
                    anchor(r, f)
                    for r in [first, last]
                    for f in ["test_name", "value_numeric", "unit", "specimen_collected_at"]
                ],
                limitations=[
                    "A numerical change alone does not establish clinical significance or cause."
                ],
            )
        )
    return findings


def medication_observations(records: list[SourceRecord]) -> list[Candidate]:
    return [
        Candidate(
            type="medication_change",
            title=f"Documented medication status: {r.data['medication_name']}",
            claim=f"{r.source.id} documents medication status {r.data['status']}.",
            claim_kind="observation",
            rule="field_observation",
            anchors=[
                anchor(r, f)
                for f in [
                    "medication_name",
                    "status",
                    "dose",
                    "dose_unit",
                    "ordered_at",
                    "start_at",
                    "end_at",
                ]
                if f in r.data
            ],
            limitations=[
                "Orders and recorded medication periods do not establish dispensing, "
                "administration, adherence or causation."
            ],
        )
        for r in records
    ]


def followups(referrals: list[SourceRecord]) -> list[Candidate]:
    return [
        Candidate(
            type="missing_evidence",
            title="Follow-up status requires reconciliation",
            claim=f"Referral {r.source.id} has recorded status {r.data['status']}; "
            "the available record does not establish completion.",
            claim_kind="interpretation",
            rule="interpretation",
            anchors=[anchor(r, "status")],
            limitations=[
                "Missing completion documentation is not proof of missed care. "
                "Care may have occurred elsewhere; future appointments are not overdue."
            ],
        )
        for r in referrals
        if r.data.get("status") in {"ordered", "scheduled", "unknown", "no_show"}
    ]


def challenge(candidates: list[Candidate]) -> list[Hypothesis]:
    return [
        Hypothesis(
            explanation=(
                "Retrospective history or a different episode may explain "
                "the conflicting chronology."
            ),
            supports=c.anchors[:1],
            weakens=c.anchors[1:],
            missing_evidence=[
                "Clarification of the history and whether the records describe the same episode."
            ],
        )
        for c in candidates
        if c.type == "timeline_contradiction"
    ]
