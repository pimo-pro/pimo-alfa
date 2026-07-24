import type {
  IndustrialDocumentOverride,
  IndustrialDocumentOverridesStore,
} from "./industrialDocumentOverridesTypes";
import { emptyIndustrialDocumentOverride } from "./industrialDocumentOverridesTypes";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";
import type {
  IndustrialOnlineAnalysisRow,
  IndustrialOnlineAnalysisTableSection,
} from "./industrialOnlineAnalysisViewTypes";
import { sanitizeIndustrialDocumentOverride } from "./industrialOnlineAnalysisValidation";
import {
  legacyTecnicoRowIdAlias,
  resolveDocumentaryOverride,
} from "./industrialDocumentarySsot";

export type {
  IndustrialOnlineAnalysisEditableColumn,
  IndustrialOnlineAnalysisRow,
  IndustrialOnlineAnalysisTableSection,
} from "./industrialOnlineAnalysisViewTypes";

function lookupRowPatch(
  patches: IndustrialDocumentOverride["rowPatches"],
  deleted: Set<string>,
  rowId: string
): { deleted: boolean; patch: IndustrialDocumentOverride["rowPatches"][string] | undefined } {
  if (deleted.has(rowId)) return { deleted: true, patch: undefined };
  const direct = patches[rowId];
  if (direct) return { deleted: false, patch: direct };
  const legacy = legacyTecnicoRowIdAlias(rowId);
  if (legacy) {
    if (deleted.has(legacy)) return { deleted: true, patch: undefined };
    const legacyPatch = patches[legacy];
    if (legacyPatch) return { deleted: false, patch: legacyPatch };
  }
  return { deleted: false, patch: undefined };
}

export function applyIndustrialDocumentOverrides(
  docId: IndustrialOnlineAnalysisDocId,
  sections: IndustrialOnlineAnalysisTableSection[],
  store: IndustrialDocumentOverridesStore | undefined
): IndustrialOnlineAnalysisTableSection[] {
  const override = resolveDocumentaryOverride(store, docId);
  if (!override) {
    return sections.map((section) => ({
      ...section,
      rows: section.rows.map((row) => ({
        ...row,
        modifiedFields: [],
        pendingDelete: false,
      })),
      modified: false,
    }));
  }

  const deleted = new Set(override.deletedRowIds ?? []);
  const patches = override.rowPatches ?? {};

  return sections.map((section) => {
    const canonicalRows: IndustrialOnlineAnalysisRow[] = [];
    for (const row of section.rows) {
      const looked = lookupRowPatch(patches, deleted, row.rowId);
      if (looked.deleted) continue;
      const patch = looked.patch;
      if (!patch) {
        canonicalRows.push({
          ...row,
          origin: "canonical",
          modifiedFields: [],
          pendingDelete: false,
        });
        continue;
      }
      const cells = { ...row.cells };
      const modifiedFields: string[] = [];
      for (const [key, value] of Object.entries(patch.fields ?? {})) {
        if (cells[key] !== value) {
          cells[key] = value;
          modifiedFields.push(key);
        } else if (!(key in cells)) {
          cells[key] = value;
          modifiedFields.push(key);
        } else {
          modifiedFields.push(key);
        }
      }
      canonicalRows.push({
        ...row,
        cells,
        origin: "canonical",
        modifiedFields: [...new Set(modifiedFields)],
        pendingDelete: false,
      });
    }

    const addedForSection = (override.addedRows ?? []).filter(
      (a) => !a.fields.__sectionId || a.fields.__sectionId === section.id
    );

    const addedRows: IndustrialOnlineAnalysisRow[] = addedForSection.map((a) => {
      const cells: Record<string, string> = {};
      for (const col of section.columns) {
        if (col.key === "__sectionId") continue;
        cells[col.key] = a.fields[col.key] ?? "";
      }
      return {
        rowId: a.tempId,
        cells,
        origin: "added" as const,
        modifiedFields: section.columns.map((c) => c.key),
        pendingDelete: false,
      };
    });

    const rows = [...canonicalRows, ...addedRows];
    const modified =
      rows.some((r) => r.origin === "added" || r.modifiedFields.length > 0) ||
      [...deleted].some((id) =>
        section.rows.some((r) => {
          if (r.rowId === id) return true;
          const legacy = legacyTecnicoRowIdAlias(r.rowId);
          return legacy != null && legacy === id;
        })
      );

    return { ...section, rows, modified };
  });
}

