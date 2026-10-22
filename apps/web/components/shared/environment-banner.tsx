export function EnvironmentBanner() {
  return (
    <div
      className="flex flex-col items-end text-right"
      style={{ fontSize: 10, lineHeight: 1.5 }}
      aria-label="Environment notice"
    >
      <p
        className="font-semibold tracking-wide"
        style={{ color: "#0e6b65", letterSpacing: "0.06em" }}
      >
        SYNTHETIC DATA — DEMONSTRATION ENVIRONMENT
      </p>
      <p style={{ color: "#66758a", letterSpacing: "0.04em" }}>
        SYNTHETIC DEMO — NOT FOR CLINICAL USE
      </p>
    </div>
  );
}
