import Link from "next/link";
import { ApiStatus } from "@/components/system/api-status";
import { PatientDirectory } from "@/components/patients/patient-directory";

export default function Home() {
  return <div className="space-y-7">
    <div><p className="eyebrow">Evidence starts at the source</p><h1>Clinical investigation workspace</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Connect records across time. Investigate discrepancies. Trace every finding to its evidence.</p>
    </div>
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm" aria-labelledby="foundation-title">
        <p className="eyebrow">Hospital overview</p><h2 id="foundation-title">A workspace built around evidence</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Browse imported synthetic clinical records, start an investigation, and examine source-backed findings.</p>
        <div className="mt-6 border-t border-border pt-5"><p className="text-sm font-medium">Hospital record browser available</p>
          <p className="mt-1 text-sm text-muted-foreground">This overview checks API connectivity. The patient directory shows actual imported records.</p><Link href="/patients" className="mt-3 inline-block text-sm text-teal underline">Browse patient records</Link></div>
      </section>
      <ApiStatus />
    </div>
    <section className="rounded-lg border border-border bg-secondary/50 p-6" aria-labelledby="purpose-title">
      <h2 id="purpose-title">Designed for traceable investigation</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">CASETRACE retrieves source records, reconstructs chronology, and verifies proposed findings against original evidence. This prototype uses synthetic data and is not for clinical decisions.</p>
    </section>
    <PatientDirectory />
  </div>;
}
