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
  /** Se true, a peça não pode ser movida nem transformada (apenas selecionável). */
  locked?: boolean;
  drillMarkersByPanel?: ViewerDrillMarkersByPanel;
  cadModels: Array<{
    id: string;
    object: THREE.Object3D;
    path: string;
  }>;
  material: LoadedWoodMaterial | null;
  /** Material aplicado (viewerMaterialId); usado ao reaplicar ao trocar de modo. */
  materialName?: string;
  /** Id do modelo base (ex.: pi-base-*); furação lateral PI sempre aplicada no mesh. */
  baseCabinetId?: string;
  /**
   * Proxy de volume L×A×P de layout: layer 31; `visible: false` no render; só visível em janelas síncronas
   * (`runWithLayoutBoundsProxiesVisible`) para bbox de câmara. Excluído de raycast/reflow/colisão/régua.
   */
  layoutBoundsMesh?: THREE.Mesh;
}
