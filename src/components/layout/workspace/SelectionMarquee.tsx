import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

export type SelectionMarqueeProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  enabled: boolean;
  /** Só inicia marquee se o clique inicial não acertar objeto selecionável. */
  canStartAtPointer?: (_event: PointerEvent) => boolean;
  onSelectionComplete: (_ids: string[]) => void;
  getIdsInRect: (
    _rect: { left: number; top: number; right: number; bottom: number }
  ) => string[];
};

/**
 * Seleção por arrasto (marquee) no canvas do viewer.
 * Ativa apenas em modo select e sem Ctrl/Meta pressionado.
 */
export default function SelectionMarquee({
  containerRef,
  enabled,
  canStartAtPointer,
  onSelectionComplete,
  getIdsInRect,
}: SelectionMarqueeProps) {
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<Point | null>(null);
  const [current, setCurrent] = useState<Point | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setDragging(false);
    setStart(null);
    setCurrent(null);
    pointerIdRef.current = null;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (canStartAtPointer && !canStartAtPointer(event)) return;
      if ((event.target as HTMLElement)?.closest?.("[data-transform-controls]")) return;
      pointerIdRef.current = event.pointerId;
      setDragging(true);
      setStart({ x: event.clientX, y: event.clientY });
      setCurrent({ x: event.clientX, y: event.clientY });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || pointerIdRef.current !== event.pointerId) return;
      setCurrent({ x: event.clientX, y: event.clientY });
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragging || pointerIdRef.current !== event.pointerId || !start) {
        reset();
        return;
      }
      const end = { x: event.clientX, y: event.clientY };
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      if (width >= 4 && height >= 4) {
        const rect = {
          left: Math.min(start.x, end.x),
          top: Math.min(start.y, end.y),
          right: Math.max(start.x, end.x),
          bottom: Math.max(start.y, end.y),
        };
        const ids = getIdsInRect(rect);
        if (ids.length > 0) onSelectionComplete(ids);
      }
      reset();
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [containerRef, dragging, enabled, canStartAtPointer, getIdsInRect, onSelectionComplete, reset, start]);

  if (!dragging || !start || !current) return null;

  const left = Math.min(start.x, current.x);
  const top = Math.min(start.y, current.y);
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width,
        height,
        border: "1px solid rgba(77, 163, 255, 0.9)",
        background: "rgba(77, 163, 255, 0.12)",
        pointerEvents: "none",
        zIndex: 9999,
      }}
      aria-hidden
    />
  );
}
