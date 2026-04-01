import { useEffect, useRef } from "react";

import { useShowroomStore } from "./showroomStore";

/**
 * Rotação livre: Shift + arrastar horizontalmente (com ferramenta Rodar e projeto selecionado).
 */
export function ShowroomRotatePointer() {
  const activeTool = useShowroomStore((s) => s.activeTool);
  const selectedId = useShowroomStore((s) => s.selectedId);
  const dragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    if (activeTool !== "rotate" || !selectedId) return;

    const onDown = (e: PointerEvent) => {
      if (!e.shiftKey) return;
      dragging.current = true;
      lastX.current = e.clientX;
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      if (!e.shiftKey) {
        dragging.current = false;
        return;
      }
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      useShowroomStore.getState().rotateProject(selectedId, -dx * 0.012);
    };

    const onUp = () => {
      dragging.current = false;
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [activeTool, selectedId]);

  return null;
}
