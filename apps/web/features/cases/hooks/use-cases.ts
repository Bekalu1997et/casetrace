"use client";
import { useCallback } from "react";
import { useResource } from "@/lib/api/use-resource";
import { catalogApi } from "@/lib/api/catalog";
export function useCases(filters: Record<string, string>) {
  const key = JSON.stringify(filters);
  const load = useCallback((signal: AbortSignal) => catalogApi.cases(JSON.parse(key) as Record<string,string>, signal), [key]);
  return useResource(key, load);
}
export function useCase(id: string) {
  const load = useCallback((signal: AbortSignal) => catalogApi.case(id, signal), [id]);
  return useResource(id, load);
}
