"use client";
import { useState } from "react";
import Link from "next/link";
import { ApiStatus } from "@/components/system/api-status";
import { PatientDirectory } from "@/features/patients/components/patient-directory";
import { useOverview } from "../hooks/use-overview";
import { ErrorState, InfoNotice } from "@/components/shared/resource-state";
import { SkeletonMetricGrid, SkeletonLoader } from "@/components/shared/skeleton-loader";
import { StatusBadge, Time } from "@/components/shared/presentation";
import { InvestigationHistory } from "@/features/investigations/components/history";
import type { CaseOverview } from "@/types/hospital";

// ─── Featured case card ───────────────────────────────────────────────────────

const MODALITY_LABELS: Record<string, string> = {
  laboratory: "Labs",
  observations: "Labs",
  medications: "Medications",
  documents: "Documents",
  imaging: "Imaging",
  radiology: "Radiology",
  referrals: "Referrals",
  "clinical-notes": "Clinical Notes",
  "clinical_notes": "Clinical Notes",
};

function modalityLabel(raw: string): string {
  const lower = raw.toLowerCase();
  return MODALITY_LABELS[lower] ?? raw;
}

function FeaturedCase({ item }: { item: CaseOverview }) {
  const ready = item.imported && item.status === "imported" && !!item.patient_id;
  return (
    <article className="hospital-card space-y-4" aria-label={`Featured case ${item.case_id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Featured clinical case</p>
          <h2 className="mt-1">
            <Link href={`/cases/${encodeURIComponent(item.case_id)}`} className="hover:underline">
              {item.case_id}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.display_name ?? "Patient identity unavailable"}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        {item.counts.encounters != null && (
          <span><strong className="text-foreground">{item.counts.encounters}</strong> encounters</span>
        )}
        {item.counts.documents != null && (
          <span><strong className="text-foreground">{item.counts.documents}</strong> documents</span>
        )}
        {item.latest_encounter_at && (
          <span>Last encounter: <Time value={item.latest_encounter_at} /></span>
        )}
      </div>

      {item.modalities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.modalities.map((m) => (
            <span key={m} className="status-badge status-neutral">{modalityLabel(m)}</span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {item.patient_id && (
          <Link className="action-link" href={`/patients/${encodeURIComponent(item.patient_id)}`}>
            Open patient chart
          </Link>
        )}
        <Link className="source-link" href={`/cases/${encodeURIComponent(item.case_id)}`}>
          Case details
        </Link>
        {!ready && (
          <span className="text-xs text-muted-foreground">
            Investigation requires an imported case.
          </span>
        )}
      </div>
    </article>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export function Overview() {
  const state = useOverview();
  const [patientTotal, setPatientTotal] = useState<number>();

  // Prefer CASE-001 as featured; fall back to first imported case
  const featuredCase = state.data
    ? (state.data.cases.data.find((c) => c.case_id === "CASE-001" && c.imported) ??
       state.data.cases.data.find((c) => c.imported))
    : undefined;

  const metrics: Array<[string, number | string]> = state.data
    ? [
        ["Available cases", state.data.cases.pagination.total],
        ["Imported patients", patientTotal ?? "Unavailable"],
        ["Active investigations", state.data.active],
        ["Completed investigations", state.data.completed],
        ...(!state.data.cases.pagination.has_more
          ? ([
              ["Available-case encounters", state.data.cases.data.reduce((n, c) => n + (c.counts.encounters ?? 0), 0)],
              ["Available-case documents", state.data.cases.data.reduce((n, c) => n + (c.counts.documents ?? 0), 0)],
            ] as Array<[string, number]>)
          : []),
      ]
    : [];

  return (
    <div className="space-y-7">
      {/* ── Header ── */}
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="eyebrow">Clinical investigation workspace</p>
          <h1>Hospital Overview</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Explore the synthetic clinical archive. Follow original records into an evidence-backed investigation.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <Link className="action-link" href="/investigations/new">
            Start Investigation
          </Link>
          <Link className="source-link" href="/cases">
            Browse Cases
          </Link>
        </div>
      </header>

      {/* ── Metrics ── */}
      {!state.data && !state.error && <SkeletonMetricGrid count={4} />}
      {state.error && <ErrorState onRetry={state.retry}>{state.error}</ErrorState>}
      {state.data && (
        <dl className="hospital-metrics">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* ── Featured case ── */}
      {!state.data && !state.error && <SkeletonLoader variant="card" />}
      {state.data && featuredCase && <FeaturedCase item={featuredCase} />}
      {state.data && !featuredCase && (
        <InfoNotice>
          No imported cases available. Import a validated canonical case to begin an investigation.
        </InfoNotice>
      )}

      {/* ── Recent investigations + system status ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        <InvestigationHistory />
        <ApiStatus />
      </div>

      {/* ── Workflow explanation ── */}
      <section className="hospital-card">
        <h2>Investigation workflow</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {[
            ["01 / Retrieve", "Discover source records across the clinical archive."],
            ["02 / Investigate", "Connect clinical evidence across time with specialized agents."],
            ["03 / Verify", "Check findings against original records deterministically."],
          ].map(([title, text]) => (
            <div key={title}>
              <p className="eyebrow">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Patient directory preview ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Synthetic Patient Directory</h2>
          <Link className="source-link" href="/patients">View all patients →</Link>
        </div>
        <PatientDirectory embedded onTotal={setPatientTotal} />
      </section>
    </div>
  );
}
