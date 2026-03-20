import * as THREE from "three";

type AnyBoxOptions = any;
type AnyBoxModel = any;
type AnyPanelType = "left" | "right" | "top" | "bottom" | "back" | "front";

type BoxAssemblerDeps = {
  resolveDimensions: (options?: AnyBoxOptions) => { width: number; height: number; depth: number };
  getPanelSpecs: (width: number, height: number, depth: number) => any;
  getShelfSpecs: (width: number, height: number, depth: number, shelves?: number) => Array<{ size: [number, number, number]; pos: [number, number, number] }>;
  panelFactory: { createPanel: (...args: any[]) => THREE.Mesh };
  getFallbackPBRMaterial: () => THREE.Material;
  getEdgeMaterial: () => THREE.Material;
  applyDrillHolesToPanelGeometry: (panel: THREE.Mesh, panelType: AnyPanelType, holes: any[] | undefined) => void;
  buildDoorSpecs: (items: any[]) => any[];
  buildDrawerSpecs: (items: any[]) => any[];
  createDoorObject: (spec: any, material: THREE.Material, doorHoles?: any[]) => THREE.Object3D;
  createDrawerObject: (spec: any, material: THREE.Material) => THREE.Object3D;
  getMaterialForOfficialId: (idOrLabel: string) => THREE.Material;
  getDefaultOfficialMaterialId: () => string;
  thicknessM: number;
};

export function buildBoxWithDeps(options: AnyBoxOptions, deps: BoxAssemblerDeps): AnyBoxModel {
  const opts = options ?? {};
  const { width, height, depth } = deps.resolveDimensions(opts);
  const useDefaultMDF = opts.material == null;
  const baseMaterial: THREE.Material = opts.material ?? deps.getFallbackPBRMaterial();

  const root = new THREE.Group();
  root.name = "box-model";
  const specs = deps.getPanelSpecs(width, height, depth);
  const panelTypes = ["left", "top", "bottom", "right", "back"] as const;
  const getMaterial = (_panelType: AnyPanelType) => baseMaterial.clone();
  const panelOptions = (panelType: AnyPanelType) =>
    useDefaultMDF
      ? { edgeMaterial: deps.getEdgeMaterial(), faceMaterial: getMaterial(panelType) }
      : { singleMaterial: getMaterial(panelType) };

  const panels = {
    left: deps.panelFactory.createPanel(specs.left.size[0], specs.left.size[1], specs.left.size[2], "left", "left", panelOptions("left")),
    right: deps.panelFactory.createPanel(specs.right.size[0], specs.right.size[1], specs.right.size[2], "right", "right", panelOptions("right")),
    top: deps.panelFactory.createPanel(specs.top.size[0], specs.top.size[1], specs.top.size[2], "top", "top", panelOptions("top")),
    bottom: deps.panelFactory.createPanel(specs.bottom.size[0], specs.bottom.size[1], specs.bottom.size[2], "bottom", "bottom", panelOptions("bottom")),
    back: deps.panelFactory.createPanel(specs.back.size[0], specs.back.size[1], specs.back.size[2], "back", "back", panelOptions("back")),
  };

  panels.right.rotation.y = Math.PI;
  panels.right.rotation.z = Math.PI;
  (panelTypes as readonly string[]).forEach((key) => {
    const k = key as keyof typeof panels;
    const p = panels[k];
    const pos = specs[k].pos;
    p.position.set(pos[0], pos[1], pos[2]);
    if (k === "right") {
      p.rotation.y = Math.PI;
      p.rotation.z = Math.PI;
    }
    root.add(p);
  });

  const drillMap = opts.drillMarkersByPanel ?? { cima: [], fundo: [], lateral_esquerda: [], lateral_direita: [], porta: [] };
  const shelfCount = Math.max(0, Math.floor(opts.shelves ?? 0));
  const hasDrawers = (opts.drawerLayerItems?.length ?? 0) > 0;
  const useLateralShelfHoles = shelfCount > 0 && !hasDrawers;
  deps.applyDrillHolesToPanelGeometry(panels.top, "top", drillMap.cima);
  deps.applyDrillHolesToPanelGeometry(panels.bottom, "bottom", drillMap.fundo);
  deps.applyDrillHolesToPanelGeometry(panels.left, "left", useLateralShelfHoles ? drillMap.lateral_esquerda : []);
  deps.applyDrillHolesToPanelGeometry(panels.right, "right", useLateralShelfHoles ? drillMap.lateral_direita : []);

  if (shelfCount > 0) {
    deps.getShelfSpecs(width, height, depth, shelfCount).forEach((spec, i) => {
      const shelfMat = baseMaterial.clone();
      const mesh = deps.panelFactory.createPanel(spec.size[0], spec.size[1], spec.size[2], `shelf-${i}`, "top", { singleMaterial: shelfMat });
      mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      mesh.userData.shelfIndex = i;
      root.add(mesh);
    });
  }

  const doorLayerItems = Array.isArray(opts.doorLayerItems) ? opts.doorLayerItems : [];
  const drawerLayerItems = Array.isArray(opts.drawerLayerItems) ? opts.drawerLayerItems : [];
  const doorSpecs = deps.buildDoorSpecs(doorLayerItems);
  const drawerSpecs = deps.buildDrawerSpecs(drawerLayerItems);
  doorSpecs.forEach((spec, doorIndex) => {
    const item = doorLayerItems[doorIndex];
    const materialId = item?.material ?? item?.materialId ?? deps.getDefaultOfficialMaterialId();
    const doorMaterial = deps.getMaterialForOfficialId(materialId);
    root.add(deps.createDoorObject(spec, (doorMaterial as THREE.Material).clone(), drillMap.portaPerDoor?.[doorIndex] ?? drillMap.porta));
  });
  drawerSpecs.forEach((spec, drawerIndex) => {
    const drawerMaterial = drawerLayerItems[drawerIndex]?.material
      ? deps.getMaterialForOfficialId(drawerLayerItems[drawerIndex].material!)
      : baseMaterial;
    root.add(deps.createDrawerObject(spec, (drawerMaterial as THREE.Material).clone()));
  });

  root.position.set(0, 0, 0);
  return { root, panels, dimensions: { width, height, depth, thickness: deps.thicknessM } };
}

export function buildBoxGroupWithDeps(options: AnyBoxOptions, deps: BoxAssemblerDeps): THREE.Group {
  return buildBoxWithDeps(options ?? {}, deps).root;
}
