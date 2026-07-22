import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";
import { isIndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";
import { stableHash } from "./industrialOnlineAnalysisRowIds";

export const INDUSTRIAL_DOCUMENT_HISTORY_CAP = 2000;

export type IndustrialHistoryChangeType = "add" | "remove" | "modify";

export type IndustrialHistoryFocus = {
  rowId: string;
  fieldKey: string;
  cellDomId?: string;
};

export type IndustrialHistoryEntry = {
  id: string;
  ts: string;
  userId: string;
  userName: string;
  docId: IndustrialOnlineAnalysisDocId;
  rowId: string;
  fieldKey: string;
  oldValue: string | null;
  newValue: string | null;
  changeType: IndustrialHistoryChangeType;
  focus: IndustrialHistoryFocus;
};

export type IndustrialDocumentHistoryStore = IndustrialHistoryEntry[];

export function makeHistoryEntryId(parts: {
  docId: string;
  rowId: string;
  fieldKey: string;
  changeType: string;
  ts: string;
}): string {
  const payload = `${parts.docId}|${parts.rowId}|${parts.fieldKey}|${parts.changeType}|${parts.ts}|${Math.random().toString(36).slice(2, 8)}`;
  return `hist:${Date.now().toString(36)}:${stableHash(payload)}`;
}

export function normalizeIndustrialDocumentHistory(raw: unknown): IndustrialDocumentHistoryStore {
  if (!Array.isArray(raw)) return [];
  const out: IndustrialHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const e = item as Partial<IndustrialHistoryEntry>;
    if (!e.id || typeof e.id !== "string") continue;
    if (!e.ts || typeof e.ts !== "string") continue;
    if (!isIndustrialOnlineAnalysisDocId(String(e.docId ?? ""))) continue;
    if (!e.rowId || typeof e.rowId !== "string") continue;
    const changeType = e.changeType;
    if (changeType !== "add" && changeType !== "remove" && changeType !== "modify") continue;
    const fieldKey = typeof e.fieldKey === "string" ? e.fieldKey : "__row__";
    const focus: IndustrialHistoryFocus = {
      rowId: typeof e.focus?.rowId === "string" ? e.focus.rowId : e.rowId,
      fieldKey: typeof e.focus?.fieldKey === "string" ? e.focus.fieldKey : fieldKey,
      ...(typeof e.focus?.cellDomId === "string" ? { cellDomId: e.focus.cellDomId } : {}),
    };
    out.push({
      id: e.id,
      ts: e.ts,
      userId: typeof e.userId === "string" ? e.userId : "unknown",
      userName: typeof e.userName === "string" ? e.userName : "—",
      docId: e.docId as IndustrialOnlineAnalysisDocId,
      rowId: e.rowId,
      fieldKey,
      oldValue: e.oldValue == null ? null : String(e.oldValue),
      newValue: e.newValue == null ? null : String(e.newValue),
      changeType,
      focus,
    });
  }
  return out.slice(-INDUSTRIAL_DOCUMENT_HISTORY_CAP);
}

export function appendIndustrialDocumentHistory(
  prev: IndustrialDocumentHistoryStore | undefined,
  entries: IndustrialHistoryEntry[]
): IndustrialDocumentHistoryStore {
  if (!entries.length) return prev ?? [];
  const next = [...(prev ?? []), ...entries];
  if (next.length <= INDUSTRIAL_DOCUMENT_HISTORY_CAP) return next;
  return next.slice(next.length - INDUSTRIAL_DOCUMENT_HISTORY_CAP);
}
