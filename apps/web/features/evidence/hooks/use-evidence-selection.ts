"use client";
import { useEffect, useState } from "react";
import type { SourceSelection } from "@/features/evidence/navigation";
import type { SourceRef } from "@/types/investigation";

// Only source identifiers enter URLs; original record content and quotes do not.
export function useEvidenceSelection(initialSource?: SourceRef) {
  const [selection, setSelection] = useState<SourceSelection[]>(initialSource ? [{ source: initialSource }] : []);
  useEffect(() => {
    const restore = () => {
      const params = new URL(window.location.href).searchParams;
      const id = params.get("source"), type = params.get("source_type");
      setSelection(id && type ? [{ source: { id, type } }] : []);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  function select(items: SourceSelection[]) {
    setSelection(items);
    const url = new URL(window.location.href);
    if (items.length === 1) {
      url.searchParams.set("source", items[0].source.id);
      url.searchParams.set("source_type", items[0].source.type);
    } else { url.searchParams.delete("source"); url.searchParams.delete("source_type"); }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }
  return [selection, select] as const;
}
