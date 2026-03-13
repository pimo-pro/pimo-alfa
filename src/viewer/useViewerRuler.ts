/**
 * Hook especializado para régua e medidas no viewer.
 * Recebe a instância do ViewerCore (ex.: window.viewerCore) para aceder à API de régua.
 * Sempre chama useMemo com dependência [viewerCore]. NOOP e API real têm exatamente a mesma forma
 * (todas as chaves presentes; getters são funções que retornam undefined em NOOP).
 */
import { useMemo } from "react";

const NOOP = () => {};
const NOOP_RETURN_UNDEFINED = () => undefined;

/** API NOOP com exatamente as mesmas chaves que a API real. Referência estável. */
const RULER_NOOP_API = {
  getRulerEdgeAtPointer: NOOP_RETURN_UNDEFINED,
  getRulerMeasurements: NOOP_RETURN_UNDEFINED,
  setRulerEnabled: NOOP,
  getInternalRulerPickAtPointer: NOOP_RETURN_UNDEFINED,
  cycleInternalRulerSelection: NOOP,
  clearInternalRulerSelection: NOOP,
  getInternalRulerMeasurement: NOOP_RETURN_UNDEFINED,
  setOnRulerTick: NOOP,
} as const;

export function useViewerRuler(viewerCore: {
  getRulerEdgeAtPointer?: (_event: { clientX: number; clientY: number }) => unknown;
  getRulerMeasurements?: (_referenceBoxId: string | null) => unknown;
  setRulerEnabled?: (_enabled: boolean) => void;
  getInternalRulerPickAtPointer?: (_event: { clientX: number; clientY: number }) => unknown;
  cycleInternalRulerSelection?: (_result: unknown) => void;
  clearInternalRulerSelection?: () => void;
  getInternalRulerMeasurement?: () => unknown;
  setOnRulerTick?: (_callback: (() => void) | null) => void;
} | null | undefined) {
  return useMemo(() => {
    if (!viewerCore) return RULER_NOOP_API;

    const bind = (fn: ((..._args: unknown[]) => unknown) | undefined) =>
      fn ? fn.bind(viewerCore) : NOOP;

    return {
      getRulerEdgeAtPointer: bind(viewerCore.getRulerEdgeAtPointer) ?? NOOP_RETURN_UNDEFINED,
      getRulerMeasurements: bind(viewerCore.getRulerMeasurements) ?? NOOP_RETURN_UNDEFINED,
      setRulerEnabled: bind(viewerCore.setRulerEnabled),
      getInternalRulerPickAtPointer: bind(viewerCore.getInternalRulerPickAtPointer) ?? NOOP_RETURN_UNDEFINED,
      cycleInternalRulerSelection: bind(viewerCore.cycleInternalRulerSelection),
      clearInternalRulerSelection: bind(viewerCore.clearInternalRulerSelection),
      getInternalRulerMeasurement: bind(viewerCore.getInternalRulerMeasurement) ?? NOOP_RETURN_UNDEFINED,
      setOnRulerTick: bind(viewerCore.setOnRulerTick) ?? NOOP,
    };
  }, [viewerCore]);
}
