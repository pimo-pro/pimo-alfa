import * as THREE from "three";

type AnyBoxOptions = any;
type AnyBoxModel = any;

type BoxUpdaterDeps = {
  resolveDimensions: (options?: AnyBoxOptions) => { width: number; height: number; depth: number };
  getPanelSpecs: (width: number, height: number, depth: number) => any;
  getShelfSpecs: (width: number, height: number, depth: number, shelves?: number) => Array<{ size: [number, number, number]; pos: [number, number, number] }>;
  panelFactory: { createPanel: (...args: any[]) => THREE.Mesh; updatePanelGeometry: (mesh: THREE.Mesh, w: number, h: number, d: number) => void };
  getFallbackPBRMaterial: () => THREE.Material;
  applyDrillHolesToPanelGeometry: (panel: THREE.Mesh, panelType: any, holes: any[] | undefined) => void;
  buildDoorSpecs: (items: any[]) => any[];
  buildDrawerSpecs: (items: any[]) => any[];
  getDoorSpecFingerprint: (spec: any, materialName?: string) => string;
  getDrawerSpecFingerprint: (spec: any, materialName?: string) => string;
  createDoorObject: (spec: any, material: THREE.Material, doorHoles?: any[]) => THREE.Object3D;
  createDrawerObject: (spec: any, material: THREE.Material) => THREE.Object3D;
  getMaterialForOfficialId: (idOrLabel: string) => THREE.Material;
  getDefaultOfficialMaterialId: () => string;
  thicknessM: number;
  panelNames: readonly string[];
  lastDimsKey: string;
  doorSpecFingerprintKey: string;
  drawerSpecFingerprintKey: string;
};

export function dimensionsEqual(a: { width: number; height: number; depth: number }, b: { width: number; height: number; depth: number }): boolean {
  return Math.abs(a.width - b.width) < 1e-9 && Math.abs(a.height - b.height) < 1e-9 && Math.abs(a.depth - b.depth) < 1e-9;
}

export function updateBoxModelWithDeps(model: AnyBoxModel, options: AnyBoxOptions, deps: BoxUpdaterDeps): AnyBoxModel {
  const opts = options ?? {};
  const { width, height, depth } = deps.resolveDimensions(opts);
  const material = opts.material ?? model.panels.left.material;
  const specs = deps.getPanelSpecs(width, height, depth);
  const panelKeys: (keyof typeof model.panels)[] = ["left", "right", "top", "bottom", "back"];
  panelKeys.forEach((key) => {
    const [wx, hy, dz] = specs[key].size;
    const [px, py, pz] = specs[key].pos;
    deps.panelFactory.updatePanelGeometry(model.panels[key], wx, hy, dz);
    model.panels[key].position.set(px, py, pz);
    if (key === "right") {
      model.panels[key].rotation.y = Math.PI;
      model.panels[key].rotation.z = Math.PI;
    } else {
      model.panels[key].rotation.y = 0;
      model.panels[key].rotation.z = 0;
    }
  });
  if (opts.material != null) Object.values(model.panels).forEach((panel: any) => (panel.material = material));
  model.dimensions = { width, height, depth, thickness: deps.thicknessM };
  return model;
}

