"use client";
import Link from "next/link";
import { useState } from "react";
import { useCase, useCases } from "../hooks/use-cases";
import { EmptyState, ErrorState, WarningNotice } from "@/components/shared/resource-state";
import { SkeletonLoader } from "@/components/shared/skeleton-loader";
import { StatusBadge, Time } from "@/components/shared/presentation";
import { InvestigationHistory } from "@/features/investigations/components/history";
import { StartInvestigation } from "@/features/investigations/components/start-investigation";
import type { CaseOverview } from "@/types/hospital";

// ─── Modality display ─────────────────────────────────────────────────────────

const MODALITY_MAP: Record<string, string> = {
  laboratory: "Labs",
  observations: "Labs",
  medications: "Medications",
  documents: "Documents",
  imaging: "Imaging",
  radiology: "Radiology",
  referrals: "Referrals",
  "clinical-notes": "Clinical Notes",
  clinical_notes: "Clinical Notes",
  "clinical_events": "Clinical Events",
};

function modalityLabel(raw: string): string {
  return MODALITY_MAP[raw.toLowerCase()] ?? raw;
}

// ─── Case card ────────────────────────────────────────────────────────────────

export function CaseCard({ item, detail = false }: { item: CaseOverview; detail?: boolean }) {
  const canInvestigate = item.imported && item.status === "imported" && !!item.patient_id;
  // Chart link available when patient_id exists — display_name not required
  const canOpenChart = !!item.patient_id;

  return (
    <article className="hospital-card space-y-4">
      {/* Identity row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Synthetic clinical archive</p>
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

      {/* Record counts */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
        {item.counts.encounters != null && (
          <span><strong className="text-foreground">{item.counts.encounters}</strong> encounters</span>
        )}
        {item.counts.documents != null && (
          <span><strong className="text-foreground">{item.counts.documents}</strong> documents</span>
        )}
        {item.counts.observations != null && item.counts.observations > 0 && (
          <span><strong className="text-foreground">{item.counts.observations}</strong> observations</span>
        )}
        {item.counts.medications != null && item.counts.medications > 0 && (
          <span><strong className="text-foreground">{item.counts.medications}</strong> medications</span>
        )}
      </div>

      {/* Latest encounter */}
      {item.latest_encounter_at && (
        <p className="text-sm text-muted-foreground">
          Last documented encounter: <Time value={item.latest_encounter_at} />
        </p>
      )}

      {/* Modality badges */}
      {item.modalities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {item.modalities.map((m) => (
            <span key={m} className="status-badge status-neutral">{modalityLabel(m)}</span>
          ))}
        </div>
      )}

      {/* Dataset info */}
      {(item.version || item.dataset_status) && (
        <p className="text-xs text-muted-foreground">
          Dataset {item.version ?? "—"} · {item.dataset_status ?? "status unavailable"}
        </p>
      )}

      {/* Detail: full record inventory */}
      {detail && (
        <div className="space-y-3 pt-2 border-t border-border">
          <h3 className="font-semibold text-sm">Record inventory</h3>
          <dl className="hospital-metrics">
            {Object.entries(item.counts).map(([key, value]) => (
              <div key={key}>
                <dt>{key.replaceAll("_", " ")}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {canOpenChart && (
          <Link
            className="source-link"
            href={`/patients/${encodeURIComponent(item.patient_id!)}`}
          >
            Open patient chart
          </Link>
        )}
        {!detail && (
          <Link className="source-link" href={`/cases/${encodeURIComponent(item.case_id)}`}>
            Open case
          </Link>
        )}
        {canInvestigate && (
          <StartInvestigation patientId={item.patient_id!} caseId={item.case_id} />
        )}
      </div>

      {/* Not-ready notice */}
      {!canInvestigate && item.status !== "imported" && (
        <p className="text-xs text-muted-foreground">
          {item.status === "not_present"
            ? "This case has not been imported. Existing imported records, if linked, remain available."
            : item.status === "missing_assets"
            ? "Some assets are missing. The case may be partially accessible."
            : item.status === "invalid"
            ? "This case failed validation and is not ready for investigation."
            : item.status === "source_conflict"
            ? "A source conflict was detected. Review the case before investigating."
            : "This case is not ready for investigation."}
        </p>
      )}
    </article>
  );
}

// ─── Case library ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "imported", label: "Imported" },
  { value: "available_not_imported", label: "Available, not imported" },
  { value: "invalid", label: "Invalid" },
  { value: "missing_assets", label: "Missing assets" },
  { value: "source_conflict", label: "Source conflict" },
  { value: "not_present", label: "Not present" },
];

export function CaseLibrary() {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);

  const filters = {
    ...(appliedQuery ? { case_id: appliedQuery } : {}),
    ...(status ? { status } : {}),
    offset: String(offset),
  };
  const state = useCases(filters);

  const total = state.data?.pagination.total ?? 0;
  const limit = state.data?.pagination.limit ?? 20;
  const start = offset + 1;
  const end = Math.min(offset + limit, total);
  const hasFilters = !!appliedQuery || !!status;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setAppliedQuery(query.trim());
    setOffset(0);
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    setOffset(0);
  }

  function handleClear() {
    setQuery("");
    setAppliedQuery("");
    setStatus("");
    setOffset(0);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Hospital workspace</p>
        <h1>Case Library</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Imported records and locally validated canonical cases. Planned cases are not ready records.
        </p>
      </header>

      {/* Filters */}
      <form
        className="hospital-filters"
        onSubmit={handleSearch}
        aria-label="Case filters"
      >
        <label>
          Case identifier
          <input
            className="field block"
            name="case_id"
            value={query}
            placeholder="Exact case ID"
            pattern="[A-Za-z0-9][A-Za-z0-9_-]*"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Availability
          <select
            className="field block"
            value={status}
            aria-label="Availability"
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button className="source-link" type="submit">Search cases</button>
        {hasFilters && (
          <button className="source-link" type="button" onClick={handleClear}>
            Clear filters
          </button>
        )}
      </form>

      {/* Loading */}
      {!state.data && !state.error && (
        <div className="grid gap-5 xl:grid-cols-2">
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="card" />
        </div>
      )}

      {/* Error */}
      {state.error && <ErrorState onRetry={state.retry}>{state.error}</ErrorState>}

      {/* Results */}
      {state.data && (
        <>
          {!state.data.data.length && (
            <EmptyState>
              {hasFilters
                ? "No cases match the current filters. Try clearing the filters to see all cases."
                : "No cases available. Import a validated canonical case to populate the library."}
            </EmptyState>
          )}

          {state.data.data.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                Showing {start}–{end} of {total} case{total !== 1 ? "s" : ""}
              </p>
              <div className="grid gap-5 xl:grid-cols-2">
                {state.data.data.map((item) => (
                  <CaseCard key={item.case_id} item={item} />
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <button
              className="source-link"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              Previous cases
            </button>
            <button
              className="source-link"
              disabled={!state.data.pagination.has_more}
              onClick={() => setOffset(offset + limit)}
            >
              Next cases
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Case detail ──────────────────────────────────────────────────────────────

export function CaseDetail({ caseId }: { caseId: string }) {
  const state = useCase(caseId);

  return (
    <div className="space-y-6">
      <nav aria-label="Case navigation">
        <Link className="source-link" href="/cases">← Case Library</Link>
      </nav>

      <header>
        <p className="eyebrow">Case detail</p>
        <h1>{caseId}</h1>
      </header>

      {!state.data && !state.error && (
        <div className="space-y-4">
          <SkeletonLoader variant="card" />
          <SkeletonLoader variant="content" />
        </div>
      )}
      {state.error && <ErrorState onRetry={state.retry}>{state.error}</ErrorState>}

      {state.data && (
        <>
          <CaseCard item={state.data} detail />

          {!state.data.imported && (
            <WarningNotice>
              This case has not been imported into the hospital system. Investigation requires an imported case.
            </WarningNotice>
          )}

          {state.data.imported && (
            <InvestigationHistory caseId={caseId} />
          )}
        </>
      )}
    </div>
  );
}
