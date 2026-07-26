/**
 * technicalSections.ts — Helpers estruturais reutilizáveis (dados, sem layout gráfico).
 */

export type DocsTextBlock = {
  kind: "text";
  title?: string;
  lines: string[];
};

export type DocsKeyValueBlock = {
  kind: "keyValue";
  title?: string;
  rows: Array<{ label: string; value: string }>;
};

export type DocsTableBlock = {
  kind: "table";
  title?: string;
  columns: string[];
  rows: string[][];
};

export type DocsSectionBlock = DocsTextBlock | DocsKeyValueBlock | DocsTableBlock;

export type DocsSection = {
  id: string;
  title: string;
  blocks: DocsSectionBlock[];
};

export function sectionHeader(id: string, title: string, blocks: DocsSectionBlock[] = []): DocsSection {
  return { id, title, blocks };
}

export function textBlock(lines: string[], title?: string): DocsTextBlock {
  return title ? { kind: "text", title, lines } : { kind: "text", lines };
}

export function keyValueBlock(
  rows: Array<{ label: string; value: string }>,
  title?: string
): DocsKeyValueBlock {
  return title ? { kind: "keyValue", title, rows } : { kind: "keyValue", rows };
}

export function tableBlock(columns: string[], rows: string[][], title?: string): DocsTableBlock {
  return title ? { kind: "table", title, columns, rows } : { kind: "table", columns, rows };
}

export function fmtMm(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 100) / 100} mm`;
}

export function fmtM2(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(Math.round(n * 10000) / 10000).toFixed(4)} m²`;
}

export function safeStr(v: unknown, fallback = "—"): string {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s || fallback;
}
