import { useEffect } from "react";

import { useShowroomStore } from "./showroomStore";

const STEP = 0.12;

/**
 * Setas do teclado deslocam o projeto selecionado no plano XZ (ferramenta Mover).
 */
export function ShowroomArrowKeys() {
  const activeTool = useShowroomStore((s) => s.activeTool);
  const selectedId = useShowroomStore((s) => s.selectedId);

  useEffect(() => {
    if (activeTool !== "move" || !selectedId) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const id = useShowroomStore.getState().selectedId;
      if (!id) return;
      let dx = 0;
      let dz = 0;
      if (e.key === "ArrowLeft") dx = -STEP;
      else if (e.key === "ArrowRight") dx = STEP;
      else if (e.key === "ArrowUp") dz = -STEP;
      else if (e.key === "ArrowDown") dz = STEP;
      else return;
      e.preventDefault();
      useShowroomStore.getState().moveProject(id, { x: dx, y: 0, z: dz });
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTool, selectedId]);

  return null;
}
