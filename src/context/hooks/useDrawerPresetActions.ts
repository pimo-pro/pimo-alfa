import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import type { DrawerPreset } from "../../core/drawers/drawerPresetTypes";
import { normalizeDrawerPresets } from "../../core/drawers/drawerPresets";
import {
  applyDrawerPresetToBox,
  extractDrawerPresetFromBox,
} from "../../core/drawers/drawerPresetService";
import { applyResultados, appendChangelog } from "../projectState";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type DrawerPresetActions = Pick<
  ProjectActions,
  | "upsertDrawerPreset"
  | "removeDrawerPreset"
  | "saveDrawerPresetFromBox"
  | "applyDrawerPresetToBox"
>;

export function useDrawerPresetActions(ctx: ProjectActionsExecutionContext): DrawerPresetActions {
  const { updateProject, recomputeState: recompute } = ctx;

  return useMemo(
    () => ({
      upsertDrawerPreset: (preset: DrawerPreset) => {
        updateProject(
          (prev) => {
            const list = normalizeDrawerPresets(prev.drawerPresets);
            const idx = list.findIndex((p) => p.id === preset.id);
            const drawerPresets =
              idx >= 0 ? list.map((p, i) => (i === idx ? { ...p, ...preset } : p)) : [...list, preset];
            return applyResultados({ ...prev, drawerPresets });
          },
          true
        );
      },

      removeDrawerPreset: (presetId: string) => {
        updateProject(
          (prev) => {
            const drawerPresets = normalizeDrawerPresets(prev.drawerPresets).filter(
              (p) => p.id !== presetId
            );
            return { ...prev, drawerPresets };
          },
          true
        );
      },

      saveDrawerPresetFromBox: (boxId: string, nome: string) => {
        updateProject(
          (prev) => {
            const box = prev.workspaceBoxes.find((b) => b.id === boxId);
            if (!box) return prev;

            const preset = extractDrawerPresetFromBox(box, nome);
            if (!preset) return prev;

            const list = normalizeDrawerPresets(prev.drawerPresets);
            const idx = list.findIndex((p) => p.id === preset.id);
            const drawerPresets =
              idx >= 0 ? list.map((p, i) => (i === idx ? preset : p)) : [...list, preset];

            return applyResultados({
              ...prev,
              drawerPresets,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: `Preset de gavetas guardado: ${preset.nome}`,
              }),
            });
          },
          true
        );
      },

      applyDrawerPresetToBox: (boxId: string, presetId: string) => {
        updateProject(
          (prev) => {
            const preset = normalizeDrawerPresets(prev.drawerPresets).find((p) => p.id === presetId);
            if (!preset) return prev;

            const workspaceBoxes = prev.workspaceBoxes.map((box) => {
              if (box.id !== boxId) return box;

              const result = applyDrawerPresetToBox(box, preset);
              if (!result.ok) {
                return {
                  ...box,
                  drawerConfigError: result.reason,
                  drawerConfigWarnings: [],
                };
              }
              return result.box;
            });

            return recompute(
              prev,
              {
                workspaceBoxes,
                changelog: appendChangelog(prev.changelog, {
                  timestamp: new Date(),
                  type: "box",
                  message: `Preset de gavetas aplicado: ${preset.nome}`,
                }),
              },
              true
            );
          },
          true
        );
      },
    }),
    [updateProject, recompute]
  );
}