/** Diff draft sections ? override document (relativo ao canónico sem overrides). */
export function buildOverrideFromDraft(input: {
  docId: IndustrialOnlineAnalysisDocId;
  canonicalSections: IndustrialOnlineAnalysisTableSection[];
  draftSections: IndustrialOnlineAnalysisTableSection[];
  actor: { userId: string; userName: string };
  previous?: IndustrialDocumentOverride;
}): IndustrialDocumentOverride {
  const now = new Date().toISOString();
  const actor = {
    userId: input.actor.userId,
    userName: input.actor.userName,
  };
  const prev = input.previous ?? emptyIndustrialDocumentOverride();
  const canonicalById = new Map<string, IndustrialOnlineAnalysisRow>();
  const canonicalSectionByRow = new Map<string, string>();
  for (const section of input.canonicalSections) {
    for (const row of section.rows) {
      canonicalById.set(row.rowId, row);
      canonicalSectionByRow.set(row.rowId, section.id);
    }
  }

  const draftById = new Map<string, { row: IndustrialOnlineAnalysisRow; sectionId: string }>();
  for (const section of input.draftSections) {
    for (const row of section.rows) {
      if (row.pendingDelete) continue;
      draftById.set(row.rowId, { row, sectionId: section.id });
    }
  }

  const deletedRowIds: string[] = [];
  for (const [rowId] of canonicalById) {
    if (!draftById.has(rowId)) deletedRowIds.push(rowId);
  }
  // Keep previous deletes for rows that disappeared from canonical (orphans)
  for (const id of prev.deletedRowIds ?? []) {
    if (!deletedRowIds.includes(id) && !draftById.has(id) && !canonicalById.has(id)) {
      deletedRowIds.push(id);
    }
  }

  const rowPatches: IndustrialDocumentOverride["rowPatches"] = {};
  const addedRows: IndustrialDocumentOverride["addedRows"] = [];

  for (const [rowId, { row, sectionId }] of draftById) {
    if (row.origin === "added" || rowId.startsWith("added:")) {
      addedRows.push({
        tempId: rowId,
        fields: { ...row.cells, __sectionId: sectionId },
        createdAt: prev.addedRows.find((a) => a.tempId === rowId)?.createdAt ?? now,
        createdBy: prev.addedRows.find((a) => a.tempId === rowId)?.createdBy ?? actor,
      });
      continue;
    }
    const canonical = canonicalById.get(rowId);
    if (!canonical) continue;
    const fields: Record<string, string> = {};
    const keys = new Set([...Object.keys(canonical.cells), ...Object.keys(row.cells)]);
    for (const key of keys) {
      if (key === "__sectionId") continue;
      const next = row.cells[key] ?? "";
      const prevVal = canonical.cells[key] ?? "";
      if (next !== prevVal) fields[key] = next;
    }
    if (Object.keys(fields).length > 0) {
      rowPatches[rowId] = {
        fields,
        updatedAt: now,
        updatedBy: actor,
        source: "manual",
      };
    }
  }

  return sanitizeIndustrialDocumentOverride({ rowPatches, addedRows, deletedRowIds });
}

export function documentHasOverrides(
  store: IndustrialDocumentOverridesStore | undefined,
  docId: IndustrialOnlineAnalysisDocId
): boolean {
  const o = resolveDocumentaryOverride(store, docId);
  if (!o) return false;
  return (
    Object.keys(o.rowPatches ?? {}).length > 0 ||
    (o.addedRows?.length ?? 0) > 0 ||
    (o.deletedRowIds?.length ?? 0) > 0
  );
}

export function anyDocumentHasOverrides(
  store: IndustrialDocumentOverridesStore | undefined
): boolean {
  if (!store) return false;
  return (Object.keys(store) as IndustrialOnlineAnalysisDocId[]).some((id) =>
    documentHasOverrides(store, id)
  );
}
