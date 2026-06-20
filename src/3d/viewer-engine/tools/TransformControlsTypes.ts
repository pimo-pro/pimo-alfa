/** Contrato mínimo do TransformControls usado por GroupGizmo. */
export type TransformControlsLike = {
  attach(_object: THREE.Object3D): void;
  detach(): void;
};
