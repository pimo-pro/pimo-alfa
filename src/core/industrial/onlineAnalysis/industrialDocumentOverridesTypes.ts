import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";

export type IndustrialDocumentOverrideActor = {
  userId: string;
  userName: string;
};

export type IndustrialRowOverride = {
  fields: Record<string, string>;
  updatedAt: string;
  updatedBy: IndustrialDocumentOverrideActor;
  source: "manual";
};

export type IndustrialAddedRow = {
  tempId: string;
  fields: Record<string, string>;
  createdAt: string;
  createdBy: IndustrialDocumentOverrideActor;
};

export type IndustrialDocumentOverride = {
  rowPatches: Record<string, IndustrialRowOverride>;
  addedRows: IndustrialAddedRow[];
  deletedRowIds: string[];
};

export type IndustrialDocumentOverridesStore = Partial<
  Record<IndustrialOnlineAnalysisDocId, IndustrialDocumentOverride>
>;

export function emptyIndustrialDocumentOverride(): IndustrialDocumentOverride {
  return { rowPatches: {}, addedRows: [], deletedRowIds: [] };
}

export function normalizeIndustrialDocumentOverrides(
  raw: unknown
): IndustrialDocumentOverridesStore {
  if (!raw || typeof raw !== "object") return {};
  const out: IndustrialDocumentOverridesStore = {};
  for (const [docId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Partial<IndustrialDocumentOverride>;
    out[docId as IndustrialOnlineAnalysisDocId] = {
      rowPatches:
        v.rowPatches && typeof v.rowPatches === "object" ? { ...v.rowPatches } : {},
      addedRows: Array.isArray(v.addedRows) ? [...v.addedRows] : [],
      deletedRowIds: Array.isArray(v.deletedRowIds) ? [...v.deletedRowIds] : [],
    };
  }
  return out;
}
