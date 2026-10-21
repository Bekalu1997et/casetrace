import { PatientRecord } from "@/features/patients/components/patient-record";
export default async function PatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  return <PatientRecord key={patientId} patientId={patientId} />;
}
