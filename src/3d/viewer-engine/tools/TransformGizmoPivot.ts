import * as THREE from "three";

type PivotState = {
  mesh: THREE.Object3D | null;
  originalParent: THREE.Object3D | null;
};

export type TransformControlsLike = {
  attach(_object: THREE.Object3D): void;
  detach(): void;
};

/**
 * Pivô temporário para o TransformControls aparecer no ponto do clique
 * (em vez do centro/origem do objeto), sem alterar a hierarquia após o drag.
 */
export class TransformGizmoPivot {
  private readonly pivot = new THREE.Object3D();
  private readonly state: PivotState = { mesh: null, originalParent: null };

  constructor(scene: THREE.Scene) {
    this.pivot.name = "transform-gizmo-pivot";
    scene.add(this.pivot);
  }

  isActive(): boolean {
    return this.state.mesh != null;
  }

  attach(
    controls: TransformControlsLike,
    mesh: THREE.Object3D,
    anchorWorld: THREE.Vector3 | null
  ): void {
    this.detach(controls);

    if (!anchorWorld) {
      controls.attach(mesh);
      return;
    }

    this.state.originalParent = mesh.parent;
    this.pivot.position.copy(anchorWorld);
    this.pivot.userData.lastHitPoint = anchorWorld.clone();
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.scale.set(1, 1, 1);
    this.pivot.updateMatrixWorld(true);
    this.pivot.attach(mesh);
    controls.attach(this.pivot);
    this.state.mesh = mesh;
  }

  detach(controls: TransformControlsLike): void {
    controls.detach();
    if (this.state.mesh && this.state.originalParent) {
      this.state.originalParent.attach(this.state.mesh);
    }
    this.state.mesh = null;
    this.state.originalParent = null;
  }

  dispose(): void {
    this.pivot.removeFromParent();
  }
}
