import type { InternalMeasurementEntry } from "./internalRulerTypes";
import type { InternalRuler, InternalRulerMeasurement } from "./InternalRuler";

export type InternalRulerFacade = {
  enableForBox: (_boxId: string) => void;
  disable: () => void;
  isActive: () => boolean;
  getLastMeasurement: () => InternalRulerMeasurement | null;
  getActiveBoxId: () => string | null;
  syncFromProject: (_entries: InternalMeasurementEntry[]) => void;
};

export function createInternalRulerFacade(engine: InternalRuler): InternalRulerFacade {
  return {
    enableForBox: (boxId) => engine.enableForBox(boxId),
    disable: () => engine.disable(),
    isActive: () => engine.isActive(),
    getLastMeasurement: () => engine.getLastMeasurement(),
    getActiveBoxId: () => engine.getActiveBoxId(),
    syncFromProject: (entries) => engine.syncFromProject(entries),
  };
}
