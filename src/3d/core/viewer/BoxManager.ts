/**
 * Gestão do mapa de caixas e reflow (posicionamento em fila).
 * O Viewer delega addEntry/removeEntry/reflowBoxes aqui; a API pública (addBox, removeBox, etc.) permanece no Viewer.
 */

import * as THREE from "three";
import type { ViewerBoxEntry } from "./types";

export class ViewerBoxManager {
  private readonly boxes = new Map<string, ViewerBoxEntry>();
  private readonly _boundingBox = new THREE.Box3();
  private readonly _size = new THREE.Vector3();

  getBoxes(): Map<string, ViewerBoxEntry> {
    return this.boxes;
  }

  addEntry(id: string, entry: ViewerBoxEntry): void {
    this.boxes.set(id, entry);
  }

  removeEntry(id: string): void {
    this.boxes.delete(id);
  }

  getEntry(id: string): ViewerBoxEntry | undefined {
    return this.boxes.get(id);
  }

  /**
   * Posiciona caixas sem manualPosition lado a lado em X/Z.
   * manualPosition === true: NUNCA alterar position.
   */
  reflowBoxes(boxGap: number): void {
    let cursorX = 0;
    const ordered = Array.from(this.boxes.values()).sort((a, b) => a.index - b.index);
    for (const entry of ordered) {
      let w: number;
      if (!entry.cadOnly && entry.mesh) {
        entry.mesh.updateMatrixWorld(true);
        this._boundingBox.setFromObject(entry.mesh);
        this._boundingBox.getSize(this._size);
        w = Math.max(this._size.x, 0.001);
      } else {
        w = Math.max(Number(entry.width) || 0.001, 0.001);
      }
      entry.mesh.frustumCulled = false;
      if (!entry.manualPosition) {
        entry.mesh.position.x = cursorX + w / 2;
        entry.mesh.position.z = 0;
      }
      entry.mesh.updateMatrixWorld();
      cursorX += w + boxGap;
    }
  }
}
