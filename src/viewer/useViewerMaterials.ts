/**
 * Hook especializado para materiais no viewer.
 * Obtém a API de materiais a partir de window.viewerCore.
 * Sempre chama useMemo com dependência [viewerCore]. NOOP e API real têm exatamente a mesma forma.
 */
import { useMemo } from "react";

declare global {
  interface Window {
    viewerCore?: {
      updateBoxMaterial?: (id: string, materialName: string) => void;
      updateDoorMaterial?: (boxId: string, doorLayerId: string, materialName: string) => void;
      updateDrawerMaterial?: (boxId: string, drawerLayerId: string, materialName: string) => void;
      setMaterialMode?: (mode: unknown) => void;
      getMaterialMode?: () => unknown;
      setMaterialQuality?: (quality: unknown) => void;
      getMaterialQuality?: () => unknown;
      applyMaterialPreset?: (presetId: unknown) => void;
    };
  }
}

const NOOP = () => {};
const NOOP_RETURN_UNDEFINED = () => undefined;

/** API NOOP com exatamente as mesmas chaves que a API real. Referência estável. */
const MATERIALS_NOOP_API = {
  updateBoxMaterial: NOOP,
  updateDoorMaterial: NOOP,
  updateDrawerMaterial: NOOP,
  setMaterialMode: NOOP,
  getMaterialMode: NOOP_RETURN_UNDEFINED,
  setMaterialQuality: NOOP,
  getMaterialQuality: NOOP_RETURN_UNDEFINED,
  applyMaterialPreset: NOOP,
} as const;

export function useViewerMaterials() {
  const viewerCore =
    typeof window !== "undefined" ? (window as Window).viewerCore : undefined;

  return useMemo(() => {
    if (!viewerCore) return MATERIALS_NOOP_API;

    const bind = (fn: ((...args: unknown[]) => unknown) | undefined) =>
      fn ? fn.bind(viewerCore) : NOOP;

    return {
      updateBoxMaterial: bind(viewerCore.updateBoxMaterial),
      updateDoorMaterial: bind(viewerCore.updateDoorMaterial),
      updateDrawerMaterial: bind(viewerCore.updateDrawerMaterial),
      setMaterialMode: bind(viewerCore.setMaterialMode),
      getMaterialMode: bind(viewerCore.getMaterialMode),
      setMaterialQuality: bind(viewerCore.setMaterialQuality),
      getMaterialQuality: bind(viewerCore.getMaterialQuality),
      applyMaterialPreset: bind(viewerCore.applyMaterialPreset),
    };
  }, [viewerCore]);
}
