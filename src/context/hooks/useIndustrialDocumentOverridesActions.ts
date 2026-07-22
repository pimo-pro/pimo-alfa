import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import { applyResultados, appendChangelog } from "../projectState";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { getCurrentProjectUser } from "../../core/projects/currentUser";
import type { IndustrialOnlineAnalysisDocId } from "../../core/industrial/onlineAnalysis/industrialOnlineAnalysisDocs";
import type { IndustrialDocumentOverride } from "../../core/industrial/onlineAnalysis/industrialDocumentOverridesTypes";
import { emptyIndustrialDocumentOverride } from "../../core/industrial/onlineAnalysis/industrialDocumentOverridesTypes";
import { makeAddedRowId } from "../../core/industrial/onlineAnalysis/industrialOnlineAnalysisRowIds";
import { applyOverrideWithHistory } from "../../core/industrial/onlineAnalysis/persistIndustrialDocumentOverrides";

export type IndustrialDocumentOverridesActions = Pick<
  ProjectActions,
  "setDocumentOverrides" | "patchDocumentRow" | "addDocumentRow" | "deleteDocumentRow"
>;

export function useIndustrialDocumentOverridesActions(
  ctx: ProjectActionsExecutionContext
): IndustrialDocumentOverridesActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      setDocumentOverrides: (docId, override) => {
        const user = getCurrentProjectUser();
        updateProject(
          (prev) =>
            applyResultados({
              ...prev,
              ...applyOverrideWithHistory(prev, docId, override, {
                userId: user.ownerId,
                userName: user.ownerName,
              }),
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "doc",
                message: `Overrides industriais atualizados — ${docId}`,
              }),
            }),
          true
        );
      },

      patchDocumentRow: (docId, rowId, fields) => {
        if (!rowId.trim()) return;
        const user = getCurrentProjectUser();
        updateProject((prev) => {
          const current =
            prev.industrialDocumentOverrides?.[docId] ?? emptyIndustrialDocumentOverride();
          const existing = current.rowPatches[rowId];
          const nextOverride: IndustrialDocumentOverride = {
            ...current,
            rowPatches: {
              ...current.rowPatches,
              [rowId]: {
                fields: { ...(existing?.fields ?? {}), ...fields },
                updatedAt: new Date().toISOString(),
                updatedBy: { userId: user.ownerId, userName: user.ownerName },
                source: "manual",
              },
            },
          };
          return applyResultados({
            ...prev,
            ...applyOverrideWithHistory(prev, docId, nextOverride, {
              userId: user.ownerId,
              userName: user.ownerName,
            }),
          });
        }, true);
      },

      addDocumentRow: (docId, sectionId, fields) => {
        const user = getCurrentProjectUser();
        const tempId = makeAddedRowId();
        updateProject((prev) => {
          const current =
            prev.industrialDocumentOverrides?.[docId] ?? emptyIndustrialDocumentOverride();
          const nextOverride: IndustrialDocumentOverride = {
            ...current,
            addedRows: [
              ...current.addedRows,
              {
                tempId,
                fields: { ...fields, __sectionId: sectionId },
                createdAt: new Date().toISOString(),
                createdBy: { userId: user.ownerId, userName: user.ownerName },
              },
            ],
          };
          return applyResultados({
            ...prev,
            ...applyOverrideWithHistory(prev, docId, nextOverride, {
              userId: user.ownerId,
              userName: user.ownerName,
            }),
          });
        }, true);
      },

      deleteDocumentRow: (docId: IndustrialOnlineAnalysisDocId, rowId: string) => {
        if (!rowId.trim()) return;
        const user = getCurrentProjectUser();
        updateProject((prev) => {
          const current =
            prev.industrialDocumentOverrides?.[docId] ?? emptyIndustrialDocumentOverride();
          let nextOverride: IndustrialDocumentOverride;
          if (rowId.startsWith("added:")) {
            nextOverride = {
              ...current,
              addedRows: current.addedRows.filter((a) => a.tempId !== rowId),
            };
          } else {
            const { [rowId]: _removed, ...restPatches } = current.rowPatches;
            nextOverride = {
              rowPatches: restPatches,
              addedRows: current.addedRows,
              deletedRowIds: current.deletedRowIds.includes(rowId)
                ? current.deletedRowIds
                : [...current.deletedRowIds, rowId],
            };
          }
          return applyResultados({
            ...prev,
            ...applyOverrideWithHistory(prev, docId, nextOverride, {
              userId: user.ownerId,
              userName: user.ownerName,
            }),
          });
        }, true);
      },
    }),
    [updateProject]
  );
}
