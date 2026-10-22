"use client";
import { usePatientChart } from "./chart-layout";
import { ClinicalList } from "./clinical-list";
import { InvestigationHistory } from "@/features/investigations/components/history";
export function ChartOverview({patientId}:{patientId:string}) {
 const chart=usePatientChart();
 return <div className="space-y-6"><h2>Longitudinal record overview</h2>{chart&&<dl className="hospital-metrics">{Object.entries(chart.summary).filter(([key])=>key.endsWith("_count")).map(([key,value])=><div key={key}><dt>{key.replaceAll("_"," ")}</dt><dd>{value}</dd></div>)}</dl>}<div className="grid gap-6 xl:grid-cols-2"><ClinicalList patientId={patientId} section="encounters" compact/><ClinicalList patientId={patientId} section="clinical-events" compact/><ClinicalList patientId={patientId} section="diagnostic-reports" compact/><ClinicalList patientId={patientId} section="documents" compact/><ClinicalList patientId={patientId} section="observations" compact/><ClinicalList patientId={patientId} section="medications" compact/></div><details className="hospital-card space-y-4"><summary className="font-semibold">Assessments, symptoms and referrals</summary><ClinicalList patientId={patientId} section="diagnoses"/><ClinicalList patientId={patientId} section="symptoms"/><ClinicalList patientId={patientId} section="referrals"/></details><InvestigationHistory patientId={patientId}/></div>;
}
