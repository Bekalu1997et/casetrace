"""Report assembly consumes persisted findings and source-led projections only."""

from app.core.config import Settings
from app.core.provenance import now
from app.llm.provider import LLMProvider
from app.schemas.investigation import Finding, Hypothesis, Report, TimelineEvent


def build_report(
    public_id: str,
    findings: list[Finding],
    timeline: list[TimelineEvent],
    hypotheses: list[Hypothesis],
    limits: list[str],
    settings: Settings,
    provider: LLMProvider | None,
) -> Report:
    verified = [f for f in findings if f.status == "verified"]
    conflicts = [f for f in verified if f.type == "timeline_contradiction"]
    mode = provider.mode if provider else "deterministic_rules"
    return Report(
        investigation_id=public_id,
        status="completed_with_limitations" if limits else "completed",
        summary={
            "headline": f"{len(conflicts)} verified record chronology discrepancies; "
            f"{len(verified)} supported observations.",
            "description": "Findings describe synthetic source records. "
            "Available records do not establish a final diagnosis or causal conclusion.",
        },
        timeline=timeline,
        verified_findings=verified,
        rejected_findings=[f for f in findings if f.status == "rejected"],
        unresolved_findings=[f for f in findings if f.status == "unresolved"],
        hypotheses=hypotheses,
        limitations=limits
        + [
            "Synthetic research prototype; not for clinical decisions.",
            "Narrative parsing is deliberately narrow; unrecognized claims require review.",
            "Records outside the imported dataset are unknown.",
        ]
        + (["No live LLM inference: deterministic rules mode."] if provider is None else []),
        generated_at=now(),
        execution_mode=mode,
        execution_config={
            "model": settings.llm_model if provider else "none",
            "max_tool_calls": settings.investigation_max_tool_calls,
            "max_model_requests": 1 if provider else 0,
            "max_model_retries": settings.llm_max_retries,
            "parser_policy": "explicit-onset-v1",
        },
    )
