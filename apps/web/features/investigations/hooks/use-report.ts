"use client";
import { useCallback } from "react";
import { useResource } from "@/lib/api/use-resource";
import { investigationsApi } from "@/lib/api/investigations";
export function useReport(id: string) {
  const load = useCallback(async (signal: AbortSignal) => {
    const [state, report] = await Promise.all([investigationsApi.get(id, signal), investigationsApi.report(id, signal)]);
    if (report.investigation_id !== state.id) throw new Error("Report identity does not match this investigation.");
    const events = [];
    let after = 0;
    while (true) {
      const page = await investigationsApi.events(id, after, signal);
      if (!page.items.length) break;
      events.push(...page.items); after = page.items[page.items.length - 1].sequence;
    }
    return { state, report, events };
  }, [id]);
  const result = useResource(id, load);
  return result;
}
