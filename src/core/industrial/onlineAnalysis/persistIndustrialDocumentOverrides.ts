/**
 * Persisténcia de overrides + histórico industriais no snapshot PROJETOS / offline.
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

export async function persistIndustrialDocumentOverridesToRecord(
  record: SavedProjectRecord,
  projectState: ProjectState,
  nextOverrides: IndustrialDocumentOverridesStore,
  options?: { historyDocId?: IndustrialOnlineAnalysisDocId; previousOverride?: IndustrialDocumentOverride }
): Promise<SavedProjectRecord> {
  const user = getCurrentProjectUser();
  let nextHistory = projectState.industrialDocumentHistory ?? [];

  if (options?.historyDocId) {
    const before =
      options.previousOverride ??
      projectState.industrialDocumentOverrides?.[options.historyDocId];
    const after = nextOverrides[options.historyDocId];
    const entries = diffOverridesToHistoryEntries(
      options.historyDocId,
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
  const next = { ...(store ?? {}) };
  const empty =
    Object.keys(override.rowPatches).length === 0 &&
    override.addedRows.length === 0 &&
    override.deletedRowIds.length === 0;
  if (empty) {
    delete next[docId];
  } else {
    next[docId] = override;
  }
  return next;
}

export function applyOverrideWithHistory(
  prev: ProjectState,
  docId: IndustrialOnlineAnalysisDocId,
  nextOverride: IndustrialDocumentOverride,
  actor: { userId: string; userName: string }
): Pick<ProjectState, "industrialDocumentOverrides" | "industrialDocumentHistory"> {
  const before = prev.industrialDocumentOverrides?.[docId];
  const nextOverrides = mergeDocOverride(prev.industrialDocumentOverrides, docId, nextOverride);
  const entries = diffOverridesToHistoryEntries(docId, before, nextOverrides[docId], actor);
  return {
    industrialDocumentOverrides: nextOverrides,
    industrialDocumentHistory: appendIndustrialDocumentHistory(
      prev.industrialDocumentHistory,
      entries
    ),
  };
}

export type { IndustrialDocumentHistoryStore };
