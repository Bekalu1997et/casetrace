"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function LoadingState({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-sm text-muted-foreground py-4">
      {children}
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground py-4 text-center">
      {children}
    </p>
  );
}

export function ErrorState({
  children,
  onRetry,
  retryLabel = "Retry",
}: {
  children: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div role="alert" className="notice-error flex items-start justify-between gap-4">
      <span className="text-sm">{children}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export function WarningNotice({ children }: { children: ReactNode }) {
  return <div className="notice text-sm">{children}</div>;
}

export function InfoNotice({ children }: { children: ReactNode }) {
  return <div className="notice-info text-sm">{children}</div>;
}
