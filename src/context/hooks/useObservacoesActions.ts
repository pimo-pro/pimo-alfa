import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import {
  getPieceObservacoes,
  normalizeObservacoesList,
  sanitizeObservationText,
} from "../../core/observacoes/ObservacoesService";
import { applyResultados, appendChangelog } from "../projectState";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type ObservacoesActions = Pick<
  ProjectActions,
  | "addBoxObservacao"
  | "removeBoxObservacao"
  | "addPieceObservacao"
  | "removePieceObservacao"
>;

export function useObservacoesActions(ctx: ProjectActionsExecutionContext): ObservacoesActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      addBoxObservacao: (boxId: string, text: string) => {
        const normalized = sanitizeObservationText(text);
        if (!normalized) return;
        updateProject(
          (prev) => {
            const workspaceBoxes = prev.workspaceBoxes.map((box) => {
              if (box.id !== boxId) return box;
              const current = normalizeObservacoesList(box.observacoes);
              if (current.includes(normalized)) return box;
              return { ...box, observacoes: [...current, normalized] };
            });
            return applyResultados({
              ...prev,
              workspaceBoxes,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Observação adicionada à caixa`,
              }),
            });
          },
          true
        );
      },

      removeBoxObservacao: (boxId: string, index: number) => {
        updateProject(
          (prev) => {
            const workspaceBoxes = prev.workspaceBoxes.map((box) => {
              if (box.id !== boxId) return box;
              const current = normalizeObservacoesList(box.observacoes);
              if (index < 0 || index >= current.length) return box;
              return { ...box, observacoes: current.filter((_, i) => i !== index) };
            });
            return applyResultados({ ...prev, workspaceBoxes });
          },
          true
        );
      },

      addPieceObservacao: (pieceId: string, text: string) => {
        const normalized = sanitizeObservationText(text);
        if (!normalized || !pieceId.trim()) return;
        updateProject(
          (prev) => {
            const current = getPieceObservacoes(pieceId, prev.pieceObservacoes);
            if (current.includes(normalized)) return prev;
            const pieceObservacoes = {
              ...prev.pieceObservacoes,
              [pieceId]: [...current, normalized],
            };
            return applyResultados({
              ...prev,
              pieceObservacoes,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Observação adicionada à peça`,
              }),
            });
          },
          true
        );
      },

      removePieceObservacao: (pieceId: string, index: number) => {
        updateProject(
          (prev) => {
            const current = getPieceObservacoes(pieceId, prev.pieceObservacoes);
            if (index < 0 || index >= current.length) return prev;
            const nextList = current.filter((_, i) => i !== index);
            const pieceObservacoes = { ...prev.pieceObservacoes };
            if (nextList.length === 0) {
              delete pieceObservacoes[pieceId];
            } else {
              pieceObservacoes[pieceId] = nextList;
            }
            return applyResultados({ ...prev, pieceObservacoes });
          },
          true
        );
      },
    }),
    [updateProject]
  );
}
