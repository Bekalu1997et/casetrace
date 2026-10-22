import Link from "next/link";
import type { InvestigationReport, SourceRef } from "@/types/investigation";
import { hospitalSourceHref } from "@/features/records/navigation";
export function ReportSourceIndex({ report, patientId, onOpen }: { report: InvestigationReport; patientId: string; onOpen: (source: SourceRef) => void }) {
  const sources = new Map<string, SourceRef>();
  const add = (source: SourceRef) => sources.set(`${source.type}:${source.id}`, source);
  [...report.verified_findings, ...report.unresolved_findings, ...report.rejected_findings].forEach(finding => finding.anchors.forEach(anchor => add(anchor.source)));
  report.hypotheses.forEach(item => [...item.supports, ...item.weakens].forEach(anchor => add(anchor.source)));
  report.timeline.forEach(item => add(item.source));
  return <div className="clinical-table-scroll"><table className="clinical-table"><thead><tr><th scope="col">Source identifier</th><th scope="col">Record type</th><th scope="col">Original record</th></tr></thead><tbody>{[...sources.values()].map(source => <tr key={`${source.type}:${source.id}`}><td><button className="source-link" onClick={() => onOpen(source)}>{source.id}</button></td><td>{source.type.replaceAll("_", " ")}</td><td><Link className="text-primary underline" href={hospitalSourceHref(patientId, source)}>Hospital source {source.id}</Link></td></tr>)}</tbody></table>{!sources.size && <p>No referenced sources recorded.</p>}</div>;
}
