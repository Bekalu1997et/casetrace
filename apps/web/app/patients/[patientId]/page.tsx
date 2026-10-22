import {ChartOverview} from "@/features/patients/components/chart-overview";
export default async function Page({params}:{params:Promise<{patientId:string}>}) {const {patientId}=await params;return <ChartOverview patientId={patientId}/>;}
