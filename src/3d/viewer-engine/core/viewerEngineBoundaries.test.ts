import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const VIEWER_ENGINE_ROOT = join(process.cwd(), "src", "3d", "viewer-engine");
const FORBIDDEN_IMPORT_SEGMENTS = [
  "/industrial/",
  "/cnc/",
  "/fabrication/",
  "/cutlayout/",
  "@/industrial/",
  "@/core/cnc/",
  "@/core/fabrication/",
  "@/core/cutlayout/",
];

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return listSourceFiles(path);
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    return [path];
  });
}

function importSpecifiers(source: string): string[] {
  const specs: string[] = [];
  const importRegex = /\bimport(?:\s+type)?(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']/g;
  for (const match of source.matchAll(importRegex)) {
    const specifier = match[1];
    if (specifier) specs.push(specifier);
  }
  return specs;
}

describe("viewer-engine boundaries", () => {
  it("não importa módulos industriais ou pipelines de fabricação", () => {
    const violations = listSourceFiles(VIEWER_ENGINE_ROOT).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return importSpecifiers(source)
        .map((specifier) => specifier.replaceAll("\\", "/").toLowerCase())
        .filter((specifier) =>
          FORBIDDEN_IMPORT_SEGMENTS.some((segment) => specifier.includes(segment))
        )
        .map((specifier) => `${relative(process.cwd(), file).split(sep).join("/")}: ${specifier}`);
    });

    expect(violations).toEqual([]);
  });
});