export function updateBoxGroupWithDeps(group: THREE.Group, options: AnyBoxOptions, deps: BoxUpdaterDeps): { width: number; height: number; depth: number } {
  const opts = options ?? {};
  const { width, height, depth } = deps.resolveDimensions(opts);
  const dims = { width, height, depth };
  const lastDims = (group.userData as Record<string, unknown>)[deps.lastDimsKey] as { width: number; height: number; depth: number } | undefined;
  const dimensionsUnchanged = lastDims != null && dimensionsEqual(lastDims, dims);
  (group.userData as Record<string, unknown>)[deps.lastDimsKey] = dims;

  const specs = deps.getPanelSpecs(width, height, depth);
  const baseMaterial = group.children[0] instanceof THREE.Mesh ? (group.children[0] as THREE.Mesh).material : deps.getFallbackPBRMaterial();
  const mat = Array.isArray(baseMaterial) ? baseMaterial[0] : baseMaterial;
  const drillMap = opts.drillMarkersByPanel ?? { cima: [], fundo: [], lateral_esquerda: [], lateral_direita: [], porta: [] };
  const shelfCountForDrill = Math.max(0, Math.floor(opts.shelves ?? 0));
  const hasDrawersForDrill = (opts.drawerLayerItems?.length ?? 0) > 0;
  const useLateralShelfHoles = shelfCountForDrill > 0 && !hasDrawersForDrill;
  const lateralLeftHoles = useLateralShelfHoles ? drillMap.lateral_esquerda : [];
  const lateralRightHoles = useLateralShelfHoles ? drillMap.lateral_direita : [];

  if (!dimensionsUnchanged) {
    for (const panelName of deps.panelNames) {
      const child = group.children.find((c) => c.name === panelName);
      if (!(child instanceof THREE.Mesh) || !child.geometry) continue;
      const spec = specs[panelName];
      if (!spec) continue;
      deps.panelFactory.updatePanelGeometry(child, spec.size[0], spec.size[1], spec.size[2]);
      child.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      if (panelName === "right") {
        child.rotation.y = Math.PI;
        child.rotation.z = Math.PI;
      } else {
        child.rotation.y = 0;
        child.rotation.z = 0;
      }
      delete (child.userData as Record<string, unknown>).explodedBasePosition;
      child.updateMatrix();
    }
  }

  const topPanel = group.children.find((c) => c instanceof THREE.Mesh && c.name === "top") as THREE.Mesh | undefined;
  const bottomPanel = group.children.find((c) => c instanceof THREE.Mesh && c.name === "bottom") as THREE.Mesh | undefined;
  const leftPanel = group.children.find((c) => c instanceof THREE.Mesh && c.name === "left") as THREE.Mesh | undefined;
  const rightPanel = group.children.find((c) => c instanceof THREE.Mesh && c.name === "right") as THREE.Mesh | undefined;
  if (!useLateralShelfHoles) {
    if (leftPanel) {
      const leftSpec = specs.left;
      deps.panelFactory.updatePanelGeometry(leftPanel, leftSpec.size[0], leftSpec.size[1], leftSpec.size[2]);
      leftPanel.position.set(leftSpec.pos[0], leftSpec.pos[1], leftSpec.pos[2]);
      leftPanel.rotation.y = 0;
      leftPanel.rotation.z = 0;
    }
    if (rightPanel) {
      const rightSpec = specs.right;
      deps.panelFactory.updatePanelGeometry(rightPanel, rightSpec.size[0], rightSpec.size[1], rightSpec.size[2]);
      rightPanel.position.set(rightSpec.pos[0], rightSpec.pos[1], rightSpec.pos[2]);
      rightPanel.rotation.y = Math.PI;
      rightPanel.rotation.z = Math.PI;
    }
  }
  if (topPanel) deps.applyDrillHolesToPanelGeometry(topPanel, "top", drillMap.cima);
  if (bottomPanel) deps.applyDrillHolesToPanelGeometry(bottomPanel, "bottom", drillMap.fundo);
  if (leftPanel) deps.applyDrillHolesToPanelGeometry(leftPanel, "left", lateralLeftHoles);
  if (rightPanel) deps.applyDrillHolesToPanelGeometry(rightPanel, "right", lateralRightHoles);

  const doorLayerItems = Array.isArray(opts.doorLayerItems) ? opts.doorLayerItems : [];
  const doorSpecs = deps.buildDoorSpecs(doorLayerItems);
  const requiredDoorIds = new Set(doorSpecs.map((s) => s.id));
  for (const c of group.children.filter((c) => c.name.startsWith("door-layer-"))) {
    const id = c.name.replace("door-layer-", "");
    if (!requiredDoorIds.has(id)) group.remove(c);
  }
  doorSpecs.forEach((spec, doorIndex) => {
    const item = doorLayerItems[doorIndex];
    const materialName = item?.material ?? item?.materialId ?? deps.getDefaultOfficialMaterialId();
    const newFingerprint = deps.getDoorSpecFingerprint(spec, materialName);
    const existingDoor = group.children.find((c) => c.name === `door-layer-${spec.id}`) as any;
    if (existingDoor?.userData?.[deps.doorSpecFingerprintKey] === newFingerprint) return;
    if (existingDoor) group.remove(existingDoor);
    const doorMaterial = deps.getMaterialForOfficialId(materialName);
    const newDoor = deps.createDoorObject(spec, (doorMaterial as THREE.Material).clone(), drillMap.portaPerDoor?.[doorIndex] ?? drillMap.porta);
    (newDoor.userData as any)[deps.doorSpecFingerprintKey] = newFingerprint;
    group.add(newDoor);
  });

  const drawerLayerItems = Array.isArray(opts.drawerLayerItems) ? opts.drawerLayerItems : [];
  const drawerSpecs = deps.buildDrawerSpecs(drawerLayerItems);
  const requiredDrawerIds = new Set(drawerSpecs.map((s) => s.id));
  for (const c of group.children.filter((c) => c.name.startsWith("drawer-layer-"))) {
    const id = c.name.replace("drawer-layer-", "");
    if (!requiredDrawerIds.has(id)) group.remove(c);
  }
  drawerSpecs.forEach((spec, drawerIndex) => {
    const materialName = drawerLayerItems[drawerIndex]?.material ?? deps.getDefaultOfficialMaterialId();
    const newFingerprint = deps.getDrawerSpecFingerprint(spec, materialName);
    const existingDrawer = group.children.find((c) => c.name === `drawer-layer-${spec.id}`) as any;
    if (existingDrawer?.userData?.[deps.drawerSpecFingerprintKey] === newFingerprint) return;
    if (existingDrawer) group.remove(existingDrawer);
    const drawerMaterial = deps.getMaterialForOfficialId(materialName);
    const newDrawer = deps.createDrawerObject(spec, (drawerMaterial as THREE.Material).clone());
    (newDrawer.userData as any)[deps.drawerSpecFingerprintKey] = newFingerprint;
    group.add(newDrawer);
  });

  const shelfCount = Math.max(0, Math.floor(opts.shelves ?? 0));
  const shelfSpecs = deps.getShelfSpecs(width, height, depth, shelfCount);
  group.children.filter((c) => /^shelf-\d+$/.test(c.name)).forEach((obj) => group.remove(obj));
  shelfSpecs.forEach((spec, i) => {
    const shelfMat = (mat as THREE.Material).clone();
    const mesh = deps.panelFactory.createPanel(spec.size[0], spec.size[1], spec.size[2], `shelf-${i}`, "top", { singleMaterial: shelfMat });
    mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    mesh.userData.shelfIndex = i;
    group.add(mesh);
  });
  group.updateMatrixWorld(true);
  return { width, height, depth };
}

export function updateBoxGeometryWithDeps(mesh: THREE.Mesh, options: AnyBoxOptions, deps: BoxUpdaterDeps): { width: number; height: number; depth: number } {
  const { width, height, depth } = deps.resolveDimensions(options);
  mesh.geometry.dispose();
  const geometry = new THREE.BoxGeometry(width, height, depth);
  if (!geometry.attributes.uv2 && geometry.attributes.uv) geometry.setAttribute("uv2", geometry.attributes.uv);
  mesh.geometry = geometry;
  return { width, height, depth };
}
