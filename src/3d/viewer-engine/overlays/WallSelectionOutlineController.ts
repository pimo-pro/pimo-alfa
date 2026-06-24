import * as THREE from "three";

export type WallSelectionOutlineTarget = {
  mesh: THREE.Mesh;
} | null;

export class WallSelectionOutlineController {
  private readonly scene: THREE.Scene;
  private readonly material: THREE.LineBasicMaterial;
  private readonly helper: THREE.BoxHelper;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.material = new THREE.LineBasicMaterial({
      color: new THREE.Color("#3b82f6"),
      linewidth: 1,
      opacity: 0.9,
      transparent: true,
      depthTest: true,
    });
    this.helper = new THREE.BoxHelper(new THREE.Object3D(), 0x3b82f6);
    (this.helper.material as THREE.Material).dispose();
    this.helper.material = this.material;
    this.helper.visible = false;
    this.scene.add(this.helper);
  }

  getHelper(): THREE.BoxHelper {
    return this.helper;
  }

  update(target: WallSelectionOutlineTarget): void {
    if (target) {
      this.helper.visible = true;
      this.helper.update(target.mesh);
      return;
    }
    this.helper.visible = false;
  }

  dispose(): void {
    this.scene.remove(this.helper);
    this.helper.geometry.dispose();
    this.material.dispose();
  }
}
