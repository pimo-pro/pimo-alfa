/** Tipos partilhados entre Viewer e JSON do projeto (medições internas). */

export type InternalMeasurementPoint = {
  x: number;
  y: number;
  z: number;
};

export type InternalMeasurementEntry = {
  id: string;
  boxId: string;
  a: InternalMeasurementPoint;
  b: InternalMeasurementPoint;
  valueMm: number;
  visible: boolean;
};

export type ProjectMeasurementsState = {
  internal: InternalMeasurementEntry[];
  /** Âncoras de medição persistentes no espaço 3D (metros). */
  anchors: import("../../../core/viewer/measurementAnchors").MeasurementAnchorEntry[];
};

export function createEmptyProjectMeasurements(): ProjectMeasurementsState {
  return { internal: [], anchors: [] };
}

export function createInternalMeasurementId(): string {
  return `ir-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
