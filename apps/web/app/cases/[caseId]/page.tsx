import { CaseDetail } from "@/features/cases/components/case-library";
export default async function Page({ params }: { params: Promise<{caseId:string}> }) { const {caseId}=await params; return <CaseDetail caseId={caseId} />; }
