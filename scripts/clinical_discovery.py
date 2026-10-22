"""Offline discovery assessment. Never imported by hospital or agent runtime.

Clinical meaning is adjudicated in a hash-bound reviewer sidecar, never inferred
from word overlap or the finding's own verification label.
"""

import hashlib
import json
from pathlib import Path
from typing import Literal

from app.core.provenance import digest
from app.evidence.provenance import anchor_matches
from app.hospital import schemas
from app.schemas.investigation import Anchor, Report, SourceRecord
from pydantic import BaseModel, ConfigDict, Field, model_validator


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Discovery(Strict):
    finding_key: str
    domain: Literal[
        "timeline_contradiction",
        "medication_reconciliation_discrepancy",
        "result_to_follow_up_discrepancy",
        "diagnostic_hypothesis_challenge",
        "longitudinal_laboratory_concern",
    ]
    priority: Literal["primary", "secondary"]
    source_roles: dict[str, list[str]]
    review_required: list[str] = Field(min_length=1)


class Specification(Strict):
    version: Literal["1.0"]
    case_id: str
    dataset_version: str
    key_sha256: str
    discoveries: list[Discovery] = Field(min_length=1)

    @model_validator(mode="after")
    def roles_and_primary(self):
        if not any(d.priority == "primary" for d in self.discoveries):
            raise ValueError("At least one primary discovery is required")
        if any(
            not role or not ids
            for d in self.discoveries
            for role, ids in d.source_roles.items()
        ):
            raise ValueError("Source roles require names and source IDs")
        return self


DIMENSIONS = (
    "relationship",
    "claim_correctness",
    "counterevidence",
    "causality",
    "uncertainty",
    "missing_evidence",
    "false_positives",
)


class Judgment(Strict):
    finding_key: str
    finding_ids: list[str] = Field(min_length=1)
    # An explicit group asserts a relationship; merely listing IDs is insufficient.
    linked_relationship: str = Field(min_length=1)
    link_claim_finding_id: str | None = None
    source_roles: dict[str, list[str]]
    decisions: dict[str, Literal["pass", "fail", "review"]]
    rationale: dict[str, str]

    @model_validator(mode="after")
    def complete(self):
        if set(self.decisions) != set(DIMENSIONS) or set(self.rationale) != set(
            DIMENSIONS
        ):
            raise ValueError(
                "Every semantic dimension requires a decision and rationale"
            )
        if any(not text.strip() for text in self.rationale.values()):
            raise ValueError("Empty reviewer rationale")
        if len(set(self.finding_ids)) != len(self.finding_ids):
            raise ValueError("Duplicate finding IDs")
        return self


class Review(Strict):
    version: Literal["1.0"]
    report_sha256: str
    spec_sha256: str
    case_sha256: str
    reviewer: str = Field(min_length=1)
    qualification: str = Field(min_length=1)
    reviewed_at: str = Field(min_length=1)
    judgments: list[Judgment]


MODELS = {
    "encounters": ("encounter", schemas.Encounter),
    "clinical_events": ("clinical_event", schemas.ClinicalEvent),
    "observations": ("observation", schemas.Observation),
    "medications": ("medication", schemas.Medication),
    "documents": ("document", schemas.DocumentResponse),
    "diagnostic_reports": ("diagnostic_report", schemas.DiagnosticReport),
    "imaging_studies": ("imaging_study", schemas.ImagingStudy),
    "referrals": ("referral", schemas.Referral),
    "diagnoses": ("diagnosis", schemas.Diagnosis),
    "symptoms": ("symptom", schemas.Symptom),
}


def sources_from_case(case: dict) -> dict[str, SourceRecord]:
    """Reproduce public DTO projection from immutable canonical input, without DB IO.

    Source version 1 matches this frozen cohort's initial imports. Other versions
    fail anchor checks; they require a new explicitly versioned source adapter.
    """
    sources = {}
    for collection, (kind, model) in MODELS.items():
        for original in case.get(collection, []):
            data = dict(original)
            if kind == "document":
                data["has_asset"] = bool(data.pop("storage_path", None))
                data["metadata"] = {
                    k: v
                    for k, v in data.get("metadata", {}).items()
                    if k in {"department", "width", "height", "synthetic_label"}
                }
            data = model.model_validate(data).model_dump(mode="json")
            source = SourceRecord(
                source={"type": kind, "id": data["id"]},
                source_version=1,
                source_hash=digest(data),
                data=data,
            )
            if data["id"] in sources:
                raise ValueError("Duplicate canonical source ID")
            sources[data["id"]] = source
    return sources


