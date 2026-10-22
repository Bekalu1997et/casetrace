import {ClinicalList} from "@/features/patients/components/clinical-list";
export default async function Page({params}:{params:Promise<{patientId:string}>}) {const {patientId}=await params;return <ClinicalList key={patientId} patientId={patientId} section="timeline"/>;}
