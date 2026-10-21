import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}
const paths = ["app", "features", "components", "lib", "types"].flatMap(name => files(resolve(root, name)));
const graph = new Map<string, string[]>();
for (const path of paths) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest);
  const imports: string[] = [];
  source.forEachChild(node => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
  });
  graph.set(path, imports);
}

it("keeps transport, shared UI, routes and evaluator boundaries enforceable", () => {
  for (const [path, imports] of graph) {
    const name = relative(root, path).replaceAll("\\", "/");
    const text = readFileSync(path, "utf8");
    expect(imports.filter(value => /evaluation|ground.truth|data\/cases|agent.tools/.test(value)), name).toEqual([]);
    if (name.startsWith("components/")) expect(imports.filter(value => value.includes("/features/")), name).toEqual([]);
    if (name.startsWith("features/")) {
      expect(text, name).not.toMatch(/\bfetch\s*\(|https?:\/\//);
      // Source errors may use the normalized error class; no direct request calls.
      expect(text, name).not.toMatch(/\brequest\s*\(/);
      if (!name.includes("/hooks/")) expect(text, name).not.toMatch(/readInvestigationStream/);
    }
    if (name.startsWith("app/") && name.endsWith("page.tsx")) expect(text.split("\n").length, name).toBeLessThan(25);
    if (!name.startsWith("lib/")) expect(text, name).not.toMatch(/getReader\s*\(|new EventSource/);
  }
});

it("contains no circular module dependencies", () => {
  const visited = new Set<string>(), active = new Set<string>();
  function visit(path: string) {
    if (active.has(path)) throw new Error(`Circular dependency: ${relative(root, path)}`);
    if (visited.has(path)) return;
    active.add(path);
    for (const dependency of graph.get(path) ?? []) {
      const target = dependency.startsWith("@/") ? resolve(root, dependency.slice(2)) : dependency.startsWith(".") ? resolve(dirname(path), dependency) : undefined;
      if (!target) continue;
      const found = [target + ".ts", target + ".tsx", resolve(target, "index.ts")].find(candidate => graph.has(candidate));
      if (found) visit(found);
    }
    active.delete(path); visited.add(path);
  }
  paths.forEach(visit);
});