def assess(
    report: dict,
    key: dict,
    spec: Specification,
    sources: dict[str, SourceRecord],
    patient_id: str,
    judgments: list[Judgment] | None = None,
    retrieved: set[str] | None = None,
) -> dict:
    if report["status"] not in {"completed", "completed_with_limitations"}:
        raise ValueError("Only finalized reports may be evaluated")
    if spec.case_id != key["case_id"] or spec.dataset_version != key["dataset_version"]:
        raise ValueError("Specification/key identity mismatch")
    expected = {f["finding_key"]: f for f in key["expected_findings"]}
    if len(expected) != len(spec.discoveries) or set(expected) != {
        d.finding_key for d in spec.discoveries
    }:
        raise ValueError(
            "Specification must cover every expected discovery exactly once"
        )
    findings = report["verified_findings"] + report["unresolved_findings"]
    by_id = {f["id"]: f for f in findings}
    if len(by_id) != len(findings):
        raise ValueError("Duplicate finding IDs")
    reviews = {j.finding_key: j for j in judgments or []}
    if len(reviews) != len(judgments or []) or set(reviews) - set(expected):
        raise ValueError("Duplicate or unknown discovery review")

    def valid(anchor):
        source = sources.get(anchor["source"]["id"])
        return bool(
            source
            and source.data.get("patient_id") == patient_id
            and anchor_matches(source, Anchor.model_validate(anchor))
        )

    rows = []
    for discovery in spec.discoveries:
        gold = expected[discovery.finding_key]
        required = set(gold["required_source_ids"])
        if {s for ids in discovery.source_roles.values() for s in ids} != required:
            raise ValueError(
                "Source roles must cover exactly the key's required sources"
            )
        relevant = [
            f for f in findings if required & {a["source"]["id"] for a in f["anchors"]}
        ]
        cited = {a["source"]["id"] for f in relevant for a in f["anchors"]} & required
        verified = {
            a["source"]["id"] for f in relevant for a in f["anchors"] if valid(a)
        } & required
        review = reviews.get(discovery.finding_key)
        groups = [[f] for f in relevant]
        if review:
            if set(review.finding_ids) - set(by_id):
                raise ValueError("Review references absent/rejected findings")
            if len(review.finding_ids) > 1:
                link = by_id.get(review.link_claim_finding_id or "")
                if (
                    not link
                    or link["id"] not in review.finding_ids
                    or review.linked_relationship != link["claim"]
                    or not all(
                        identifier == link["id"] or identifier in link["claim"]
                        for identifier in review.finding_ids
                    )
                ):
                    raise ValueError(
                        "Linked group requires an original finding claim explicitly referencing the other finding IDs"
                    )
            groups.append([by_id[i] for i in review.finding_ids])
        group_results = []
        for group in groups:
            anchors = [a for f in group for a in f["anchors"]]
            ids = {a["source"]["id"] for a in anchors if valid(a)}
            full = required <= ids
            clean = all(valid(a) for a in anchors)
            key_anchors = all(
                any(
                    valid(a)
                    and a["source"]["id"] == target["source_id"]
                    and a["field"] == target["field"]
                    and ("value" not in target or a["expected"] == target["value"])
                    and (
                        target.get("quote") is None
                        or target["quote"] in (a.get("quote") or str(a["expected"]))
                    )
                    for a in anchors
                )
                for target in gold.get("anchors", [])
            )
            group_results.append(
                {
                    "finding_ids": [f["id"] for f in group],
                    "required_sources_connected": full,
                    "all_anchors_valid": clean,
                    "key_anchors_matched": key_anchors,
                }
            )
        semantic = (
            dict(review.decisions) if review else {d: "review" for d in DIMENSIONS}
        )
        selected = next(
            (
                g
                for g in group_results
                if review and g["finding_ids"] == review.finding_ids
            ),
            None,
        )
        roles_pass = bool(review and review.source_roles == discovery.source_roles)
        acceptable = bool(
            review
            and all(
                by_id[i]["status"] in gold["acceptable_outcomes"]
                for i in review.finding_ids
            )
        )
        if review and any(v == "fail" for v in semantic.values()):
            outcome, reason = (
                "unsupported",
                "Reviewer rejected one or more clinical assertions",
            )
        elif review and selected and not selected["all_anchors_valid"]:
            outcome, reason = (
                "unsupported",
                "Selected relationship has invalid/foreign provenance",
            )
        elif review and not roles_pass:
            outcome, reason = "partial", "Required source roles not established"
        elif review and not acceptable:
            outcome, reason = (
                "partial",
                "Selected finding outcomes are not accepted by the key",
            )
        elif (
            review
            and selected
            and selected["required_sources_connected"]
            and selected["key_anchors_matched"]
            and all(v == "pass" for v in semantic.values())
            and not any(
                "pending_role_review" in role for role in discovery.source_roles
            )
        ):
            outcome, reason = (
                "exact",
                "Complete connected evidence and qualified semantic adjudication",
            )
        elif not relevant:
            outcome, reason = "missed", "No finding cites a required source"
        elif not verified:
            outcome, reason = "unsupported", "No valid required-source citation"
        elif any(
            g["required_sources_connected"] and g["all_anchors_valid"]
            for g in group_results
        ):
            outcome, reason = (
                "not_assessable",
                "Connected citations exist; clinical meaning requires review",
            )
        else:
            outcome, reason = (
                "partial",
                "Relevant evidence exists; full expected relationship is not established",
            )
        rows.append(
            {
                "finding_key": discovery.finding_key,
                "domain": discovery.domain,
                "priority": discovery.priority,
                "outcome": outcome,
                "reason": reason,
                "required_source_roles": discovery.source_roles,
                "source_existence": sorted(required & sources.keys()),
                "source_retrieval": None
                if retrieved is None
                else sorted(required & retrieved),
                "cited_sources": sorted(cited),
                "verified_citation_sources": sorted(verified),
                "missing_valid_citations": sorted(required - verified),
                "groups": group_results,
                "semantic_decisions": semantic,
                "review_required": discovery.review_required,
                "review_rationale": review.rationale if review else None,
                "expected_claim": gold["expected_claim"],
                "counterevidence_rubric": gold.get("counterevidence"),
                "false_positive_rubric": key.get("expected_non_findings", []),
                "factual_observations": [
                    f["id"] for f in relevant if f["claim_kind"] == "observation"
                ],
            }
        )
    return {
        "spec_version": spec.version,
        "case_id": spec.case_id,
        "discoveries": rows,
        "primary_discovery_success": all(
            r["outcome"] == "exact" for r in rows if r["priority"] == "primary"
        ),
        "clinical_accuracy_claimed": False,
    }


