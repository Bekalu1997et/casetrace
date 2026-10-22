const HEADINGS = new Set([
  "chief complaint",
  "history of present illness",
  "hpi",
  "review of systems",
  "physical examination",
  "assessment",
  "plan",
  "assessment and plan",
  "follow-up",
]);

export interface NoteSection {
  heading: string | null;
  text: string;
  sourceText: string;
}

export function parseClinicalNote(text: string): NoteSection[] {
  if (!text) return [];
  const sections: NoteSection[] = [];
  let current: NoteSection = { heading: null, text: "", sourceText: "" };
  for (const line of text.split("\n")) {
    const normalized = line.trim().replace(/:$/, "").toLowerCase();
    if (HEADINGS.has(normalized)) {
      if (current.text) sections.push(current);
      current = { heading: line.trim().replace(/:$/, ""), text: "", sourceText: `${line}\n` };
    } else {
      current.text += `${line}\n`;
      current.sourceText += `${line}\n`;
    }
  }
  if (current.text) sections.push(current);
  return sections;
}

export function StructuredNote({ text }: { text: string | null | undefined }) {
  if (!text) return <p className="text-sm text-muted-foreground">No clinical text recorded.</p>;
  const sections = parseClinicalNote(text);
  const structured = sections.some(section => section.heading);
  if (!structured) return <p className="whitespace-pre-wrap text-sm leading-7">{text}</p>;
  return <div className="space-y-5" aria-label="Structured clinical text">
    {sections.map((section, index) => <section key={`${section.heading ?? "intro"}-${index}`}>
      {section.heading && <h4 className="text-sm font-semibold text-foreground">{section.heading}</h4>}
      {section.text && <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{section.text}</p>}
    </section>)}
  </div>;
}
