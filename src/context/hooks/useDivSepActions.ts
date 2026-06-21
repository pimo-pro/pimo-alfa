import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import { appendChangelog } from "../projectState";
import { ensureBoxPanelIds, createStableId } from "../../core/box/panelIds";
import { getSelectedOrFirstWorkspaceBox } from "../projectHelpers";
import type { DivisorItem, SeparadorItem } from "../../core/divSep/types";
import {
  clampDivisorPosition,
  clampSeparadorPosition,
  getDivSepInternalDims,
} from "../../core/divSep/dimensions";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type DivSepActions = Pick<
  ProjectActions,
  | "addSeparador"
  | "addDivisor"
  | "removeSeparador"
  | "removeDivisor"
  | "updateSeparador"
  | "updateDivisor"
>;

function defaultSeparadorPosition(box: Parameters<typeof getDivSepInternalDims>[0]): number {
  const internal = getDivSepInternalDims(box);
  return Math.round(internal.alturaInterna / 2);
}

function defaultDivisorPosition(box: Parameters<typeof getDivSepInternalDims>[0]): number {
  const internal = getDivSepInternalDims(box);
  return Math.round(internal.larguraInterna / 2);
}

export function useDivSepActions(ctx: ProjectActionsExecutionContext): DivSepActions {
  const { updateProject, recomputeState: recompute } = ctx;

  return useMemo(
    () => ({
      addSeparador: () => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const newItem: SeparadorItem = {
              id: createStableId(),
              positionMm: defaultSeparadorPosition(selected),
              referenceEdge: "bottom",
            };
            const separadores = [...(selected.separadores ?? []), newItem];
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    separadores,
                    panelIds: ensureBoxPanelIds(box.panelIds, {
                      prateleiras: box.prateleiras,
                      portaTipo: box.portaTipo,
                      gavetas: box.gavetas,
                      divisoresCount: box.divisores?.length ?? 0,
                      separadoresCount: separadores.length,
                    }),
                  }
                : box
            );
            return recompute(
              prev,
              {
                workspaceBoxes,
                changelog: appendChangelog(prev.changelog, {
                  timestamp: new Date(),
                  type: "box",
                  message: "Separador horizontal adicionado",
                }),
              },
              true
            );
          },
          true
        );
      },

      addDivisor: () => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const newItem: DivisorItem = {
              id: createStableId(),
              positionMm: defaultDivisorPosition(selected),
              referenceEdge: "left",
            };
            const divisores = [...(selected.divisores ?? []), newItem];
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    divisores,
                    panelIds: ensureBoxPanelIds(box.panelIds, {
                      prateleiras: box.prateleiras,
                      portaTipo: box.portaTipo,
                      gavetas: box.gavetas,
                      divisoresCount: divisores.length,
                      separadoresCount: box.separadores?.length ?? 0,
                    }),
                  }
                : box
            );
            return recompute(
              prev,
              {
                workspaceBoxes,
                changelog: appendChangelog(prev.changelog, {
                  timestamp: new Date(),
                  type: "box",
                  message: "Divisório vertical adicionado",
                }),
              },
              true
            );
          },
          true
        );
      },

      removeSeparador: (id) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const separadores = (selected.separadores ?? []).filter((s) => s.id !== id);
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    separadores,
                    panelIds: ensureBoxPanelIds(box.panelIds, {
                      prateleiras: box.prateleiras,
                      portaTipo: box.portaTipo,
                      gavetas: box.gavetas,
                      divisoresCount: box.divisores?.length ?? 0,
                      separadoresCount: separadores.length,
                    }),
                  }
                : box
            );
            return recompute(prev, { workspaceBoxes }, true);
          },
          true
        );
      },

      removeDivisor: (id) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const divisores = (selected.divisores ?? []).filter((d) => d.id !== id);
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    divisores,
                    panelIds: ensureBoxPanelIds(box.panelIds, {
                      prateleiras: box.prateleiras,
                      portaTipo: box.portaTipo,
                      gavetas: box.gavetas,
                      divisoresCount: divisores.length,
                      separadoresCount: box.separadores?.length ?? 0,
                    }),
                  }
                : box
            );
            return recompute(prev, { workspaceBoxes }, true);
          },
          true
        );
      },

      updateSeparador: (id, partial) => {
        updateProject(
          (prev) => {
            const owner = prev.workspaceBoxes.find((box) =>
              (box.separadores ?? []).some((item) => item.id === id)
            );
            if (!owner) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((box) => {
              if (box.id !== owner.id) return box;
              const separadores = (box.separadores ?? []).map((item) => {
                if (item.id !== id) return item;
                const merged = { ...item, ...partial };
                if (partial.positionMm != null) {
                  merged.positionMm = clampSeparadorPosition(box, merged, partial.positionMm);
                }
                return merged;
              });
              return { ...box, separadores };
            });
            return recompute(prev, { workspaceBoxes }, true);
          },
          true
        );
      },

      updateDivisor: (id, partial) => {
        updateProject(
          (prev) => {
            const owner = prev.workspaceBoxes.find((box) =>
              (box.divisores ?? []).some((item) => item.id === id)
            );
            if (!owner) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((box) => {
              if (box.id !== owner.id) return box;
              const divisores = (box.divisores ?? []).map((item) => {
                if (item.id !== id) return item;
                const merged = { ...item, ...partial };
                if (partial.positionMm != null) {
                  merged.positionMm = clampDivisorPosition(box, merged, partial.positionMm);
                }
                return merged;
              });
              return { ...box, divisores };
            });
            return recompute(prev, { workspaceBoxes }, true);
          },
          true
        );
      },
    }),
    [updateProject, recompute]
  );
}
