"""Resolve every assertion against hospital records, not model self-confidence."""

from app.agents.analysis import instant, onset_pair
from app.hospital.service import HospitalError
from app.schemas.investigation import Candidate, Check, SourceRecord, Verification
from app.tools.clinical import ClinicalTools


class EvidenceVerifier:
    def __init__(self, clinical: ClinicalTools, patient_id: str):
        self.clinical, self.patient_id = clinical, patient_id

    async def verify(self, candidate: Candidate) -> tuple[Verification, str]:
        checks = []
        records: dict[str, SourceRecord] = {}
        identities = [(a.source.type, a.source.id, a.field) for a in candidate.anchors]
        if len(set(identities)) != len(identities) or (
            candidate.rule == "field_observation"
            and not any(a.relationship == "supports" for a in candidate.anchors)
        ):
            return Verification(
                status="rejected",
                checks=[
                    Check(
                        type="evidence_completeness",
                        status="failed",
                        message="Distinct anchors and at least one supporting anchor are required.",
                    )
                ],
                classification="INSUFFICIENT_EVIDENCE",
            ), candidate.claim
        for anchor in candidate.anchors:
            try:
                source = await self.clinical.resolve(self.patient_id, anchor.source)
                records[f"{anchor.source.type}:{anchor.source.id}"] = source
                valid = (
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
                checks.append(
                    Check(
                        type="source_existence",
                        status="passed" if valid else "failed",
                        message=f"{anchor.source.id}: version, hash, encounter and field anchor",
                    )
                )
            except HospitalError:
                checks.append(
                    Check(
                        type="source_existence",
                        status="failed",
                        message="Source or registered asset unavailable in patient scope.",
                    )
                )
        if any(c.status == "failed" for c in checks):
            return Verification(
                status="rejected", checks=checks, classification="INSUFFICIENT_EVIDENCE"
            ), candidate.claim
        rows = list(records.values())
        valid = False
        claim = candidate.claim
        classification = "INSUFFICIENT_EVIDENCE"
        if (
            candidate.rule == "field_observation"
            and candidate.claim_kind == "observation"
            and candidate.type in {"medication_change", "clinical_relationship"}
        ):
            valid = True
            claim = "; ".join(
                f"{a.source.id}.{a.field} = {a.expected}"
                for a in candidate.anchors
                if a.relationship == "supports"
            )
        elif (
            candidate.rule == "lab_change"
            and candidate.type == "laboratory_change"
            and candidate.claim_kind == "observation"
            and len(rows) == 2
        ):
            first, last = rows
            a, b = first.data, last.data
            at, bt = (
                instant(a.get("specimen_collected_at")),
                instant(b.get("specimen_collected_at")),
            )
            valid = bool(
                first.source.type == last.source.type == "observation"
                and a.get("test_name") == b.get("test_name")
                and a.get("unit") == b.get("unit")
                and a.get("value_numeric") is not None
                and b.get("value_numeric") is not None
                and a["value_numeric"] != b["value_numeric"]
                and at
                and bt
                and at < bt
            )
            claim = (
                f"{a.get('test_name')}: {a.get('value_numeric')} {a.get('unit')} "
                f"({first.source.id}, {a.get('specimen_collected_at')}) to "
                f"{b.get('value_numeric')} {b.get('unit')} "
                f"({last.source.id}, {b.get('specimen_collected_at')})."
            )
        elif (
            candidate.rule == "onset_conflict"
            and candidate.claim_kind == "chronology"
            and candidate.type == "timeline_contradiction"
        ):
            notes = [
                r
                for r in rows
                if r.source.type == "document"
                and any(
                    a.source == r.source and a.relationship == "supports" for a in candidate.anchors
                )
            ]
            events = [r for r in rows if r.source.type == "clinical_event"]
            valid = len(notes) == len(events) == 1 and onset_pair(notes[0], events[0])
            if valid:
                from app.agents.analysis import contradictions

                claim = contradictions(notes, events)[0].claim
                classification = "VERIFIED_CONTRADICTION"
        checks.append(
            Check(
                type="relationship_verification",
                status="passed" if valid else "inconclusive",
                message="Deterministic proposition check; clinical interpretations require review.",
            )
        )
        return Verification(
            status="verified" if valid else "inconclusive",
            checks=checks,
            classification=classification
            if classification == "VERIFIED_CONTRADICTION"
            else "SUPPORTED_OBSERVATION"
            if valid
            else "INSUFFICIENT_EVIDENCE",
        ), claim
