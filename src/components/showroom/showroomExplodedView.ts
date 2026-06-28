import * as THREE from "three";

type PanelType = "left" | "right" | "top" | "bottom" | "back";

function isExplodableMesh(node: THREE.Mesh): boolean {
  if (node.userData?.isPanelEdgeOverlay === true) return false;
  if (node.userData?.isDrillMarker === true) return false;
  if (node.userData?.panelType != null) return true;
  if (node.userData?.doorLayerId != null) return true;
  if (node.userData?.drawerPart != null) return true;
  return node.name.startsWith("shelf-") || node.name.startsWith("door-leaf-") || node.name.startsWith("drawer-");
}

function getExplodedDirection(node: THREE.Mesh): THREE.Vector3 {
  const panelType = node.userData?.panelType as PanelType | undefined;
  if (panelType === "left") return new THREE.Vector3(-1, 0, 0);
  if (panelType === "right") return new THREE.Vector3(1, 0, 0);
  if (panelType === "top") return new THREE.Vector3(0, 1, 0);
  if (panelType === "bottom") return new THREE.Vector3(0, -1, 0);
  if (panelType === "back") return new THREE.Vector3(0, 0, -1);
  const base = node.userData?.explodedBasePosition as THREE.Vector3 | undefined;
  if (base instanceof THREE.Vector3 && base.lengthSq() > 1e-8) {
    return base.clone().normalize();
  }
  const localPos = node.position.clone();
  if (localPos.lengthSq() > 1e-8) {
    return localPos.normalize();
  }
  return new THREE.Vector3(0, 0, -1);
}

export function applyShowroomExplodedView(root: THREE.Object3D, enabled: boolean, intensity: number): void {
  const offsetDistance = Math.max(0, Math.min(1, intensity)) * 0.2;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (!isExplodableMesh(node)) return;

    const storedBase = node.userData?.explodedBasePosition as THREE.Vector3 | undefined;
    const basePosition = storedBase instanceof THREE.Vector3 ? storedBase : node.position.clone();
    node.userData.explodedBasePosition = basePosition.clone();

    if (!enabled || offsetDistance <= 0) {
      node.position.copy(basePosition);
      return;
    }

    const direction = getExplodedDirection(node);
    node.position.copy(basePosition).addScaledVector(direction, offsetDistance);
  });
}

/** Separa caixas no eixo X (explode entre módulos). */
export function applyShowroomBoxSeparation(
  root: THREE.Object3D,
  enabled: boolean,
  intensity: number
): void {
  const boxes = root.children.filter((child) => child.name.startsWith("showroom-box-wrap-"));
  if (boxes.length <= 1) return;

  const gap = enabled ? Math.max(0, Math.min(1, intensity)) * 1.2 : 0;
  boxes.forEach((box, index) => {
    const stored = (box.userData.showroomBoxBasePosition as THREE.Vector3 | undefined) ?? box.position.clone();
    box.userData.showroomBoxBasePosition = stored.clone();
    const offsetX = enabled ? index * gap - ((boxes.length - 1) * gap) / 2 : 0;
    box.position.set(stored.x + offsetX, stored.y, stored.z);
  });
}