def evaluate(
    report_path: Path,
    key_path: Path,
    spec_path: Path,
    case_path: Path,
    review_path: Path | None = None,
    tools_path: Path | None = None,
) -> dict:
    report = json.loads(report_path.read_text(encoding="utf-8"))
    Report.model_validate(report)
    spec = Specification.model_validate_json(spec_path.read_text(encoding="utf-8"))
    if sha(key_path) != spec.key_sha256:
        raise ValueError("Answer key changed since specification was authored")
    case = json.loads(case_path.read_text(encoding="utf-8"))
    if case["case_id"] != spec.case_id or case["version"] != spec.dataset_version:
        raise ValueError("Canonical case identity/version mismatch")
    review = (
        Review.model_validate_json(review_path.read_text()) if review_path else None
    )
    if review and (
        review.report_sha256 != sha(report_path)
        or review.spec_sha256 != sha(spec_path)
        or review.case_sha256 != sha(case_path)
    ):
        raise ValueError("Stale or mismatched reviewer adjudication")
    retrieved = None
    if tools_path:
        tools = json.loads(tools_path.read_text())
        if tools["investigation_id"] != report["investigation_id"]:
            raise ValueError("Tool trace belongs to another investigation")
        retrieved = {
            s["id"]
            for t in tools["items"]
            if t["status"] == "succeeded"
            for s in t["source_refs"]
        }
    result = assess(
        report,
        json.loads(key_path.read_text()),
        spec,
        sources_from_case(case),
        case["patient"]["id"],
        review.judgments if review else None,
        retrieved,
    )
    result["input_hashes"] = {
        "report": sha(report_path),
        "key": sha(key_path),
        "spec": sha(spec_path),
        "case": sha(case_path),
        "review": sha(review_path) if review_path else None,
        "tools": sha(tools_path) if tools_path else None,
    }
    result["reviewer"] = review.model_dump(exclude={"judgments"}) if review else None
    result["limitations"] = [
        "Retrieval traces may include search hits; source_refs do not establish original-text retrieval.",
        "Exact field/DTO anchors checked offline; asset bytes are protected by the separate frozen inventory.",
        "Factual observations and recorded runtime verification do not establish clinical interpretation.",
        "Reviewer identity/qualification are audit assertions, not authenticated credentials.",
        "No semantic keyword matching; unreviewed meaning remains unassessed.",
    ]
    return result
