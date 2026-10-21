import type { Anchor } from "@/types/investigation";

// Python offsets count Unicode code points, not JavaScript UTF-16 code units.
export function SourceHighlight({ value, anchor }: { value: unknown; anchor: Anchor }) {
  if (value == null) return <>Anchor unavailable in current source</>;
  const text = String(value), points = Array.from(text);
  const { char_start: start, char_end: end } = anchor;
  if (start == null || end == null) return <mark>{text}</mark>;
  const matches = typeof value === "string" && start >= 0 && end > start && end <= points.length
    && points.slice(start, end).join("") === anchor.quote;
  if (!matches) return <>{text}<span role="alert" className="block text-destructive">Cited text span is unavailable in the current source.</span></>;
  return <>{points.slice(0, start).join("")}<mark>{points.slice(start, end).join("")}</mark>{points.slice(end).join("")}</>;
}
