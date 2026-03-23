import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import { appendChangelog, buildBoxesFromWorkspace, buildDesignState, getSelectedWorkspaceBox } from "../projectState";
import { ensureBoxPanelIds } from "../../core/box/panelIds";
import { getSelectedOrFirstWorkspaceBox } from "../projectHelpers";
import { regenerateLayersForBox, createManualDoor, createManualDrawer, applyDrawerTypeRules } from "../../services/boxLayersService";
import { devLogger } from "../../utils/devLogger";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type LayerActions = Pick<
  ProjectActions,
  | "setPrateleiras"
  | "setGavetas"
  | "setDrawerHeightMode"
  | "setPortaTipo"
  | "setDoorMaterial"
  | "setDrawerMaterial"
  | "addDoorLayerItem"
  | "addDrawerLayerItem"
  | "removeDoorLayerItem"
  | "removeDrawerLayerItem"
  | "updateDoorLayerItem"
  | "updateDrawerLayerItem"
  | "setDoorLayerItemOpen"
  | "setDrawerLayerItemOpen"
  | "setDoorLayerItemMaterial"
  | "setDrawerLayerItemMaterial"
  | "setDoorLayerItemDirection"
  | "regenerateBoxLayersForSelectedBox"
>;

export function useLayerActions(ctx: ProjectActionsExecutionContext): LayerActions {
  const { updateProject, recomputeState } = ctx;

  return useMemo(
    () => ({
      setPrateleiras: (quantidade) => {
        const valor = Math.max(0, Math.floor(quantidade));
        updateProject(
          (prev) => {
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === prev.selectedWorkspaceBoxId
                ? {
                    ...box,
                    prateleiras: valor,
                    gavetas: valor > 0 ? 0 : box.gavetas,
                    drawersLayer: valor > 0 ? [] : box.drawersLayer,
                    panelIds: ensureBoxPanelIds(box.panelIds, {
                      ...box,
                      prateleiras: valor,
                      gavetas: valor > 0 ? 0 : box.gavetas,
                    }),
                  }
                : box
            );
            return recomputeState(
              prev,
              {
                workspaceBoxes,
                changelog: appendChangelog(prev.changelog, {
                  timestamp: new Date(),
                  type: "box",
                  message: `Prateleiras ajustadas para ${valor}`,
                }),
              },
              true
            );
          },
          true
        );
      },
      setGavetas: (quantidade) => {
        const valor = Math.max(0, Math.floor(quantidade));
        updateProject(
          (prev) => {
            const workspaceBoxes = prev.workspaceBoxes.map((box) => {
              if (box.id === prev.selectedWorkspaceBoxId) {
                const updatedBox = {
                  ...box,
                  gavetas: valor,
                  portaTipo: valor > 0 ? "sem_porta" : box.portaTipo,
                  prateleiras: valor > 0 ? 0 : box.prateleiras,
                  doorsLayer: valor > 0 ? [] : box.doorsLayer,
                  panelIds: ensureBoxPanelIds(box.panelIds, {
                    ...box,
                    gavetas: valor,
                    portaTipo: valor > 0 ? "sem_porta" : box.portaTipo,
                    prateleiras: valor > 0 ? 0 : box.prateleiras,
                  }),
                };
                const layers = regenerateLayersForBox(updatedBox);
                return { ...updatedBox, ...layers };
              }
              return box;
            });
            return recomputeState(
              prev,
              {
                workspaceBoxes,
                changelog: appendChangelog(prev.changelog, {
                  timestamp: new Date(),
                  type: "box",
                  message: `Gavetas ajustadas para ${valor}`,
                }),
              },
              true
            );
          },
          true
        );
      },
      setDrawerHeightMode: (mode) => {
        updateProject(
          (prev) => {
            const workspaceBoxes = prev.workspaceBoxes.map((box) => {
              if (box.id !== prev.selectedWorkspaceBoxId) return box;
              const updatedBox = { ...box, drawerHeightMode: mode };
              const layers = regenerateLayersForBox(updatedBox);
              return { ...updatedBox, ...layers };
            });
            return recomputeState(prev, { workspaceBoxes }, true);
          },
          true
        );
      },
      setPortaTipo: (portaTipo) => {
        updateProject(
          (prev) => {
            const workspaceBoxes = prev.workspaceBoxes.map((box) => {
              if (box.id === prev.selectedWorkspaceBoxId) {
                const updatedBox = {
                  ...box,
                  portaTipo,
                  gavetas: portaTipo === "sem_porta" ? box.gavetas : 0,
                  drawersLayer: portaTipo === "sem_porta" ? box.drawersLayer : [],
                  panelIds: ensureBoxPanelIds(box.panelIds, {
                    ...box,
                    portaTipo,
                    gavetas: portaTipo === "sem_porta" ? box.gavetas : 0,
                  }),
                };
                const layers = regenerateLayersForBox(updatedBox);
                return { ...updatedBox, ...layers };
              }
              return box;
            });
            return recomputeState(prev, { workspaceBoxes }, true);
          },
          true
        );
      },
      setDoorMaterial: (boxId, doorLayerId, material) => {
        if (import.meta.env.DEV) {
          devLogger.debug("[DOOR-MAT] 3 ProjectProvider.setDoorMaterial ENTRADA", { boxId, doorLayerId, material });
        }
        updateProject(
          (prev) => {
            const box = prev.workspaceBoxes.find((b) => b.id === boxId);
            if (import.meta.env.DEV && box) {
              const doorIds = (box.doorsLayer ?? []).map((d) => d.id);
              devLogger.debug("[ProjectProvider.setDoorMaterial] doorLayerId (comparar com viewer)", {
                boxId,
                doorLayerId,
                material,
                doorIdsNoBox: doorIds,
                match: doorIds.includes(doorLayerId),
              });
            }
            if (!box) return prev;
            const doorBefore = (box.doorsLayer ?? []).find((d) => d.id === doorLayerId);
            if (import.meta.env.DEV) {
              devLogger.debug("[DOOR-MAT] 4 ProjectProvider.setDoorMaterial door ANTES", {
                boxId,
                doorLayerId,
                materialAntes: doorBefore?.material ?? doorBefore?.materialId,
                materialNovo: material,
              });
            }
            const doorsLayer = (box.doorsLayer ?? []).map((door) =>
              door.id === doorLayerId ? { ...door, material, materialId: material } : door
            );
            const workspaceBoxes = prev.workspaceBoxes.map((b) =>
              b.id === boxId ? { ...b, doorsLayer } : b
            );
            if (import.meta.env.DEV) {
              const doorAfter = doorsLayer.find((d) => d.id === doorLayerId);
              devLogger.debug(
                "[DOOR-MAT] 5 ProjectProvider.setDoorMaterial door DEPOIS (estado que será commitado)",
                {
                  boxId,
                  doorLayerId,
                  materialEmDoorsLayer: doorAfter?.material ?? doorAfter?.materialId,
                }
              );
            }
            return { ...prev, workspaceBoxes };
          },
          true
        );
        if (import.meta.env.DEV) {
          devLogger.debug("[DOOR-MAT] 6 ProjectProvider.setDoorMaterial updateProject callback agendado");
        }
      },
      setDrawerMaterial: (boxId, drawerLayerId, material) => {
        updateProject(
          (prev) => {
            const box = prev.workspaceBoxes.find((b) => b.id === boxId);
            if (!box) return prev;
            const drawersLayer = (box.drawersLayer ?? []).map((drawer) =>
              drawer.id === drawerLayerId ? { ...drawer, material } : drawer
            );
            const workspaceBoxes = prev.workspaceBoxes.map((b) =>
              b.id === boxId ? { ...b, drawersLayer } : b
            );
            return { ...prev, workspaceBoxes };
          },
          true
        );
      },
      addDoorLayerItem: () => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const newDoor = createManualDoor(selected);
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    gavetas: 0,
                    portaTipo: box.portaTipo === "sem_porta" ? "porta_simples" : box.portaTipo,
                    drawersLayer: [],
                    doorsLayer: [...(box.doorsLayer ?? []), newDoor],
                    panelIds: ensureBoxPanelIds(box.panelIds, {
                      ...box,
                      gavetas: 0,
                      portaTipo: box.portaTipo === "sem_porta" ? "porta_simples" : box.portaTipo,
                    }),
                  }
                : box
            );
            return {
              ...prev,
              workspaceBoxes,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: "Porta adicionada",
              }),
            };
          },
          true
        );
      },
      addDrawerLayerItem: () => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const newDrawer = createManualDrawer(selected);
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    portaTipo: "sem_porta" as const,
                    prateleiras: 0,
                    doorsLayer: [],
                    gavetas: (box.drawersLayer?.length ?? 0) + 1,
                    drawersLayer: [...(box.drawersLayer ?? []), newDrawer],
                    panelIds: ensureBoxPanelIds(box.panelIds, {
                      ...box,
                      portaTipo: "sem_porta" as const,
                      prateleiras: 0,
                      gavetas: (box.drawersLayer?.length ?? 0) + 1,
                    }),
                  }
                : box
            );
            return recomputeState(
              prev,
              {
                workspaceBoxes,
                changelog: appendChangelog(prev.changelog, {
                  timestamp: new Date(),
                  type: "box",
                  message: "Gaveta adicionada",
                }),
              },
              true
            );
          },
          true
        );
      },
      removeDoorLayerItem: (id) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? { ...box, doorsLayer: (box.doorsLayer ?? []).filter((item) => item.id !== id) }
                : box
            );
            return {
              ...prev,
              workspaceBoxes,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: "Porta removida",
              }),
            };
          },
          true
        );
      },
      removeDrawerLayerItem: (id) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? (() => {
                    const nextDrawers = (box.drawersLayer ?? []).filter((item) => item.id !== id);
                    return {
                      ...box,
                      drawersLayer: nextDrawers,
                      gavetas: nextDrawers.length,
                      panelIds: ensureBoxPanelIds(box.panelIds, {
                        ...box,
                        gavetas: nextDrawers.length,
                      }),
                    };
                  })()
                : box
            );
            return recomputeState(
              prev,
              {
                workspaceBoxes,
                changelog: appendChangelog(prev.changelog, {
                  timestamp: new Date(),
                  type: "box",
                  message: "Gaveta removida",
                }),
              },
              true
            );
          },
          true
        );
      },
      updateDoorLayerItem: (id, partial) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    doorsLayer: (box.doorsLayer ?? []).map((item) =>
                      item.id === id ? { ...item, ...partial } : item
                    ),
                  }
                : box
            );
            return {
              ...prev,
              workspaceBoxes,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: "Porta atualizada",
              }),
            };
          },
          true
        );
      },
      updateDrawerLayerItem: (id, partial) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    drawersLayer: (() => {
                      const updated = (box.drawersLayer ?? []).map((item) =>
                        item.id === id ? { ...item, ...partial } : item
                      );
                      const heightChanged = "height" in partial;
                      const mode = box.drawerHeightMode ?? "equal";
                      let next = updated.map((item) =>
                        item.id === id ? applyDrawerTypeRules(box, item) : item
                      );
                      if (heightChanged && mode === "custom") {
                        let offsetY = 0;
                        const availableHeight = Math.max(1, box.dimensoes.altura - 10);
                        next = next.map((item) => {
                          const height =
                            Number.isFinite(item.height) && item.height > 0
                              ? item.height
                              : availableHeight / Math.max(1, next.length);
                          const posY = -box.dimensoes.altura / 2 + 10 + offsetY + height / 2;
                          offsetY += height;
                          return { ...item, height, posY };
                        });
                      }
                      return next;
                    })(),
                  }
                : box
            );
            return recomputeState(
              prev,
              {
                workspaceBoxes,
                changelog: appendChangelog(prev.changelog, {
                  timestamp: new Date(),
                  type: "box",
                  message: "Gaveta atualizada",
                }),
              },
              true
            );
          },
          true
        );
      },
      setDoorLayerItemOpen: (id, isOpen) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const target = (selected.doorsLayer ?? []).find((item) => item.id === id);
            const isDoubleDoor = selected.portaTipo === "porta_dupla" || target?.groupType === "dupla";
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    doorsLayer: (box.doorsLayer ?? []).map((item) =>
                      isDoubleDoor ? { ...item, isOpen } : item.id === id ? { ...item, isOpen } : item
                    ),
                  }
                : box
            );
            return {
              ...prev,
              workspaceBoxes,
            };
          },
          true
        );
      },
      setDrawerLayerItemOpen: (id, isOpen) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    drawersLayer: (box.drawersLayer ?? []).map((item) =>
                      item.id === id ? applyDrawerTypeRules(box, { ...item, isOpen }) : item
                    ),
                  }
                : box
            );
            return {
              ...prev,
              workspaceBoxes,
            };
          },
          true
        );
      },
      setDoorLayerItemMaterial: (id, materialId) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    doorsLayer: (box.doorsLayer ?? []).map((item) =>
                      item.id === id ? { ...item, materialId } : item
                    ),
                  }
                : box
            );
            return {
              ...prev,
              workspaceBoxes,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: "Material da porta atualizado",
              }),
            };
          },
          true
        );
      },
      setDrawerLayerItemMaterial: (id, materialId) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    drawersLayer: (box.drawersLayer ?? []).map((item) =>
                      item.id === id ? { ...item, materialId } : item
                    ),
                  }
                : box
            );
            return {
              ...prev,
              workspaceBoxes,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: "Material da gaveta atualizado",
              }),
            };
          },
          true
        );
      },
      setDoorLayerItemDirection: (id, direction) => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? {
                    ...box,
                    doorsLayer: (box.doorsLayer ?? []).map((item) =>
                      item.id === id
                        ? (() => {
                            const currentCenterX =
                              item.pivot === "left-edge"
                                ? item.posX + item.width / 2
                                : item.pivot === "right-edge"
                                  ? item.posX - item.width / 2
                                  : item.posX;
                            const currentCenterY =
                              item.pivot === "top-edge"
                                ? item.posY - item.height / 2
                                : item.pivot === "bottom-edge"
                                  ? item.posY + item.height / 2
                                  : item.posY;

                            const nextHingeSide: "left" | "right" | "top" | "bottom" =
                              direction === "left" || direction === "right"
                                ? direction
                                : direction === "up"
                                  ? "top"
                                  : direction === "down"
                                    ? "bottom"
                                    : (item.hingeSide ?? "left");
                            const nextPivot: "left-edge" | "right-edge" | "top-edge" | "bottom-edge" =
                              direction === "left"
                                ? "left-edge"
                                : direction === "right"
                                  ? "right-edge"
                                  : direction === "up"
                                    ? "top-edge"
                                    : "bottom-edge";
                            const nextPosX =
                              direction === "left"
                                ? currentCenterX - item.width / 2
                                : direction === "right"
                                  ? currentCenterX + item.width / 2
                                  : currentCenterX;
                            const nextPosY =
                              direction === "up"
                                ? currentCenterY + item.height / 2
                                : direction === "down"
                                  ? currentCenterY - item.height / 2
                                  : currentCenterY;

                            return {
                              ...item,
                              openDirection: direction,
                              hingeSide: nextHingeSide,
                              pivot: nextPivot,
                              posX: nextPosX,
                              posY: nextPosY,
                            };
                          })()
                        : item
                    ),
                  }
                : box
            );
            const nextPrev = {
              ...prev,
              workspaceBoxes,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: "Direção de abertura da porta atualizada",
              }),
            };
            const boxes = buildBoxesFromWorkspace(nextPrev);
            const selectedWorkspace = getSelectedWorkspaceBox(nextPrev);
            const selectedBoxId =
              boxes.find((box) => box.id === selectedWorkspace?.id)?.id ?? boxes[0]?.id ?? "";
            const nextState = {
              ...nextPrev,
              boxes,
              selectedBoxId,
              dimensoes:
                selectedWorkspace?.dimensoes ??
                boxes.find((box) => box.id === selectedBoxId)?.dimensoes ??
                nextPrev.dimensoes,
            };
            return {
              ...nextState,
              ...buildDesignState(nextState),
            };
          },
          true
        );
      },
      regenerateBoxLayersForSelectedBox: () => {
        updateProject(
          (prev) => {
            const selected = getSelectedOrFirstWorkspaceBox(prev);
            if (!selected) return prev;
            const normalized = {
              ...selected,
              ...(selected.gavetas > 0
                ? { portaTipo: "sem_porta" as const, prateleiras: 0, doorsLayer: [] }
                : selected.portaTipo !== "sem_porta"
                  ? { gavetas: 0, drawersLayer: [] }
                  : selected.prateleiras > 0
                    ? { gavetas: 0, drawersLayer: [] }
                    : null),
            };
            const layers = regenerateLayersForBox(normalized);
            const workspaceBoxes = prev.workspaceBoxes.map((box) =>
              box.id === selected.id
                ? { ...box, ...normalized, ...layers }
                : box
            );
            return {
              ...prev,
              workspaceBoxes,
              changelog: appendChangelog(prev.changelog, {
                timestamp: new Date(),
                type: "box",
                message: "Portas e gavetas regeneradas automaticamente",
              }),
            };
          },
          true
        );
      },
    }),
    [updateProject, recomputeState]
  );
}
