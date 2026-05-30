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
};

export function createEmptyProjectMeasurements(): ProjectMeasurementsState {
  return { internal: [] };
}

export function createInternalMeasurementId(): string {
  return `ir-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
