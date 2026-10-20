import { PatientRecord } from "@/components/patients/patient-record";
export default async function PatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  return <PatientRecord key={patientId} patientId={patientId} />;
}
