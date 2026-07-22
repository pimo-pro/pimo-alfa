/**
 * Diff puro entre overrides before/after ? entradas de histórico (Fase 3).
 */

import type {
  IndustrialDocumentOverride,
  IndustrialDocumentOverrideActor,
} from "./industrialDocumentOverridesTypes";
import { emptyIndustrialDocumentOverride } from "./industrialDocumentOverridesTypes";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";
import {
  makeHistoryEntryId,
  type IndustrialHistoryEntry,
} from "./industrialDocumentHistoryTypes";

function serializeFields(fields: Record<string, string> | undefined): string {
  if (!fields) return "";
  const keys = Object.keys(fields)
    .filter((k) => k !== "__sectionId")
    .sort();
  const obj: Record<string, string> = {};
  for (const k of keys) obj[k] = fields[k] ?? "";
  return JSON.stringify(obj);
}

export function diffOverridesToHistoryEntries(
  docId: IndustrialOnlineAnalysisDocId,
  beforeRaw: IndustrialDocumentOverride | undefined,
  afterRaw: IndustrialDocumentOverride | undefined,
  actor: IndustrialDocumentOverrideActor,
  ts?: string
): IndustrialHistoryEntry[] {
  const before = beforeRaw ?? emptyIndustrialDocumentOverride();
  const after = afterRaw ?? emptyIndustrialDocumentOverride();
  const now = ts ?? new Date().toISOString();
  const entries: IndustrialHistoryEntry[] = [];

  const push = (
    partial: Omit<IndustrialHistoryEntry, "id" | "ts" | "userId" | "userName" | "docId" | "focus"> & {
      focus?: IndustrialHistoryEntry["focus"];
    }
  ) => {
    const focus = partial.focus ?? {
      rowId: partial.rowId,
      fieldKey: partial.fieldKey,
    };
    entries.push({
      id: makeHistoryEntryId({
        docId,
        rowId: partial.rowId,
        fieldKey: partial.fieldKey,
        changeType: partial.changeType,
        ts: now,
      }),
      ts: now,
      userId: actor.userId,
      userName: actor.userName,
      docId,
      rowId: partial.rowId,
      fieldKey: partial.fieldKey,
      oldValue: partial.oldValue,
      newValue: partial.newValue,
      changeType: partial.changeType,
      focus,
    });
  };

  // --- Added rows ---
  const beforeAdded = new Map(before.addedRows.map((a) => [a.tempId, a]));
  const afterAdded = new Map(after.addedRows.map((a) => [a.tempId, a]));

  for (const [tempId, row] of afterAdded) {
    if (!beforeAdded.has(tempId)) {
      push({
        rowId: tempId,
        fieldKey: "__row__",
        oldValue: null,
        newValue: serializeFields(row.fields),
        changeType: "add",
      });
      for (const [key, value] of Object.entries(row.fields)) {
        if (key === "__sectionId") continue;
        if (!value) continue;
        push({
          rowId: tempId,
          fieldKey: key,
          oldValue: null,
          newValue: value,
          changeType: "modify",
        });
      }
    } else {
      const prev = beforeAdded.get(tempId)!;
      const keys = new Set([
        ...Object.keys(prev.fields ?? {}),
        ...Object.keys(row.fields ?? {}),
      ]);
      for (const key of keys) {
        if (key === "__sectionId") continue;
        const oldV = prev.fields?.[key] ?? "";
        const newV = row.fields?.[key] ?? "";
        if (oldV !== newV) {
          push({
            rowId: tempId,
            fieldKey: key,
            oldValue: oldV,
            newValue: newV,
            changeType: "modify",
          });
        }
      }
    }
  }

  for (const [tempId, row] of beforeAdded) {
    if (!afterAdded.has(tempId)) {
      push({
        rowId: tempId,
        fieldKey: "__row__",
        oldValue: serializeFields(row.fields),
        newValue: null,
        changeType: "remove",
      });
    }
  }

  // --- Deleted canonical rows ---
  const beforeDeleted = new Set(before.deletedRowIds);
  const afterDeleted = new Set(after.deletedRowIds);
  for (const rowId of afterDeleted) {
    if (!beforeDeleted.has(rowId)) {
      const patch = before.rowPatches[rowId];
      push({
        rowId,
        fieldKey: "__row__",
        oldValue: patch ? serializeFields(patch.fields) : rowId,
        newValue: null,
        changeType: "remove",
      });
    }
  }

  // --- Row patches (modifies) ---
  const patchIds = new Set([
    ...Object.keys(before.rowPatches),
    ...Object.keys(after.rowPatches),
  ]);
  for (const rowId of patchIds) {
    if (afterDeleted.has(rowId) && !beforeDeleted.has(rowId)) continue; // already logged as remove
    const b = before.rowPatches[rowId];
    const a = after.rowPatches[rowId];
    if (!a && b) {
      // patch cleared without delete — treat field restores as modify to empty? skip if deleted
      if (afterDeleted.has(rowId)) continue;
      for (const [key, oldV] of Object.entries(b.fields ?? {})) {
        push({
          rowId,
          fieldKey: key,
          oldValue: oldV,
          newValue: null,
          changeType: "modify",
        });
      }
      continue;
    }
    if (!a) continue;
    const bFields = b?.fields ?? {};
    const aFields = a.fields ?? {};
    const keys = new Set([...Object.keys(bFields), ...Object.keys(aFields)]);
    for (const key of keys) {
      const oldV = bFields[key];
      const newV = aFields[key];
      if ((oldV ?? "") === (newV ?? "")) continue;
      if (oldV === undefined && newV !== undefined) {
        push({
          rowId,
          fieldKey: key,
          oldValue: null,
          newValue: newV,
          changeType: "modify",
        });
      } else if (oldV !== undefined && newV === undefined) {
        push({
          rowId,
          fieldKey: key,
          oldValue: oldV,
          newValue: null,
          changeType: "modify",
        });
      } else {
        push({
          rowId,
          fieldKey: key,
          oldValue: oldV ?? null,
          newValue: newV ?? null,
          changeType: "modify",
        });
      }
    }
  }

  return entries;
}
