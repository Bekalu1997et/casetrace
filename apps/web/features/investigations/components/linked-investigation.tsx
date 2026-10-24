"use client";
import Link from "next/link";
import { useInvestigation } from "../hooks/use-investigation";
import { StatusBadge } from "@/components/shared/presentation";
import { Button } from "@/components/ui/button";

export function LinkedInvestigation({ id }: { id: string }) {
  // Each child owns its own REST reconciliation and SSE cursor through the existing hook.
  const { state, error, connection, retry } = useInvestigation(id);
  return <div className="linked-investigation">
    <strong>Linked investigation</strong>
    <p className="break-all">{id}</p>
    <div role="status" className="flex flex-wrap gap-2 items-center text-xs my-2">
      {state ? <StatusBadge status={state.status} /> : "Loading persisted status..."}
      <span>{connection}</span>
    </div>
    {error && <p role="alert">{error} <Button variant="outline" onClick={retry}>Refresh linked run</Button></p>}
    <Link className="source-link" href={`/investigations/${encodeURIComponent(id)}`}>Open investigation / follow progress &rarr;</Link>
  </div>;
}
