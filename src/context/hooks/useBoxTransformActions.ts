import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import { buildBoxesFromWorkspace, recomputeState } from "../projectState";
import { regenerateLayersForBox } from "../../services/boxLayersService";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";
import { wallStore } from "../../stores/wallStore";
import {
  clampBoxCenterXZMm,
  getFloorBoundsMmFromWalls,
  getInnerBoundsXZMm,
  hasPersistedRoomWalls,
  repositionOutsiderBoxesStackedFromCornerMm,
} from "../../utils/roomWorkspaceBounds";
import { commitMaterialSync, refreshViewerAfterMaterialSync } from "../../core/materials/materialSync";
import { syncCaixaFornoOnDimensoesChange, isCaixaFornoBox } from "../../core/moveis/generators/caixaFornoGenerator";
import { applyNoBackPanelState } from "../../core/box/backPanelFlags";

export type BoxTransformActions = Pick<
  ProjectActions,
  | "setDimensoes"
  | "setWorkspaceBoxDimensoes"
  | "updateWorkspacePosition"
  | "updateWorkspaceBoxTransform"
  | "repositionWorkspaceBoxesInsideRoom"
  | "setWorkspaceBoxNome"
  | "setWorkspaceBoxMaterial"
  | "setWorkspaceBoxAllowPieceRotation"
  | "setWorkspaceBoxLocked"
  | "setWorkspaceBoxPiHideDrawerHoles"
  | "setWorkspaceBoxCostaMaterial"
  | "setWorkspaceBoxSeparadorMaterial"
  | "setWorkspaceBoxNoBackPanel"
  | "setTipoBorda"
  | "setTipoFundo"
  | "alignFrontWithNeighbor"
  | "alignBottomSelectedBoxes"
  | "toggleWorkspaceRotation"
  | "rotateWorkspaceBox"
>;

