/**
 * MaterialEngine — Materiais partilhados para overlays (evitar uma instância por chamada).
 * Panel Visualization 2.1: contornos estáveis, legíveis e preparados para Edge Selection futuro.
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
      color: new THREE.Color("#1e2535"),
      transparent: true,
      opacity: 0.88,
      linewidth: 1,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
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
