import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectState, ViewerSync } from "../context/projectTypes";

export type SelectedBoxInfo = {
  L: number;
  A: number;
  P: number;
  rotationDeg: number;
};

function computeSelectedBoxInfo(
  sync: ViewerSync | null,
  project: ProjectState
): SelectedBoxInfo | null {
  const selectedBoxId = project.selectedWorkspaceBoxId;
  if (!sync || !selectedBoxId) return null;

  const dims = sync.getSelectedBoxDimensions();
  const box = project.workspaceBoxes.find((b) => b.id === selectedBoxId);
  const rotRad = box?.rotacaoY ?? 0;
  const rotationDeg = (rotRad * 180) / Math.PI;

  if (!dims) return null;
  return {
    L: dims.width,
    A: dims.height,
    P: dims.depth,
    rotationDeg,
  };
}

/**
 * Hook que expõe L, A, P e rotação da caixa atualmente selecionada.
 * Atualizado por evento do Viewer (mudança de seleção ou updateBox na caixa selecionada).
 * Retorna null quando não há caixa selecionada.
 */
export function useSelectedBoxInfo(
  project: ProjectState,
  viewerSync: ViewerSync | null
): SelectedBoxInfo | null {
  const [info, setInfo] = useState<SelectedBoxInfo | null>(null);
  const projectRef = useRef(project);
  const viewerSyncRef = useRef(viewerSync);

  useEffect(() => {
    projectRef.current = project;
    viewerSyncRef.current = viewerSync;
  }, [project, viewerSync]);

  const refreshInfo = useCallback(() => {
    const sync = viewerSyncRef.current;
    const proj = projectRef.current;
    const next = computeSelectedBoxInfo(sync, proj);
    setInfo((prev) => {
      if (next == null) return null;
      if (
        prev &&
        prev.L === next.L &&
        prev.A === next.A &&
        prev.P === next.P &&
        Math.abs(prev.rotationDeg - next.rotationDeg) < 0.01
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    refreshInfo();
    const unsubscribe =
      viewerSync?.subscribeSelectedBoxChange?.(() => {
        refreshInfo();
      });
    return () => {
      unsubscribe?.();
    };
  }, [viewerSync, project.selectedWorkspaceBoxId, refreshInfo]);

  return info;
}
