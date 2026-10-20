"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordSectionView } from "@/components/patients/record-section";
import { useHospitalData } from "@/hooks/use-hospital-data";
import { hospitalApi } from "@/lib/api/hospital";
import type { RecordSection } from "@/types/hospital";

const sections: [RecordSection, string][] = [["diagnoses", "Assessments"], ["symptoms", "Symptoms"], ["diagnostic-reports", "Reports"], ["encounters", "Encounters"], ["observations", "Laboratory"], ["medications", "Medications"], ["documents", "Notes & documents"], ["imaging-studies", "Imaging"], ["clinical-events", "Clinical events"], ["referrals", "Referrals"], ["timeline", "Chronology"]];
export function PatientRecord({ patientId }: { patientId: string }) {
  const [section, setSection] = useState<RecordSection>("encounters");
  const load = useCallback((signal: AbortSignal) => hospitalApi.patient(patientId, signal), [patientId]);
  const state = useHospitalData(patientId, load);
  return <div className="space-y-6"><Link href="/patients" className="text-sm text-teal underline">All synthetic patients</Link>
    {!state.data && !state.error && <p role="status">Loading patient…</p>}
    {state.error && <div role="alert">{state.error} <Button variant="outline" onClick={state.retry}>Retry patient</Button></div>}
    {state.data && <><header className="rounded-lg border border-border bg-card p-6"><p className="eyebrow">Hospital source record</p><h1>{state.data.display_name}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{state.data.synthetic_identifier} · {state.data.id} · {state.data.case_id}</p>
      <p className="mt-2 text-sm">Date of birth: {state.data.date_of_birth} · Sex: {state.data.sex}</p></header>
      <nav aria-label="Clinical record sections" className="flex flex-wrap gap-2">{sections.map(([id, label]) => <Button key={id} variant={section === id ? "default" : "outline"} aria-pressed={section === id} onClick={() => setSection(id)}>{label}</Button>)}</nav>
      <h2>{sections.find(([id]) => id === section)?.[1]}</h2>
      {section === "timeline" && <p className="text-sm text-muted-foreground">Clinical source chronology uses known instants. Date-only and unknown event times are retained in their record sections.</p>}
      <RecordSectionView key={`${patientId}:${section}`} patientId={patientId} section={section} /></>}
  </div>;
}
