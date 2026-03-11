/**
 * Módulo régua (medição): Edge Picking, RulerManager, régua interna (SelectionManager) e cálculo de distâncias.
 */

export { getRulerEdgeAtPointer } from "./EdgePicker";
export { getRulerMeasurements as getRulerMeasurementsFromManager } from "./RulerManager";
export { pickInternalAtPointer } from "./InternalPicker";
export { SelectionManager } from "./SelectionManager";
export {
  distancePointToPoint,
  distancePointToSegment,
  distanceSegmentToSegment,
  getMeasurementType,
} from "./measurementUtils";
export type {
  RulerDistanceResult,
  RulerEdgePickResult,
  RulerManagerMeasurement,
  RulerManagerResult,
  RulerMeasurementType,
  RulerPickType,
  InternalRulerPickType,
  InternalRulerPickResult,
} from "./types";
export type { RulerManagerBoxData, RulerManagerOtherBox, RulerManagerRoomBounds } from "./RulerManager";