export function useBoxTransformActions(ctx: ProjectActionsExecutionContext): BoxTransformActions {
  const { updateProject, viewerSync } = ctx;

  return useMemo(() => {
    const a = {} as BoxTransformActions;

    a.setDimensoes = (dimensoes) => {
      updateProject(
        (prev) => {
          const boxId = prev.selectedWorkspaceBoxId;
          if (boxId) {
            const box = prev.workspaceBoxes.find((b) => b.id === boxId);
            if (box?.locked) return prev;
            const workspaceBoxes = prev.workspaceBoxes.map((b) => {
              if (b.id !== boxId) return b;
              let updatedBox = { ...b, dimensoes: { ...b.dimensoes, ...dimensoes } };
              if (dimensoes.profundidade !== undefined) {
                updatedBox = { ...updatedBox, profundidadeExterna: dimensoes.profundidade };
              }
              if (isCaixaFornoBox(updatedBox)) {
                updatedBox = syncCaixaFornoOnDimensoesChange(updatedBox);
              }
              const layers = regenerateLayersForBox(updatedBox, { preserveMaterials: true });
              return { ...updatedBox, ...layers };
            });
            return recomputeState(prev, { workspaceBoxes }, true);
          }
          return recomputeState(prev, { dimensoes: { ...prev.dimensoes, ...dimensoes } }, true);
        },
        true
      );
    };

    a.setWorkspaceBoxDimensoes = (boxId, dimensoes) => {
      updateProject(
        (prev) => {
          const box = prev.workspaceBoxes.find((b) => b.id === boxId);
          if (box?.locked) return prev;
          const workspaceBoxes = prev.workspaceBoxes.map((boxItem) => {
            if (boxItem.id !== boxId) return boxItem;
            let updatedBox = { ...boxItem, dimensoes: { ...boxItem.dimensoes, ...dimensoes } };
            if (dimensoes.profundidade !== undefined) {
              updatedBox = { ...updatedBox, profundidadeExterna: dimensoes.profundidade };
            }
            if (isCaixaFornoBox(updatedBox)) {
              updatedBox = syncCaixaFornoOnDimensoesChange(updatedBox);
            }
            const layers = regenerateLayersForBox(updatedBox, { preserveMaterials: true });
            return { ...updatedBox, ...layers };
          });
          return recomputeState(prev, { workspaceBoxes }, true);
        },
        true
      );
    };

    a.updateWorkspacePosition = (boxId, posicaoX_mm) => {
      updateProject(
        (prev) => {
          const box = prev.workspaceBoxes.find((b) => b.id === boxId);
          if (box?.locked) return prev;
          const workspaceBoxes = prev.workspaceBoxes.map((b) =>
            b.id === boxId ? { ...b, posicaoX_mm } : b
          );
          return { ...prev, workspaceBoxes };
        },
        false
      );
    };

    a.updateWorkspaceBoxTransform = (boxId, partial) => {
      updateProject(
        (prev) => {
          const box = prev.workspaceBoxes.find((b) => b.id === boxId);
          if (box?.locked) return prev;
          const walls = wallStore.getState().walls;
          const collisionOn = viewerSync.getLockEnabled();
          const floorBounds = hasPersistedRoomWalls(walls) ? getFloorBoundsMmFromWalls(walls) : null;

          const workspaceBoxes = prev.workspaceBoxes.map((boxItem) => {
            if (boxItem.id !== boxId) return boxItem;
            const next = { ...boxItem };
            if (partial.x_mm !== undefined) next.posicaoX_mm = partial.x_mm;
            if (partial.y_mm !== undefined) next.posicaoY_mm = partial.y_mm;
            if (partial.z_mm !== undefined) next.posicaoZ_mm = partial.z_mm ?? 0;
            if (partial.rotacaoX_rad !== undefined) next.rotacaoX = partial.rotacaoX_rad;
            if (partial.rotacaoY_rad !== undefined) next.rotacaoY = partial.rotacaoY_rad;
            if (partial.rotacaoZ_rad !== undefined) next.rotacaoZ = partial.rotacaoZ_rad;
            if (partial.manualPosition !== undefined) next.manualPosition = partial.manualPosition;
            if (partial.autoRotateEnabled !== undefined) next.autoRotateEnabled = partial.autoRotateEnabled;
            if (partial.feetEnabled !== undefined) next.feetEnabled = partial.feetEnabled;
            if (partial.feetHeight !== undefined) {
              const feetHeight = Math.max(40, partial.feetHeight);
              next.feetHeight = feetHeight;
              next.pe_cm = feetHeight / 10;
            }
            if (partial.feetOffsetFront !== undefined) {
              next.feetOffsetFront = Math.max(0, partial.feetOffsetFront);
            }

            if (floorBounds && collisionOn) {
              const w = next.dimensoes?.largura ?? 0;
              const d = next.dimensoes?.profundidade ?? 0;
              const inner = getInnerBoundsXZMm(floorBounds, true);
              const c = clampBoxCenterXZMm(
                next.posicaoX_mm ?? 0,
                next.posicaoZ_mm ?? 0,
                w,
                d,
                next.rotacaoY ?? 0,
                inner
              );
              next.posicaoX_mm = c.x_mm;
              next.posicaoZ_mm = c.z_mm;
            }

            return next;
          });
          return { ...prev, workspaceBoxes };
        },
        false
      );
    };

    a.repositionWorkspaceBoxesInsideRoom = () => {
      updateProject(
        (prev) => {
          const walls = wallStore.getState().walls;
          if (!hasPersistedRoomWalls(walls)) return prev;
          const bounds = getFloorBoundsMmFromWalls(walls);
          if (!bounds) return prev;
          const workspaceBoxes = repositionOutsiderBoxesStackedFromCornerMm(prev.workspaceBoxes, bounds);
          const moved = workspaceBoxes.some(
            (b, i) =>
              b.posicaoX_mm !== prev.workspaceBoxes[i]?.posicaoX_mm ||
              b.posicaoZ_mm !== prev.workspaceBoxes[i]?.posicaoZ_mm
          );
          if (!moved) return prev;
          const nextPrev = { ...prev, workspaceBoxes };
          const boxes = buildBoxesFromWorkspace(nextPrev);
          return recomputeState(prev, { workspaceBoxes, boxes }, true);
        },
        true
      );
    };

    a.setWorkspaceBoxNome = (boxId, nome) => {
      updateProject(
        (prev) => {
          const workspaceBoxes = prev.workspaceBoxes.map((box) =>
            box.id === boxId ? { ...box, nome } : box
          );
          return { ...prev, workspaceBoxes };
        },
        true
      );
    };

    a.setWorkspaceBoxMaterial = (boxId, materialId) => {
      updateProject(
        (prev) => {
          const { next, sync } = commitMaterialSync(
            prev,
            { kind: "box", boxId, materialId },
            true
          );
          refreshViewerAfterMaterialSync(sync);
          return next;
        },
        true
      );
    };

    a.setWorkspaceBoxAllowPieceRotation = (boxId, allow) => {
      updateProject(
        (prev) => {
          const workspaceBoxes = prev.workspaceBoxes.map((box) =>
            box.id === boxId ? { ...box, allowPieceRotation: allow } : box
          );
          return { ...prev, workspaceBoxes };
        },
        true
      );
    };

    a.setWorkspaceBoxLocked = (boxId, locked) => {
      updateProject(
        (prev) => {
          const workspaceBoxes = prev.workspaceBoxes.map((box) =>
            box.id === boxId ? { ...box, locked } : box
          );
          return { ...prev, workspaceBoxes };
        },
        true
      );
    };

    a.setWorkspaceBoxPiHideDrawerHoles = (boxId, hide) => {
      updateProject(
        (prev) => {
          const workspaceBoxes = prev.workspaceBoxes.map((box) =>
            box.id === boxId ? { ...box, piHideDrawerHoles: hide } : box
          );
          return recomputeState(prev, { workspaceBoxes }, true);
        },
        true
      );
    };

    a.setWorkspaceBoxCostaMaterial = (boxId, costaMaterialId, costaThicknessMm) => {
      updateProject(
        (prev) => {
          const workspaceBoxes = prev.workspaceBoxes.map((box) => {
            if (box.id !== boxId) return box;
            const next = { ...box } as typeof box;
            if (costaMaterialId === undefined) {
              delete next.costaMaterialId;
            } else {
              next.costaMaterialId = costaMaterialId;
            }
            if (costaThicknessMm === undefined) {
              delete next.costaThicknessMm;
            } else {
              next.costaThicknessMm = costaThicknessMm;
            }
            return next;
          });
          return recomputeState(prev, { workspaceBoxes }, true);
        },
        true
      );
    };

    a.setWorkspaceBoxSeparadorMaterial = (boxId, separadorMaterialId) => {
      updateProject(
        (prev) => {
          const workspaceBoxes = prev.workspaceBoxes.map((box) => {
            if (box.id !== boxId) return box;
            const next = { ...box } as typeof box;
            if (separadorMaterialId === undefined) {
              delete next.separadorMaterialId;
            } else {
              next.separadorMaterialId = separadorMaterialId;
            }
            return next;
          });
          return recomputeState(prev, { workspaceBoxes }, true);
        },
        true
      );
    };

    a.setWorkspaceBoxNoBackPanel = (boxId, enabled) => {
      updateProject(
        (prev) => {
          const workspaceBoxes = prev.workspaceBoxes.map((box) =>
            box.id === boxId ? applyNoBackPanelState(box, enabled) : box
          );
          return recomputeState(prev, { workspaceBoxes }, true);
        },
        true
      );
    };

    a.setTipoBorda = (tipoBorda) => {
      updateProject(
        (prev) => {
          const workspaceBoxes = prev.workspaceBoxes.map((box) =>
            box.id === prev.selectedWorkspaceBoxId ? { ...box, tipoBorda } : box
          );
          return recomputeState(prev, { workspaceBoxes }, true);
        },
        true
      );
    };

    a.setTipoFundo = (tipoFundo) => {
      updateProject(
        (prev) => {
          const workspaceBoxes = prev.workspaceBoxes.map((box) =>
            box.id === prev.selectedWorkspaceBoxId ? { ...box, tipoFundo } : box
          );
          return recomputeState(prev, { workspaceBoxes }, true);
        },
        true
      );
    };

    a.alignFrontWithNeighbor = (boxId) => {
      updateProject(
        (prev) => {
          const selected = prev.workspaceBoxes.find((b) => b.id === boxId);
          if (!selected?.dimensoes?.profundidade || selected.locked) return prev;
          const others = prev.workspaceBoxes.filter(
            (b) => b.id !== boxId && b.dimensoes?.profundidade != null
          );
          if (others.length === 0) return prev;
          const selectedX = selected.posicaoX_mm ?? 0;
          let nearest = others[0];
          let minDistX = Math.abs((nearest.posicaoX_mm ?? 0) - selectedX);
          for (let i = 1; i < others.length; i++) {
            const distX = Math.abs((others[i].posicaoX_mm ?? 0) - selectedX);
            if (distX < minDistX) {
              minDistX = distX;
              nearest = others[i];
            }
          }
          const neighborProf = nearest.dimensoes?.profundidade ?? 0;
          const neighborFrontZ = (nearest.posicaoZ_mm ?? 0) + neighborProf / 2;
          const selectedProf = selected.dimensoes.profundidade ?? 0;
          const newZ = neighborFrontZ - selectedProf / 2;
          const workspaceBoxes = prev.workspaceBoxes.map((b) =>
            b.id === boxId ? { ...b, posicaoZ_mm: newZ, manualPosition: true } : b
          );
          return { ...prev, workspaceBoxes };
        },
        true
      );
    };

    a.alignBottomSelectedBoxes = (boxIds) => {
      updateProject(
        (prev) => {
          const sel = prev.selectedWorkspaceBoxId?.trim();
          const boxId = sel || (boxIds ?? []).find((id) => id?.trim());
          if (!boxId) return prev;

          const subject = prev.workspaceBoxes.find((b) => b.id === boxId);
          if (!subject || subject.locked) return prev;

          const getBottomY = (box: typeof subject) => {
            const y = box.posicaoY_mm ?? 0;
            const h = box.dimensoes?.altura ?? 0;
            return y - h / 2;
          };

          const distSqXZ = (a: typeof subject, b: typeof subject) => {
            const dx = (a.posicaoX_mm ?? 0) - (b.posicaoX_mm ?? 0);
            const dz = (a.posicaoZ_mm ?? 0) - (b.posicaoZ_mm ?? 0);
            return dx * dx + dz * dz;
          };

          const others = prev.workspaceBoxes.filter((b) => b.id !== boxId);
          let targetBottomY = 0;
          if (others.length > 0) {
            let nearest = others[0];
            let best = distSqXZ(subject, nearest);
            for (let i = 1; i < others.length; i++) {
              const o = others[i];
              const d = distSqXZ(subject, o);
              if (d < best) {
                best = d;
                nearest = o;
              }
            }
            targetBottomY = getBottomY(nearest);
          }

          const h = subject.dimensoes?.altura ?? 0;
          const nextY = targetBottomY + h / 2;
          if ((subject.posicaoY_mm ?? 0) === nextY) return prev;

          const workspaceBoxes = prev.workspaceBoxes.map((b) =>
            b.id === boxId ? { ...b, posicaoY_mm: nextY, manualPosition: true } : b
          );
          return { ...prev, workspaceBoxes };
        },
        true
      );
    };

    a.toggleWorkspaceRotation = (boxId) => {
      updateProject(
        (prev) => {
          const box = prev.workspaceBoxes.find((b) => b.id === boxId);
          if (box?.locked) return prev;
          const workspaceBoxes = prev.workspaceBoxes.map((boxItem) => {
            if (boxItem.id !== boxId) return boxItem;
            const currentRad = boxItem.rotacaoY ?? 0;
            let nextRad = currentRad + Math.PI / 2;
            let deg = (nextRad * 180) / Math.PI;
            deg = Math.round(deg / 90) * 90;
            deg = ((deg % 360) + 360) % 360;
            if (deg === 360) deg = 0;
            nextRad = (deg * Math.PI) / 180;
            return {
              ...boxItem,
              rotacaoY_90: !boxItem.rotacaoY_90,
              rotacaoY: nextRad,
              autoRotateEnabled: false,
              manualPosition: true,
            };
          });
          return { ...prev, workspaceBoxes };
        },
        true
      );
    };

    a.rotateWorkspaceBox = (boxId) => {
      a.toggleWorkspaceRotation(boxId);
    };

    return a;
  }, [updateProject, viewerSync]);
}
