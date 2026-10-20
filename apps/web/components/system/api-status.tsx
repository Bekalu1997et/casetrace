"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { healthApi } from "@/lib/api/health";
import type { HealthResponse } from "@/types/api";

type Status = { kind: "loading" } | { kind: "connected"; health: HealthResponse }
  | { kind: "error"; message: string };

export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    healthApi.getHealth(controller.signal).then(
      health => { if (!controller.signal.aborted) setStatus({ kind: "connected", health }); },
      error => { if (!controller.signal.aborted) setStatus({ kind: "error", message:
        error instanceof Error ? error.message : "API connection failed." }); },
    );
    return () => controller.abort();
  }, [attempt]);

  return <section aria-labelledby="connection-title" className="rounded-lg border border-border bg-card p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="eyebrow">System connection</p><h2 id="connection-title">API &amp; persistence</h2></div>
      <Button variant="outline" disabled={status.kind === "loading"} onClick={() => {
        setStatus({ kind: "loading" }); setAttempt(value => value + 1);
      }}>Check connection</Button>
    </div>
    <div role="status" aria-live="polite" className="mt-5">
      {status.kind === "loading" && <p className="text-muted-foreground">Checking API connection…</p>}
      {status.kind === "connected" && <>
        <p className="font-medium text-success">API connected</p>
        <p className="mt-1 text-sm text-muted-foreground">Version {status.health.version} · Database connected</p>
      </>}
      {status.kind === "error" && <p className="text-destructive">{status.message}</p>}
    </div>
  </section>;
}
