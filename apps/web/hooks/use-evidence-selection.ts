"use client";
import { useState } from "react";
import type { SourceSelection } from "@/components/evidence/source-panel";
import type { SourceRef } from "@/types/investigation";

// Only source identifiers enter URLs; original record content and quotes do not.
export function useEvidenceSelection(initialSource?: SourceRef) {
  const [selection, setSelection] = useState<SourceSelection[]>(initialSource ? [{ source: initialSource }] : []);
  function select(items: SourceSelection[]) {
    setSelection(items);
    const url = new URL(window.location.href);
    if (items.length === 1) {
      url.searchParams.set("source", items[0].source.id);
      url.searchParams.set("source_type", items[0].source.type);
    } else { url.searchParams.delete("source"); url.searchParams.delete("source_type"); }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
  return [selection, select] as const;
}
