/**
 * SelectionManager: estado A (amarelo) e B (azul) para régua interna.
 * Aplica highlight por vertex color nos meshes; restaura ao limpar.
 */

import * as THREE from "three";
import type { InternalRulerPickResult } from "./types";

const COLOR_A = new THREE.Color(0xffff00); // amarelo
const COLOR_B = new THREE.Color(0x0088ff); // azul
const COLOR_DEFAULT = new THREE.Color(0xffffff);

interface SavedState {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export class SelectionManager {
  private internalA: InternalRulerPickResult | null = null;
  private internalB: InternalRulerPickResult | null = null;
  /** Geometria e material originais por mesh (para restaurar ao limpar). */
  private savedByMesh = new Map<THREE.Mesh, SavedState>();

  getA(): InternalRulerPickResult | null {
    return this.internalA;
  }

  getB(): InternalRulerPickResult | null {
    return this.internalB;
  }

  setA(value: InternalRulerPickResult | null): void {
    this.internalA = value;
    this.applyHighlights();
  }

  setB(value: InternalRulerPickResult | null): void {
    this.internalB = value;
    this.applyHighlights();
  }

  /** Ciclo: sem A -> A; com A sem B -> B; com A e B -> limpar. */
  cycleSelection(result: InternalRulerPickResult): void {
    if (!this.internalA) {
      this.setA(result);
      return;
    }
    if (!this.internalB) {
      this.setB(result);
      return;
    }
    this.clear();
    this.setA(result);
  }

  clear(): void {
    this.restoreAll();
    this.internalA = null;
    this.internalB = null;
    this.savedByMesh.clear();
  }

  /** Restaura geometria e material originais em todos os meshes que tínhamos alterado. */
  private restoreAll(): void {
    this.savedByMesh.forEach((saved, mesh) => {
      if (mesh.geometry !== saved.geometry) {
        mesh.geometry.dispose();
        mesh.geometry = saved.geometry;
      }
      if (mesh.material !== saved.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose?.());
        } else {
          (mesh.material as THREE.Material).dispose?.();
        }
        mesh.material = saved.material;
      }
    });
    this.savedByMesh.clear();
  }

  private applyHighlights(): void {
    const currentMeshes = new Set<THREE.Mesh>();
    if (this.internalA?.object instanceof THREE.Mesh) currentMeshes.add(this.internalA.object);
    if (this.internalB?.object instanceof THREE.Mesh) currentMeshes.add(this.internalB.object);

    this.savedByMesh.forEach((saved, mesh) => {
      if (currentMeshes.has(mesh)) return;
      if (mesh.geometry !== saved.geometry) {
        (mesh.geometry as THREE.BufferGeometry).dispose?.();
        mesh.geometry = saved.geometry;
      }
      if (mesh.material !== saved.material) {
        (mesh.material as THREE.Material).dispose?.();
        mesh.material = saved.material;
      }
      this.savedByMesh.delete(mesh);
    });

    currentMeshes.forEach((mesh) => {
      if (!mesh.geometry) return;
      const geom = mesh.geometry as THREE.BufferGeometry;
      if (!geom.attributes.position) return;

      if (!this.savedByMesh.has(mesh)) {
        this.savedByMesh.set(mesh, {
          geometry: geom.clone(),
          material: (mesh.material as THREE.Material).clone(),
        });
      }
      const saved = this.savedByMesh.get(mesh)!;
      const baseGeom = saved.geometry.clone();
      const pos = baseGeom.attributes.position;
      const count = pos.count;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        COLOR_DEFAULT.toArray(colors, i * 3);
      }

      const setColor = (indices: number[], color: THREE.Color) => {
        for (const idx of indices) {
          if (idx >= 0 && idx < count) color.toArray(colors, idx * 3);
        }
      };

      if (this.internalA?.object === mesh) {
        setColor(this.internalA.vertexIndices, COLOR_A);
      }
      if (this.internalB?.object === mesh) {
        setColor(this.internalB.vertexIndices, COLOR_B);
      }

      baseGeom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      baseGeom.attributes.color.needsUpdate = true;

      const mat = saved.material.clone() as THREE.MeshStandardMaterial;
      mat.vertexColors = true;
      if (mesh.geometry !== saved.geometry) {
        (mesh.geometry as THREE.BufferGeometry).dispose?.();
      }
      mesh.geometry = baseGeom;
      mesh.material = mat;
    });
  }

  /** Retorna medição A↔B em mm se ambos definidos. */
  getMeasurement(): { pointA: THREE.Vector3; pointB: THREE.Vector3; distanceMm: number } | null {
    if (!this.internalA || !this.internalB) return null;
    const d = this.internalA.point.distanceTo(this.internalB.point);
    return {
      pointA: this.internalA.point.clone(),
      pointB: this.internalB.point.clone(),
      distanceMm: Math.round(d * 1000),
    };
  }
}
