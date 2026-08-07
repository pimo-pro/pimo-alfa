import type * as THREE from "three";
import type { MeasurementSnapKind } from "./measurementSnapService";

/** Ponto de uma medição unificada. Se `ref.boxId` existir, o mundo é reconstruído a partir do local. */
export type UnifiedMeasurementPoint = {
  world: { x: number; y: number; z: number };
  kind: MeasurementSnapKind;
  ref?: {
    boxId?: string;
    local?: { x: number; y: number; z: number };
  };
};

/** Medição global (dois pontos livres em qualquer parte da cena). Precisão 0,1 mm. */
export type UnifiedMeasurement = {
  id: string;
  a: UnifiedMeasurementPoint;
  b: UnifiedMeasurementPoint;
  valueMm: number;
  visible: boolean;
};

/** Medição paramétrica da régua de movimento (caixa->caixa/parede/chão), em metros. */
export type RulerMeasurementHit = {
  kind: "box" | "wall" | "floor";
  distanceM: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
};

export function createUnifiedMeasurementId(): string {
  return `um-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Metros -> milímetros com precisão unificada de 0,1 mm. */
export function metersToMm01(distanceM: number): number {
  return Math.round(distanceM * 10000) / 10;
}
