/**
 * MaterialEngine — Materiais partilhados para overlays (evitar uma instância por chamada).
 */

import * as THREE from "three";

let sharedPanelEdgeMaterial: THREE.LineBasicMaterial | null = null;

/**
 * Material único para overlay de arestas de painéis/portas/gavetas.
 * Reutilizado por todos os meshes; evita muitas instâncias iguais.
 */
export function getSharedPanelEdgeMaterial(): THREE.LineBasicMaterial {
  if (!sharedPanelEdgeMaterial) {
    sharedPanelEdgeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#000000"),
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }
  return sharedPanelEdgeMaterial;
}

/**
 * Liberta o material partilhado (chamar no dispose do ViewerCore).
 */
export function disposeSharedPanelEdgeMaterial(): void {
  if (sharedPanelEdgeMaterial) {
    sharedPanelEdgeMaterial.dispose();
    sharedPanelEdgeMaterial = null;
  }
}
