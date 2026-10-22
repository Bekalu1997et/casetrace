"use client";
import { useCallback } from "react";
import { catalogApi } from "@/lib/api/catalog";
import { useResource } from "@/lib/api/use-resource";
export function useOverview() {
 const load = useCallback(async (signal: AbortSignal) => {
  const [cases, active, queued, completed, limited] = await Promise.all([
   catalogApi.cases({limit:"100",status:"imported"},signal),
   catalogApi.history({status:"running",limit:"1"},signal),catalogApi.history({status:"queued",limit:"1"},signal),
   catalogApi.history({status:"completed",limit:"1"},signal),catalogApi.history({status:"completed_with_limitations",limit:"1"},signal),
  ]);
  return {cases, active:active.total+queued.total, completed:completed.total+limited.total};
 },[]);
 return useResource("hospital-overview",load);
}
