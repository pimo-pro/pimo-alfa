import * as THREE from "three";
import { setBox3FromObjectExcludingLayoutProxy } from "../box/boxAabbUtils";
import type { TransformControlsLike } from "./TransformGizmoPivot";

export type GroupGizmoMember = {
  encodedId: string;
  mesh: THREE.Object3D;
};

type MemberState = {
  encodedId: string;
  mesh: THREE.Object3D;
  startMatrix: THREE.Matrix4;
};

const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _delta = new THREE.Matrix4();
const _startPivot = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

/**
 * Gizmo de grupo: pivô central no AABB unificado; aplica delta a todos os membros.
 * Não altera hierarquia dos meshes após o drag.
 */
export class GroupGizmo {
  private readonly pivot = new THREE.Object3D();
  private members: MemberState[] = [];
  private pivotStartMatrix = new THREE.Matrix4();
  private active = false;

  constructor(scene: THREE.Scene) {
    this.pivot.name = "group-gizmo-pivot";
    scene.add(this.pivot);
  }

  isActive(): boolean {
    return this.active;
  }

  getPivot(): THREE.Object3D {
    return this.pivot;
  }

  getMembers(): GroupGizmoMember[] {
    return this.members.map((m) => ({ encodedId: m.encodedId, mesh: m.mesh }));
  }

  begin(controls: TransformControlsLike, members: GroupGizmoMember[]): boolean {
    this.end(controls);
    if (!members.length) return false;

    _box.makeEmpty();
    for (const member of members) {
      member.mesh.updateMatrixWorld(true);
      setBox3FromObjectExcludingLayoutProxy(_box, member.mesh);
    }
    if (_box.isEmpty()) return false;

    _box.getCenter(_center);
    this.pivot.position.copy(_center);
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.scale.set(1, 1, 1);
    this.pivot.updateMatrixWorld(true);

    this.members = members.map((m) => {
      m.mesh.updateMatrixWorld(true);
      return {
        encodedId: m.encodedId,
        mesh: m.mesh,
        startMatrix: m.mesh.matrixWorld.clone(),
      };
    });

    this.pivotStartMatrix.copy(this.pivot.matrixWorld);
    controls.attach(this.pivot);
    this.active = true;
    return true;
  }

  /** Propaga transformação do pivô para todos os membros. */
  applyPivotTransform(): void {
    if (!this.active || !this.members.length) return;
    _delta.copy(this.pivot.matrixWorld).multiply(_startPivot.copy(this.pivotStartMatrix).invert());

    for (const member of this.members) {
      const nextWorld = _delta.clone().multiply(member.startMatrix);
      const parent = member.mesh.parent;
      if (parent) {
        parent.updateMatrixWorld(true);
        const invParent = new THREE.Matrix4().copy(parent.matrixWorld).invert();
        member.mesh.matrix.copy(invParent).multiply(nextWorld);
      } else {
        member.mesh.matrix.copy(nextWorld);
      }
      member.mesh.matrix.decompose(_pos, _quat, _scale);
      member.mesh.position.copy(_pos);
      member.mesh.quaternion.copy(_quat);
      member.mesh.scale.copy(_scale);
      member.mesh.updateMatrixWorld(true);
    }
  }

  end(controls: TransformControlsLike): GroupGizmoMember[] {
    const result = this.getMembers();
    controls.detach();
    this.members = [];
    this.active = false;
    this.pivot.position.set(0, 0, 0);
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.scale.set(1, 1, 1);
    return result;
  }

  dispose(): void {
    this.pivot.removeFromParent();
  }
}
