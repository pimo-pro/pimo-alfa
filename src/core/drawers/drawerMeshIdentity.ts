import type * as THREE from "three";

export type DrawerMeshPart = "front" | "handle" | "click-target";

/** Partes da gaveta que respondem a clique (raycast). */
export function isDrawerClickTarget(node: THREE.Object3D): boolean {
  const ud = node.userData as Record<string, unknown> | undefined;
  if (!ud) return false;
  if (ud.drawerClickTarget === true) return true;
  const part = ud.drawerPart;
  return part === "front" || part === "handle" || part === "click-target";
}

export function resolveDrawerIdFromMesh(mesh: THREE.Object3D): string | null {
  if (!isDrawerClickTarget(mesh)) return null;
  const ud = mesh.userData as Record<string, unknown> | undefined;
  const drawerId = ud?.drawerId ?? ud?.drawerLayerId;
  return typeof drawerId === "string" && drawerId.length > 0 ? drawerId : null;
}

export function applyDrawerClickTargetIdentity(
  mesh: THREE.Object3D,
  drawerId: string,
  part: DrawerMeshPart
): void {
  mesh.userData.drawerId = drawerId;
  mesh.userData.drawerLayerId = drawerId;
  mesh.userData.drawerPart = part === "click-target" ? "click-target" : part;
  mesh.userData.drawerClickTarget = true;
}

export function applyDrawerBodyPartIdentity(mesh: THREE.Object3D, part: string): void {
  mesh.userData.drawerPart = part;
  mesh.userData.drawerBodyPart = true;
}
