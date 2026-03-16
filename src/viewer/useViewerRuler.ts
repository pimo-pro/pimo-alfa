import { useMemo } from "react";

type ViewerRulerCoreLike = {
  getRulerEdgeAtPointer?: (_event: { clientX: number; clientY: number }) => unknown;
  getRulerMeasurements?: (_referenceBoxId: string | null) => unknown;
  setRulerEnabled?: (_enabled: boolean) => void;
  getInternalRulerPickAtPointer?: (_event: { clientX: number; clientY: number }) => unknown;
  cycleInternalRulerSelection?: (_result: unknown) => void;
  clearInternalRulerSelection?: () => void;
  getInternalRulerMeasurement?: () => unknown;
  setOnRulerTick?: (_callback: (() => void) | null) => void;
};

const NOOP = () => {};
const UNDEFINED = () => undefined;

const NOOP_RULER_API = {
  getRulerEdgeAtPointer: UNDEFINED,
  getRulerMeasurements: UNDEFINED,
  setRulerEnabled: NOOP,
  getInternalRulerPickAtPointer: UNDEFINED,
  cycleInternalRulerSelection: NOOP,
  clearInternalRulerSelection: NOOP,
  getInternalRulerMeasurement: UNDEFINED,
  setOnRulerTick: NOOP,
} as const;

function bindFn<T extends (...args: never[]) => unknown>(
  owner: object,
  fn: T | undefined,
  fallback: T
): T {
  if (!fn) return fallback;
  return fn.bind(owner) as T;
}

export function useViewerRuler(viewerCore: ViewerRulerCoreLike | null | undefined) {
  return useMemo(() => {
    if (!viewerCore) return NOOP_RULER_API;
    return {
      getRulerEdgeAtPointer: bindFn(viewerCore, viewerCore.getRulerEdgeAtPointer, UNDEFINED),
      getRulerMeasurements: bindFn(viewerCore, viewerCore.getRulerMeasurements, UNDEFINED),
      setRulerEnabled: bindFn(viewerCore, viewerCore.setRulerEnabled, NOOP),
      getInternalRulerPickAtPointer: bindFn(viewerCore, viewerCore.getInternalRulerPickAtPointer, UNDEFINED),
      cycleInternalRulerSelection: bindFn(viewerCore, viewerCore.cycleInternalRulerSelection, NOOP),
      clearInternalRulerSelection: bindFn(viewerCore, viewerCore.clearInternalRulerSelection, NOOP),
      getInternalRulerMeasurement: bindFn(viewerCore, viewerCore.getInternalRulerMeasurement, UNDEFINED),
      setOnRulerTick: bindFn(viewerCore, viewerCore.setOnRulerTick, NOOP),
    };
  }, [viewerCore]);
}
