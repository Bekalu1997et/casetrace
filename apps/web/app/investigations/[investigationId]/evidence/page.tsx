import { EvidenceExplorer } from "@/features/evidence/components/evidence-explorer";
export default async function Page({ params, searchParams }: { params: Promise<{ investigationId: string }>; searchParams: Promise<{ finding?: string; source?: string; source_type?: string }> }) {
  const { investigationId } = await params;
  const query = await searchParams;
  const source = typeof query.source === "string" && typeof query.source_type === "string" ? { id: query.source, type: query.source_type } : undefined;
  return <EvidenceExplorer key={`${investigationId}:${query.finding ?? ""}:${source?.id ?? ""}`} id={investigationId} initialFinding={typeof query.finding === "string" ? query.finding : undefined} initialSource={source} />;
}
