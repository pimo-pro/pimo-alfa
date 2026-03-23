import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import { recomputeState } from "../projectState";
import { regenerateLayersForBox } from "../../services/boxLayersService";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type BoxTransformActions = Pick<
  ProjectActions,
  | "setDimensoes"
  | "setWorkspaceBoxDimensoes"
  | "updateWorkspacePosition"
  | "updateWorkspaceBoxTransform"
  | "setWorkspaceBoxNome"
  | "setWorkspaceBoxMaterial"
  | "setWorkspaceBoxLocked"
  | "setWorkspaceBoxPiHideDrawerHoles"
  | "setTipoBorda"
  | "setTipoFundo"
  | "alignFrontWithNeighbor"
  | "toggleWorkspaceRotation"
  | "rotateWorkspaceBox"
>;

export function useBoxTransformActions(ctx: ProjectActionsExecutionContext): BoxTransformActions {
  const { updateProject } = ctx;

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
              const updatedBox = { ...b, dimensoes: { ...b.dimensoes, ...dimensoes } };
              const layers = regenerateLayersForBox(updatedBox);
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
            const updatedBox = { ...boxItem, dimensoes: { ...boxItem.dimensoes, ...dimensoes } };
            const layers = regenerateLayersForBox(updatedBox);
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

            return next;
          });
          return { ...prev, workspaceBoxes };
        },
        false
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
          const workspaceBoxes = prev.workspaceBoxes.map((box) =>
            box.id === boxId ? { ...box, material: materialId } : box
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
  }, [updateProject]);
}
