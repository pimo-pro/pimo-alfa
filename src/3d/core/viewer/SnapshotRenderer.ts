/**
 * Snapshot da câmera, restauração e vista 2D (ortográfica).
 * Usado pelo Viewer e pelo viewerApiAdapter para saveSnapshot/restoreSnapshot/enable2DView/disable2DView.
 */

import type * as THREE from "three";
import type { ViewerSnapshot, Viewer2DAngle } from "../../../context/projectTypes";

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

/** Estado guardado para restore e para disable2DView. */
export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
  type: string;
}

export class SnapshotRenderer {
  private host: SnapshotRendererHost;
  private previousState: CameraState | null = null;
  private twoDViewActive = false;

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
    this.twoDViewActive = false;
    this.previousState = null;
  }

  /**
   * Fixa a câmera em vista ortográfica (top, front, left, right).
   */
  enable2DView(angle: Viewer2DAngle): void {
    const camera = this.host.getCamera();
    const controls = this.host.getControls();
    if (!camera || !controls) return;
    this.previousState = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      zoom: camera.zoom,
      type: camera.type,
    };
    this.twoDViewActive = true;
    const dist = 10;
    const lookAt = { x: 0, y: 0, z: 0 };
    switch (angle) {
      case "top":
        camera.position.set(lookAt.x, dist, lookAt.z);
        break;
      case "front":
        camera.position.set(lookAt.x, lookAt.y, dist);
        break;
      case "left":
        camera.position.set(-dist, lookAt.y, lookAt.z);
        break;
      case "right":
        camera.position.set(dist, lookAt.y, lookAt.z);
        break;
      default:
        return;
    }
    controls.target.set(lookAt.x, lookAt.y, lookAt.z);
    controls.update();
  }

  /**
   * Restaura a câmera ao estado anterior (antes de enable2DView).
   */
  disable2DView(): void {
    if (!this.previousState) return;
    const camera = this.host.getCamera();
    const controls = this.host.getControls();
    if (!camera || !controls) return;
    const [px, py, pz] = this.previousState.position;
    const [tx, ty, tz] = this.previousState.target;
    camera.position.set(px, py, pz);
    camera.zoom = this.previousState.zoom;
    if ("updateProjectionMatrix" in camera && typeof (camera as THREE.OrthographicCamera).updateProjectionMatrix === "function") {
      (camera as THREE.OrthographicCamera).updateProjectionMatrix();
    }
    controls.target.set(tx, ty, tz);
    controls.update();
    this.previousState = null;
    this.twoDViewActive = false;
  }

  is2DViewActive(): boolean {
    return this.twoDViewActive;
  }
}
