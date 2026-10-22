import {ChartLayout} from "@/features/patients/components/chart-layout";
export default async function Layout({params,children}:{params:Promise<{patientId:string}>;children:React.ReactNode}) {const {patientId}=await params;return <ChartLayout patientId={patientId}>{children}</ChartLayout>;}
