import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { OrlaPreset, OrlaSideId } from "../../core/orla/orlaTypes";
import { EMPTY_ORLA_SIDES } from "../../core/orla/orlaTypes";
import { normalizeOrlaPresets } from "../../core/orla/orlaPresets";
import { buildOrlaPiecesForBox } from "../../core/orla/orlaCalculator";
import { buildRemateCutlistItems } from "../../core/remate/remateCutlist";
import { buildRodapeCutlistItems } from "../../core/rodape/rodapeCutlist";
import { applyResultados, appendChangelog, buildBoxesWithCutList } from "../projectState";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type OrlaActions = Pick<
  ProjectActions,
  | "setBoxOrlaPreset"
  | "setPieceOrlaSide"
  | "setPieceOrlaJunto"
  | "upsertOrlaPreset"
  | "removeOrlaPreset"
>;

export function useOrlaActions(ctx: ProjectActionsExecutionContext): OrlaActions {
  const { updateProject } = ctx;

  return useMemo(
    () => ({
      setBoxOrlaPreset: (boxId: string, presetId: string | null) => {
        updateProject(
          (prev) => {
            const workspaceBoxes = prev.workspaceBoxes.map((b) =>
              b.id === boxId ? { ...b, orlaPresetId: presetId } : b
            );
            const interim = { ...prev, workspaceBoxes };
            const boxesWithCut = buildBoxesWithCutList(interim);
            const box = boxesWithCut.find((b) => b.id === boxId);
            const remates = buildRemateCutlistItems(prev.remates ?? [], boxesWithCut).filter(
              (i) => i.boxId === boxId
            );
            const rodapes = buildRodapeCutlistItems(prev.rodapes ?? [], boxesWithCut).filter(
              (i) => i.boxId === boxId
            );
            let orlaPieces = { ...prev.orlaPieces };
            if (box) {
              orlaPieces = buildOrlaPiecesForBox(box, presetId, orlaPieces, [
                ...remates,
                ...rodapes,
              ]);
            }
            const next = {
              ...interim,
              orlaPieces,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box" as const,
                message: presetId ? `Orla do box aplicada: ${presetId}` : "Orla do box removida",
              }),
            };
            return applyResultados(next);
          },
          true
        );
      },

      setPieceOrlaSide: (
        pieceId: string,
        side: OrlaSideId,
        patch: Partial<{ presetId: string | null; enabled: boolean }>
      ) => {
        updateProject(
          (prev) => {
            const current = prev.orlaPieces[pieceId] ?? { sides: EMPTY_ORLA_SIDES() };
            const sides = { ...current.sides, [side]: { ...current.sides[side], ...patch } };
            const orlaPieces = { ...prev.orlaPieces, [pieceId]: { ...current, sides } };
            return applyResultados({ ...prev, orlaPieces });
          },
          true
        );
      },

      setPieceOrlaJunto: (pieceId: string, partnerIds: string[]) => {
        updateProject(
          (prev) => {
            const current = prev.orlaPieces[pieceId] ?? { sides: EMPTY_ORLA_SIDES() };
            const orlaPieces = {
              ...prev.orlaPieces,
              [pieceId]: { ...current, orlaJunto: partnerIds.filter(Boolean) },
            };
            return applyResultados({ ...prev, orlaPieces });
          },
          true
        );
      },

      upsertOrlaPreset: (preset: OrlaPreset) => {
        updateProject(
          (prev) => {
            const list = normalizeOrlaPresets(prev.orlaPresets);
            const idx = list.findIndex((p) => p.id === preset.id);
            const orlaPresets =
              idx >= 0 ? list.map((p, i) => (i === idx ? { ...p, ...preset } : p)) : [...list, preset];
            return applyResultados({ ...prev, orlaPresets });
          },
          true
        );
      },

      removeOrlaPreset: (presetId: string) => {
        updateProject(
          (prev) => {
            const inUse = Object.values(prev.orlaPieces).some((pc) =>
              Object.values(pc.sides).some((s) => s.presetId === presetId)
            );
            if (inUse) return prev;
            const orlaPresets = normalizeOrlaPresets(prev.orlaPresets).filter((p) => p.id !== presetId);
            return { ...prev, orlaPresets };
          },
          true
        );
      },
    }),
    [updateProject]
  );
}
