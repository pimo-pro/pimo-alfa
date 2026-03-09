/**
 * Snapshot da câmera e restauração.
 * Usado pelo Viewer para saveSnapshot/restoreSnapshot.
 */

import type * as THREE from "three";
import type { ViewerSnapshot } from "../../../context/projectTypes";

export interface SnapshotRendererCamera {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  zoom: number;
  type: string;
}

export interface SnapshotRendererControls {
  target: THREE.Vector3;
  update: () => void;
}

export interface SnapshotRendererHost {
  getCamera: () => SnapshotRendererCamera;
  getControls: () => SnapshotRendererControls | null;
  getScene: () => THREE.Scene;
  getRenderer: () => THREE.WebGLRenderer;
  getContainer: () => HTMLElement;
}

export class SnapshotRenderer {
  private host: SnapshotRendererHost;

  constructor(host: SnapshotRendererHost) {
    this.host = host;
  }

  /**
   * Captura estado atual da câmera (posição, alvo, zoom) para restauração posterior.
   */
  saveSnapshot(): ViewerSnapshot | null {
    const camera = this.host.getCamera();
    const controls = this.host.getControls();
    if (!camera) return null;
    const position: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const target: [number, number, number] = controls
      ? [controls.target.x, controls.target.y, controls.target.z]
      : [0, 0, 0];
    return {
      camera: {
        position,
        target,
        zoom: camera.zoom,
        type: camera.type === "OrthographicCamera" ? "orthographic" : "perspective",
      },
      objects: [],
      materials: [],
      scene: {
        hasFloor: false,
        hasGrid: false,
        environment: false,
        lights: [],
      },
    };
  }

  /**
   * Restaura câmera e controles a partir de um snapshot.
   */
  restoreSnapshot(snapshot: ViewerSnapshot | null): void {
    if (!snapshot?.camera) return;
    const camera = this.host.getCamera();
    const controls = this.host.getControls();
    if (!camera) return;
    const [x, y, z] = snapshot.camera.position;
    camera.position.set(x, y, z);
    camera.zoom = snapshot.camera.zoom ?? 1;
    if (camera.zoom !== undefined) {
      if ("updateProjectionMatrix" in camera && typeof (camera as THREE.OrthographicCamera).updateProjectionMatrix === "function") {
        (camera as THREE.OrthographicCamera).updateProjectionMatrix();
      }
    }
    if (controls) {
      const [tx, ty, tz] = snapshot.camera.target ?? [0, 0, 0];
      controls.target.set(tx, ty, tz);
      controls.update();
    }
  }
}
