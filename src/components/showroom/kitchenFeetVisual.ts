import * as THREE from "three";

/** Pés de cozinha — extraído do ViewerCore para uso no showroom PROJETOS. */
export function createKitchenFeetGroup(
  width: number,
  height: number,
  depth: number,
  feetHeightM: number,
  feetOffsetFrontM: number
): THREE.Group {
  const group = new THREE.Group();
  group.name = "kitchen-feet-group";
  group.userData.isKitchenFeet = true;

  const headHeight = 0.012;
  const baseHeight = 0.008;
  const bodyHeight = Math.max(0.02, feetHeightM - headHeight - baseHeight);
  const headSize = 0.036;
  const bodyRadius = 0.012;
  const baseRadius = 0.03;

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.32,
    metalness: 0.82,
  });
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.85,
    metalness: 0.1,
  });

  const headGeometry = new THREE.BoxGeometry(headSize, headHeight, headSize);
  const bodyGeometry = new THREE.CylinderGeometry(bodyRadius, bodyRadius, bodyHeight, 18);
  const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 22);

  const createFoot = () => {
    const foot = new THREE.Group();
    const topY = -height / 2;
    const head = new THREE.Mesh(headGeometry, metalMat);
    head.position.y = topY - headHeight / 2;
    const body = new THREE.Mesh(bodyGeometry, metalMat);
    body.position.y = topY - headHeight - bodyHeight / 2;
    const base = new THREE.Mesh(baseGeometry, baseMat);
    base.position.y = topY - headHeight - bodyHeight - baseHeight / 2;
    foot.add(head, body, base);
    return foot;
  };

  const insetX = Math.max(0.04, width * 0.08);
  const insetZBack = Math.max(0.04, depth * 0.08);
  const insetZFront = Math.max(insetZBack, feetOffsetFrontM);

  const positions: Array<[number, number]> = [
    [-width / 2 + insetX, -depth / 2 + insetZBack],
    [width / 2 - insetX, -depth / 2 + insetZBack],
    [-width / 2 + insetX, depth / 2 - insetZFront],
    [width / 2 - insetX, depth / 2 - insetZFront],
  ];

  for (const [x, z] of positions) {
    const foot = createFoot();
    foot.position.set(x, 0, z);
    group.add(foot);
  }

  return group;
}

export function attachKitchenFeetIfNeeded(
  boxRoot: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  feetEnabled: boolean,
  feetHeightM: number,
  feetOffsetFrontM: number
): void {
  const existing = boxRoot.getObjectByName("kitchen-feet-group");
  if (existing) boxRoot.remove(existing);
  if (!feetEnabled || feetHeightM <= 0) return;
  boxRoot.add(createKitchenFeetGroup(width, height, depth, feetHeightM, feetOffsetFrontM));
}
