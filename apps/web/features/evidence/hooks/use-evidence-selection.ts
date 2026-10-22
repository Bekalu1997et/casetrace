"use client";
import { useEffect, useState } from "react";
import type { SourceSelection } from "@/features/evidence/navigation";
import type { SourceRef } from "@/types/investigation";

// Only source identifiers enter URLs; original record content and quotes do not.
export function useEvidenceSelection(initialSource?: SourceRef) {
  function restoreSelection(useInitial = false): SourceSelection[] {
    if (typeof window === "undefined") return initialSource ? [{ source: initialSource }] : [];
    const params = new URL(window.location.href).searchParams;
    const compared = params.getAll("compare");
    if (compared.length) {
      // Malformed display selection is ignored; it never supplies source content.
      try {
        return compared.map(value => {
          const pair: unknown = JSON.parse(value);
          if (!Array.isArray(pair) || pair.length !== 2 || !pair.every(item => typeof item === "string" && item.length > 0)) throw new Error("Invalid source selection");
          return { source: { type: pair[0] as string, id: pair[1] as string } };
        });
      } catch { return []; }
    }
    const id = params.get("source"), type = params.get("source_type");
    return id && type ? [{ source: { id, type } }] : useInitial && initialSource ? [{ source: initialSource }] : [];
  }
  const [selection, setSelection] = useState<SourceSelection[]>(() => restoreSelection(true));
  useEffect(() => {
    const restore = () => {
      setSelection(restoreSelection());
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  });
  function select(items: SourceSelection[]) {
    setSelection(items);
    const url = new URL(window.location.href);
    url.searchParams.delete("compare");
    if (items.length === 1) {
      url.searchParams.set("source", items[0].source.id);
      url.searchParams.set("source_type", items[0].source.type);
    } else {
      url.searchParams.delete("source"); url.searchParams.delete("source_type");
      items.forEach(item => url.searchParams.append("compare", JSON.stringify([item.source.type, item.source.id])));
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }
  return [selection, select] as const;
}
