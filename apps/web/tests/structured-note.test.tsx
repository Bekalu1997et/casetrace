import { describe, expect, it } from "vitest";
import { parseClinicalNote, StructuredNote } from "@/features/documents/components/structured-note";
import { render, screen } from "@testing-library/react";

describe("clinical note presentation", () => {
  it("recognizes exact supported headings without rewriting source text", () => {
    const source = "Chief Complaint:\nHeadache\n\nAssessment\nStable\nPlan: return tomorrow";
    const sections = parseClinicalNote(source);

    expect(sections.map(section => section.heading)).toEqual(["Chief Complaint", "Assessment"]);
    expect(sections.map(section => section.sourceText).join("")).toBe(source + "\n");
  });

  it("falls back to plain text for an unstructured note", () => {
    const source = "The assessment was discussed with the patient.";
    render(<StructuredNote text={source} />);

    expect(screen.getByText(source)).toBeVisible();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders recognized sections as headings while retaining their text", () => {
    render(<StructuredNote text={"HPI:\nReported fatigue\n\nPlan:\nFollow up"} />);

    expect(screen.getByRole("heading", { name: "HPI" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Plan" })).toBeVisible();
    expect(screen.getByText("Reported fatigue")).toBeVisible();
  });
});
