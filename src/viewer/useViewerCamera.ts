/**
 * Hook especializado para câmera do viewer.
 * Obtém a API de câmera a partir de window.viewerCore.
 * Sempre chama useMemo com dependência [viewerCore]. NOOP e API real têm exatamente a mesma forma.
 */
import { useMemo } from "react";

declare global {
  interface Window {
    viewerCore?: {
      setCameraView?: (preset: "top" | "bottom" | "front" | "back" | "right" | "left" | "isometric") => void;
      resetCamera?: () => void;
      getCameraPosition?: () => unknown;
      setCameraPosition?: (...args: unknown[]) => void;
      setCameraZoom?: (...args: unknown[]) => void;
      getCameraZoom?: () => unknown;
    };
  }
}

const NOOP = () => {};
const NOOP_RETURN_UNDEFINED = () => undefined;

/** API NOOP com exatamente as mesmas chaves que a API real. Referência estável. */
const CAMERA_NOOP_API = {
  setCameraView: NOOP,
  resetCamera: NOOP,
  getCameraPosition: NOOP_RETURN_UNDEFINED,
  setCameraPosition: NOOP,
  setCameraZoom: NOOP,
  getCameraZoom: NOOP_RETURN_UNDEFINED,
} as const;

export function useViewerCamera() {
  const viewerCore =
    typeof window !== "undefined" ? (window as Window).viewerCore : undefined;

  return useMemo(() => {
    if (!viewerCore) return CAMERA_NOOP_API;

    const bind = (fn: ((...args: unknown[]) => unknown) | undefined) =>
      fn ? fn.bind(viewerCore) : NOOP;

    return {
      setCameraView: bind(viewerCore.setCameraView),
      resetCamera: bind(viewerCore.resetCamera),
      getCameraPosition: bind(viewerCore.getCameraPosition),
      setCameraPosition: bind(viewerCore.setCameraPosition),
      setCameraZoom: bind(viewerCore.setCameraZoom),
      getCameraZoom: bind(viewerCore.getCameraZoom),
    };
  }, [viewerCore]);
}
