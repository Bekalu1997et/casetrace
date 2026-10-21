import { InvestigationReportView } from "@/features/investigations/components/report";
export default async function Page({ params, searchParams }: { params: Promise<{ investigationId: string }>; searchParams: Promise<{ source?: string; source_type?: string }> }) {
  const { investigationId } = await params;
  const query = await searchParams;
  const initialSource = typeof query.source === "string" && typeof query.source_type === "string" ? { id: query.source, type: query.source_type } : undefined;
  return <InvestigationReportView key={investigationId} id={investigationId} initialSource={initialSource} />;
}
