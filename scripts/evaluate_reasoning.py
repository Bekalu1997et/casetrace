"""Offline rule evaluation on independent synthetic narratives, never a runtime import."""

import argparse
import asyncio
import json
import sys
import time
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from app.clinical.extraction import extract_claims  # noqa: E402
from app.clinical.reasoning import structured_contradictions  # noqa: E402
from app.clinical.temporal import narrative_time  # noqa: E402
from app.core.provenance import digest  # noqa: E402
from app.evidence.provenance import anchor_matches  # noqa: E402
from app.evidence.verification import EvidenceVerifier  # noqa: E402
from app.hospital.errors import HospitalError  # noqa: E402
from app.schemas.investigation import SourceRecord, SourceRef  # noqa: E402


def make_sources(narratives):
    rows = []
    for index, text in enumerate(narratives):
        kind = "document" if index == 0 else "clinical_event"
        data = {
            "patient_id": "SYN-RULE-EVAL",
            "encounter_id": "VISIT-INDEPENDENT",
            "text_content" if index == 0 else "description": text,
            **(
                {
                    "event_at": "2024-08-25T10:00:00+02:00",
                    "authored_at": "2024-08-25T11:00:00+02:00",
                }
                if index == 0
                else {
                    "occurred_at": "2024-08-02T09:00:00+02:00",
                    "documented_at": "2024-08-02T10:00:00+02:00",
                }
            ),
        }
        rows.append(
            SourceRecord(
                source=SourceRef(type=kind, id=f"SOURCE-{index}"),
                source_version=1,
                source_hash=digest(data),
                data=data,
            )
        )
    return rows


class Resolver:
    def __init__(self, rows):
        self.rows = rows

    async def resolve(self, patient_id, source):
        for row in self.rows:
            if row.source == source and row.data["patient_id"] == patient_id:
                return row
        raise HospitalError("SOURCE_NOT_FOUND", 404)


async def evaluate():
    fixtures = json.loads((ROOT / "apps/api/tests/fixtures/reasoning-narratives.json").read_text())
    # Offline oracle is deliberately loaded here, never passed into extraction or verification.
    oracle = json.loads((ROOT / "evaluation/reasoning/oracle.json").read_text())
    true = predicted = expected = valid = anchors = negatives = true_conflicts = false_conflicts = 0
    extraction_seconds = verification_seconds = 0.0
    outcomes = {}
    dimensions = Counter()
    for name, narratives in fixtures.items():
        rows = make_sources(narratives)
        started = time.perf_counter()
        claims = [c for row in rows for c in extract_claims(row)]
        candidates = structured_contradictions(rows[:1], rows[1:])
        extraction_seconds += time.perf_counter() - started
        fields = ("concept", "assertion", "polarity", "certainty", "subject")
        actual = Counter(tuple(getattr(c, k) for k in fields) for c in claims)
        gold = Counter(tuple(c) for c in oracle[name])
        for index, field in enumerate(fields):
            dimensions[field] += sum(
                getattr(claim, field) == gold_claim[index]
                for claim, gold_claim in zip(claims, oracle[name], strict=False)
            )
        true += sum((actual & gold).values())
        predicted += len(claims)
        expected += len(oracle[name])
        for claim in claims:
            anchors += 1
            valid += anchor_matches(
                next(r for r in rows if r.source == claim.anchor.source), claim.anchor
            )
        verifier = EvidenceVerifier(Resolver(rows), "SYN-RULE-EVAL", "structured")
        started = time.perf_counter()
        verified = 0
        for candidate in candidates:
            verified += (await verifier.verify(candidate))[0].status == "verified"
        verification_seconds += time.perf_counter() - started
        positive = name in {"A", "B", "J", "K"}
        true_conflicts += bool(verified) and positive
        false_conflicts += bool(verified) and not positive
        negatives += not positive
        outcomes[name] = {"claims": len(claims), "verified_conflicts": verified}
    temporal_probes = [
        ("August 18, 2024", "2024-08-25", "day"),
        ("late August 2024", "2024-08-25", "month"),
        ("about two weeks ago", "2024-08-25", "approximate"),
        ("three weeks ago", None, "unknown"),
        ("February 31, 2024", "2024-08-25", "unknown"),
    ]
    return {
        "mode": "deterministic_rules",
        "fixtures": len(fixtures),
        "claim_precision": {"matched": true, "predicted": predicted},
        "claim_recall": {"matched": true, "expected": expected},
        "exact_span_validity": {"passed": valid, "total": anchors},
        "claim_dimensions": {
            field: {"passed": dimensions[field], "total": expected} for field in fields
        },
        "temporal_precision_preservation": {
            "passed": sum(
                narrative_time(text, reference).precision == precision
                for text, reference, precision in temporal_probes
            ),
            "total": len(temporal_probes),
        },
        "true_conflict_detection": {"detected": true_conflicts, "positive_fixtures": 4},
        "false_conflicts": {"count": false_conflicts, "negative_fixtures": negatives},
        "extraction_and_comparison_seconds": extraction_seconds,
        "verification_seconds": verification_seconds,
        "model_calls": 0,
        "scenarios": outcomes,
        "limitations": [
            "Authored synthetic development fixtures, not held-out medical validation.",
            "Claim matches require concept, assertion, polarity, certainty and subject agreement.",
            "Expert clinical support and hypothesis quality remain pending review.",
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = asyncio.run(evaluate())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf8")
    print(json.dumps(result, indent=2))
