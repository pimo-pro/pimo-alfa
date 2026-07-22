import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";

/** Hash curto e estável para rowIds derivados. */
export function stableHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function makeCanonicalRowId(
  docId: IndustrialOnlineAnalysisDocId,
  sectionId: string,
  parts: Array<string | number | null | undefined>
): string {
  const payload = parts.map((p) => String(p ?? "").trim()).join("|");
  return `c:${docId}:${sectionId}:${stableHash(payload)}`;
}

export function makeAddedRowId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `added:${uuid}`;
}

export function makeIndicatorRowId(
  docId: IndustrialOnlineAnalysisDocId,
  indicatorKey: string
): string {
  return `indicator:${docId}:${indicatorKey}`;
}
