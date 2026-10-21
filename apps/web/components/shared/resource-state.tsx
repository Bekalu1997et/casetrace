"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
export function LoadingState({ children }: { children: ReactNode }) { return <p role="status">{children}</p>; }
export function EmptyState({ children }: { children: ReactNode }) { return <p className="text-sm text-muted-foreground">{children}</p>; }
export function ErrorState({ children, onRetry, retryLabel = "Retry" }: { children: ReactNode; onRetry?: () => void; retryLabel?: string }) {
  return <div role="alert" className="notice">{children}{onRetry && <> <Button variant="outline" onClick={onRetry}>{retryLabel}</Button></>}</div>;
}
