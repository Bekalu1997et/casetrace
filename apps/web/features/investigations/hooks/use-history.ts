"use client";
import { useCallback } from "react";
import { catalogApi } from "@/lib/api/catalog";
import { useResource } from "@/lib/api/use-resource";
export function useHistory(filters: Record<string,string>) {
 const key = JSON.stringify(filters);
 const load = useCallback((signal: AbortSignal) => catalogApi.history(JSON.parse(key) as Record<string,string>, signal),[key]);
 return useResource(key,load);
}
