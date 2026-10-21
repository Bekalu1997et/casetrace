"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { investigationsApi } from "@/lib/api/investigations";
import { Button } from "@/components/ui/button";
import type { Objective } from "@/types/investigation";

export function StartInvestigation({ patientId, caseId }: { patientId: string; caseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [objective, setObjective] = useState<Objective>("full_record_investigation");
  const locked = useRef(false);
  async function start() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(undefined);
    try {
      const storageKey = `casetrace:creation:${patientId}:${objective}`;
      let key = sessionStorage.getItem(storageKey);
      if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(storageKey, key); }
      const result = await investigationsApi.create(patientId, objective, key);
      sessionStorage.setItem(`casetrace:created:${result.investigation_id}`, storageKey);
      // Retain the key until navigation completes; reload/retry resolves the same run.
      router.push(`/investigations/${encodeURIComponent(result.investigation_id)}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Investigation could not be created.");
      locked.current = false; setBusy(false);
    }
  }
  return <div className="space-y-3">
    <Button onClick={() => setOpen(true)} disabled={open}>Start investigation</Button>
    {open && <section className="rounded-lg border border-teal/30 bg-accent p-5 space-y-3" aria-label="Investigation context"><h2>Review investigation context</h2>
      <p className="text-sm">Patient {patientId} · {caseId}. Investigate available hospital records, compare chronology, verify evidence, and produce a source-backed report.</p>
      <label className="block text-sm">Investigation objective<select className="field block" value={objective} disabled={busy} onChange={event => setObjective(event.target.value as Objective)}>
        {(["full_record_investigation", "timeline_investigation", "contradiction_investigation", "medication_investigation", "laboratory_investigation"] as const).map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
      </select></label><p className="text-xs text-muted-foreground">Execution mode is configured by the backend. Source records remain read-only. Repeated submission of this request opens the same run.</p>
      {error && <p role="alert">{error}</p>}
      <div className="flex gap-3"><Button disabled={busy} onClick={() => void start()}>{busy ? "Creating investigation…" : "Begin investigation"}</Button><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button></div>
    </section>}
  </div>;
}
