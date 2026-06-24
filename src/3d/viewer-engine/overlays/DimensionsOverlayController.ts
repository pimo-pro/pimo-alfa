import * as THREE from "three";
import {
  computeUnifiedBoxDimensions,
  createDimensionsOverlay,
  disposeDimensionsOverlay,
  getDimensionsOverlayData,
  getPrintReadyDimensions,
  updateDimensionsOverlay,
  type BoxBoundsInput,
  type DimensionOverlayDataEntry,
  type DimensionsOverlayHandle,
  type PrintReadyDimensions,
} from "./boxDimensionsOverlay";

type DimensionsOverlayControllerDeps = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  getViewportSize: () => { width: number; height: number };
  collectBoxBounds: () => BoxBoundsInput[];
  projectWorldToScreen: (_world: THREE.Vector3) => { x: number; y: number } | null;
};

export class DimensionsOverlayController {
  private readonly deps: DimensionsOverlayControllerDeps;
  private visible = false;
  private handle: DimensionsOverlayHandle | null = null;

  constructor(deps: DimensionsOverlayControllerDeps) {
    this.deps = deps;
  }

  get group(): THREE.Group | null {
    return this.handle?.group ?? null;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible && !this.handle) {
      this.handle = createDimensionsOverlay(this.deps.scene);
    }
    if (this.handle) {
      this.handle.group.visible = visible;
    }
    if (!visible) {
      this.update();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  toggle(): boolean {
    const next = !this.visible;
    this.setVisible(next);
    return next;
  }

  update(): void {
    if (!this.visible || !this.handle) return;
    const dimensions = computeUnifiedBoxDimensions(this.deps.collectBoxBounds());
    const viewport = this.deps.getViewportSize();
    updateDimensionsOverlay(
      this.handle,
      dimensions,
      this.deps.camera,
      viewport.height,
      viewport.width,
      (world) => this.deps.projectWorldToScreen(world)
    );
  }

  getData(): DimensionOverlayDataEntry[] {
    if (!this.handle) return [];
    return getDimensionsOverlayData(this.handle);
  }

  getPrintReadyDimensions(): PrintReadyDimensions {
    if (!this.handle) {
      return { entries: [], generatedAt: Date.now() };
    }
    return getPrintReadyDimensions(this.handle);
  }

  dispose(): void {
    if (!this.handle) return;
    disposeDimensionsOverlay(this.handle, this.deps.scene);
    this.handle = null;
  }
}
