/**
 * Tipos compartilhados pelos módulos do viewer-engine (BoxManager, loader, etc.).
 * Mantém a API externa do Viewer estável.
 */

import type * as THREE from "three";
import type { LoadedWoodMaterial } from "../../materials/WoodMaterial";
import type { ViewerDrillMarkersByPanel } from "../../../core/types";

/** Entrada de uma caixa no viewer (mapa interno do BoxManager). */
export interface ViewerBoxEntry {
  mesh: THREE.Object3D;
  width: number;
  height: number;
  depth: number;
  index: number;
  cadOnly?: boolean;
  manualPosition?: boolean;
  cabinetType?: "lower" | "upper";
  pe_cm?: number;
  feetHeight?: number;
  feetOffsetFront?: number;
  feetEnabled?: boolean;
  autoRotateEnabled?: boolean;
  drillMarkersByPanel?: ViewerDrillMarkersByPanel;
  cadModels: Array<{
    id: string;
    object: THREE.Object3D;
    path: string;
  }>;
  material: LoadedWoodMaterial | null;
}
