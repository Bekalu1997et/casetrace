"use client";

interface SkeletonProps {
  variant: "card" | "metric" | "table" | "content" | "finding";
  rows?: number;
  className?: string;
}

export function SkeletonLoader({ variant, rows = 5, className = "" }: SkeletonProps) {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className={className}>
      <span className="sr-only">Loading…</span>
      {variant === "metric" && (
        <div className="skeleton-card">
          <div className="skeleton skeleton-text w-20 mb-3" />
          <div className="skeleton skeleton-heading w-12" style={{ height: 28 }} />
        </div>
      )}
      {variant === "card" && (
        <div className="skeleton-card space-y-3">
          <div className="skeleton skeleton-heading w-2/3" />
          <div className="skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-4/5" />
          <div className="skeleton skeleton-text w-1/2" />
        </div>
      )}
      {variant === "table" && (
        <div className="space-y-px">
          <div className="skeleton skeleton-row w-full opacity-60" style={{ height: 36 }} />
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="skeleton skeleton-row w-full" style={{ opacity: 1 - i * 0.08 }} />
          ))}
        </div>
      )}
      {variant === "content" && (
        <div className="skeleton-card space-y-3">
          <div className="skeleton skeleton-heading w-1/2" />
          <div className="skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-3/4" />
          <div className="mt-4 skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-5/6" />
        </div>
      )}
      {variant === "finding" && (
        <div className="skeleton-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="skeleton w-16 h-5 rounded-full" />
            <div className="skeleton skeleton-text w-24" />
          </div>
          <div className="skeleton skeleton-heading w-3/4" />
          <div className="skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-5/6" />
          <div className="flex gap-2 mt-2">
            <div className="skeleton w-24 h-7 rounded-md" />
            <div className="skeleton w-24 h-7 rounded-md" />
          </div>
        </div>
      )}
    </div>
  );
}

export function SkeletonMetricGrid({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading metrics" aria-busy="true" className="hospital-metrics">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card space-y-3">
          <div className="skeleton skeleton-text w-20" />
          <div className="skeleton skeleton-heading w-12" style={{ height: 28 }} />
        </div>
      ))}
    </div>
  );
}
