import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import { applyResultados, appendChangelog } from "../projectState";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import {
  patchProjectForIndustrialPieceDelete,
  patchProjectForIndustrialPieceDimensions,
  patchProjectForIndustrialPieceMove,
  validateIndustrialDimensions,
} from "../../core/industrial/IndustrialPieceEditsService";
import type { IndustrialOperationId } from "../../core/industrial/industrialPieceEditsTypes";
import { getCurrentProjectUser } from "../../core/projects/currentUser";

export type IndustrialPieceEditsActions = Pick<
  ProjectActions,
  | "updateIndustrialPieceDimensions"
  | "moveIndustrialPiece"
  | "deleteIndustrialPiece"
  | "completeIndustrialOperacao"
>;

export function useIndustrialPieceEditsActions(
  ctx: ProjectActionsExecutionContext
): IndustrialPieceEditsActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      updateIndustrialPieceDimensions: (pieceId, dims) => {
        const err = validateIndustrialDimensions(dims);
        if (err) {
          if (typeof window !== "undefined") window.alert(err);
          return;
        }
        if (!pieceId.trim()) return;
        updateProject(
          (prev) =>
            applyResultados({
              ...prev,
              industrialPieceEdits: patchProjectForIndustrialPieceDimensions(prev, pieceId, dims),
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Medidas industriais atualizadas — ${pieceId}`,
              }),
            }),
          true
        );
      },

      moveIndustrialPiece: (pieceId, targetBoxId) => {
        if (!pieceId.trim() || !targetBoxId.trim()) return;
        updateProject(
          (prev) => {
            const boxExists = (prev.boxes ?? []).some((b) => b.id === targetBoxId);
            if (!boxExists) return prev;
            return applyResultados({
              ...prev,
              ...patchProjectForIndustrialPieceMove(prev, pieceId, targetBoxId),
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Peça movida para caixa ${targetBoxId}`,
              }),
            });
          },
          true
        );
      },

      deleteIndustrialPiece: (pieceId) => {
        if (!pieceId.trim()) return;
        updateProject(
          (prev) =>
            applyResultados({
              ...prev,
              ...patchProjectForIndustrialPieceDelete(prev, pieceId),
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Peça removida do fluxo industrial — ${pieceId}`,
              }),
            }),
          true
        );
      },

      completeIndustrialOperacao: (operationId: IndustrialOperationId, notas?: string) => {
        const user = getCurrentProjectUser();
        updateProject(
          (prev) =>
            applyResultados({
              ...prev,
              industrialOperacoes: {
                ...(prev.industrialOperacoes ?? {}),
                [operationId]: {
                  completedAt: new Date().toISOString(),
                  employeeId: user.ownerId,
                  employeeName: user.ownerName,
                  notas: notas?.trim() || undefined,
                },
              },
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Operação industrial concluída — ${operationId}`,
              }),
            }),
          true
        );
      },
    }),
    [updateProject]
  );
}
