import { useEffect, useRef, useState } from "react";
import type { ProjectState, ViewerSync } from "../context/projectTypes";

const SELECTED_BOX_POLL_MS = 120;

export type SelectedBoxInfo = {
  L: number;
  A: number;
  P: number;
  rotationDeg: number;
};

/**
 * Hook que expõe L, A, P e rotação da caixa atualmente selecionada.
 * Atualizado quando a seleção ou os dados do viewer mudam (RAF).
 * Retorna null quando não há caixa selecionada.
 */
export function useSelectedBoxInfo(
  project: ProjectState,
  viewerSync: ViewerSync | null
): SelectedBoxInfo | null {
  const [info, setInfo] = useState<SelectedBoxInfo | null>(null);
  const projectRef = useRef(project);
  const viewerSyncRef = useRef(viewerSync);
  const lastRef = useRef<SelectedBoxInfo | null>(null);
  const intervalIdRef = useRef<number | null>(null);

  useEffect(() => {
    projectRef.current = project;
    viewerSyncRef.current = viewerSync;
  }, [project, viewerSync]);

  useEffect(() => {
    const tick = () => {
      const sync = viewerSyncRef.current;
      const proj = projectRef.current;
      const selectedBoxId = proj.selectedWorkspaceBoxId;

      if (!sync || !selectedBoxId) {
        if (lastRef.current !== null) {
          lastRef.current = null;
          setInfo(null);
        }
        return;
      }

      const dims = sync.getSelectedBoxDimensions();
      const box = proj.workspaceBoxes.find((b) => b.id === selectedBoxId);
      const rotRad = box?.rotacaoY ?? 0;
      const rotationDeg = (rotRad * 180) / Math.PI;

      if (!dims) {
        if (lastRef.current !== null) {
          lastRef.current = null;
          setInfo(null);
        }
      } else {
        const next: SelectedBoxInfo = {
          L: dims.width,
          A: dims.height,
          P: dims.depth,
          rotationDeg,
        };
        const same =
          lastRef.current &&
          lastRef.current.L === next.L &&
          lastRef.current.A === next.A &&
          lastRef.current.P === next.P &&
          Math.abs(lastRef.current.rotationDeg - next.rotationDeg) < 0.01;
        if (!same) {
          lastRef.current = next;
          setInfo(next);
        }
      }
    };

    tick();
    intervalIdRef.current = window.setInterval(tick, SELECTED_BOX_POLL_MS);

    return () => {
      if (intervalIdRef.current != null) {
        window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [project.selectedWorkspaceBoxId, viewerSync]);

  return info;
}
