/**
 * Persistùncia de overrides + histùrico industriais no snapshot PROJETOS / offline.
 */

import { serializeState } from "@/context/projectPersistence";
import type { ProjectState } from "@/context/projectTypes";
import { applyResultados } from "@/context/projectState";
import { saveProject } from "@/core/projects/projectsClient";
import type { SavedProjectRecord } from "@/core/projects/types";
import { getCurrentProjectUser } from "@/core/projects/currentUser";
import type { IndustrialDocumentOverridesStore } from "./industrialDocumentOverridesTypes";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";
import type { IndustrialDocumentOverride } from "./industrialDocumentOverridesTypes";
import type { IndustrialDocumentHistoryStore } from "./industrialDocumentHistoryTypes";
import { appendIndustrialDocumentHistory } from "./industrialDocumentHistoryTypes";
import { diffOverridesToHistoryEntries } from "./diffOverridesToHistoryEntries";
import { getDocumentaryOverrideDocId } from "./industrialDocumentarySsot";

export async function persistIndustrialDocumentOverridesToRecord(
  record: SavedProjectRecord,
  projectState: ProjectState,
  nextOverrides: IndustrialDocumentOverridesStore,
  options?: { historyDocId?: IndustrialOnlineAnalysisDocId; previousOverride?: IndustrialDocumentOverride }
): Promise<SavedProjectRecord> {
  const user = getCurrentProjectUser();
  let nextHistory = projectState.industrialDocumentHistory ?? [];

  if (options?.historyDocId) {
    const historyKey = getDocumentaryOverrideDocId(options.historyDocId);
    const before =
      options.previousOverride ??
      projectState.industrialDocumentOverrides?.[historyKey] ??
      (historyKey === "cutlist" ? projectState.industrialDocumentOverrides?.tecnico : undefined);
    const after = nextOverrides[historyKey];
    const entries = diffOverridesToHistoryEntries(
      historyKey,
      before,
      after,
      { userId: user.ownerId, userName: user.ownerName }
    );
    nextHistory = appendIndustrialDocumentHistory(nextHistory, entries);
  }

  const nextState: ProjectState = applyResultados({
    ...projectState,
    industrialDocumentOverrides: nextOverrides,
    industrialDocumentHistory: nextHistory,
  });
  const snapshot = {
    projectState: serializeState(nextState),
    viewerSnapshot: record.snapshot?.viewerSnapshot ?? null,
    roomSnapshot: record.snapshot?.roomSnapshot,
  };
  const saved = await saveProject({
    name: record.name,
    ownerId: record.ownerId || user.ownerId,
    ownerName: record.ownerName || user.ownerName,
    snapshot,
    localProjectId: record.id,
  });
  const updated: SavedProjectRecord = {
    ...record,
    id: saved?.id ?? record.id,
    name: saved?.name ?? record.name,
    updatedAt: saved?.updatedAt ?? new Date().toISOString(),
    snapshot,
  };
  return updated;
}

export function mergeDocOverride(
  store: IndustrialDocumentOverridesStore | undefined,
  docId: IndustrialOnlineAnalysisDocId,
  override: IndustrialDocumentOverride
): IndustrialDocumentOverridesStore {
  const key = getDocumentaryOverrideDocId(docId);
  const next = { ...(store ?? {}) };
  const empty =
    Object.keys(override.rowPatches).length === 0 &&
    override.addedRows.length === 0 &&
    override.deletedRowIds.length === 0;
  if (empty) {
    delete next[key];
  } else {
    next[key] = override;
  }
  // Cutlist SSOT: limpar chave legado `tecnico` para nùo divergir.
  if (key === "cutlist" && "tecnico" in next) {
    delete next.tecnico;
  }
  return next;
}

export function applyOverrideWithHistory(
  prev: ProjectState,
  docId: IndustrialOnlineAnalysisDocId,
  nextOverride: IndustrialDocumentOverride,
  actor: { userId: string; userName: string }
): Pick<ProjectState, "industrialDocumentOverrides" | "industrialDocumentHistory"> {
  const storeKey = getDocumentaryOverrideDocId(docId);
  const before =
    prev.industrialDocumentOverrides?.[storeKey] ??
    (storeKey === "cutlist" ? prev.industrialDocumentOverrides?.tecnico : undefined);
  const nextOverrides = mergeDocOverride(prev.industrialDocumentOverrides, docId, nextOverride);
  const entries = diffOverridesToHistoryEntries(storeKey, before, nextOverrides[storeKey], actor);
  return {
    industrialDocumentOverrides: nextOverrides,
    industrialDocumentHistory: appendIndustrialDocumentHistory(
      prev.industrialDocumentHistory,
      entries
    ),
  };
}

export type { IndustrialDocumentHistoryStore };
