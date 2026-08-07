import type { UnifiedMeasurement } from "./unifiedMeasurementTypes";
import type {
  UnifiedMeasurementEngine,
  UnifiedMeasurementMeasurement,
} from "./UnifiedMeasurementEngine";

/**
 * Facade compatível exposta como `viewerApi.internalRuler`.
 * Agora ligada ao motor unificado (a medição é global, não por caixa).
 * Mantém a assinatura para não partir ContextMenu / painel de medições.
 */
export type InternalRulerFacade = {
  enableForBox: (_boxId: string) => void;
  disable: () => void;
  isActive: () => boolean;
  getLastMeasurement: () => UnifiedMeasurementMeasurement | null;
  getActiveBoxId: () => string | null;
  syncFromProject: (_entries: UnifiedMeasurement[]) => void;
};

export function createInternalRulerFacade(engine: UnifiedMeasurementEngine): InternalRulerFacade {
  return {
    enableForBox: (boxId) => engine.enableForBox(boxId),
    disable: () => engine.disable(),
    isActive: () => engine.isActive(),
    getLastMeasurement: () => engine.getLastMeasurement(),
    getActiveBoxId: () => engine.getActiveBoxId(),
    syncFromProject: (entries) => engine.syncFromProject(entries),
  };
}
