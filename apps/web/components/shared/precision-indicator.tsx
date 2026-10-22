interface PrecisionIndicatorProps {
  precision: "instant" | "day" | "unknown";
  className?: string;
}

const PRECISION_CONFIG = {
  instant: { symbol: "⏱", label: "Precise timestamp" },
  day: { symbol: "📅", label: "Date only" },
  unknown: { symbol: "?", label: "Unknown precision" },
};

export function PrecisionIndicator({ precision, className = "" }: PrecisionIndicatorProps) {
  const config = PRECISION_CONFIG[precision] ?? PRECISION_CONFIG.unknown;
  return (
    <span
      className={`text-xs ${className}`}
      aria-label={config.label}
      title={config.label}
      role="img"
    >
      {config.symbol}
    </span>
  );
}
