import * as THREE from "three";
import type { PanelMaterialOptions } from "./BoxMaterialApplier";
import type { BoxModel, BoxOptions, BoxPanelLayoutSpecs } from "./BoxBuilder";
import type { DoorSpec } from "./DoorFactory";
import type { DrawerSpec } from "./DrawerFactory";
import type { DoorLayerItem, DrawerLayerItem } from "../../models/BoxLayers";
import type { TechnicalDrillHole } from "../../core/types";
import { isPiBaseCabinetId } from "../../data/moveisUnificados/pi/models";
import type { PanelType } from "./PanelFactory";

type BoxAssemblerDeps = {
  resolveDimensions: (_options?: BoxOptions) => { width: number; height: number; depth: number };
  getPanelSpecs: (_width: number, _height: number, _depth: number) => BoxPanelLayoutSpecs;
  getShelfSpecs: (
    _width: number,
    _height: number,
    _depth: number,
    _shelves?: number
  ) => Array<{ size: [number, number, number]; pos: [number, number, number] }>;
  panelFactory: {
    createPanel: (
      _width: number,
      _height: number,
      _depth: number,
      _name: string,
      _panelType: PanelType,
      _options?: PanelMaterialOptions | null
    ) => THREE.Mesh;
  };
  getFallbackPBRMaterial: () => THREE.Material;
  getEdgeMaterial: () => THREE.Material;
  applyDrillHolesToPanelGeometry: (_panel: THREE.Mesh, _panelType: PanelType, _holes: TechnicalDrillHole[] | undefined) => void;
  buildDoorSpecs: (_items: DoorLayerItem[]) => DoorSpec[];
  buildDrawerSpecs: (_items: DrawerLayerItem[]) => DrawerSpec[];
  createDoorObject: (_spec: DoorSpec, _material: THREE.Material, _doorHoles?: TechnicalDrillHole[]) => THREE.Object3D;
  createDrawerObject: (_spec: DrawerSpec, _material: THREE.Material) => THREE.Object3D;
  getMaterialForOfficialId: (_idOrLabel: string) => THREE.Material;
  getDefaultOfficialMaterialId: () => string;
  thicknessM: number;
};

function mapLateralCavilhaHolesForViewer(
  holes: TechnicalDrillHole[] | undefined,
  thicknessM: number
): TechnicalDrillHole[] {
  if (!holes?.length) return [];
  const centerThicknessMm = (thicknessM * 1000) / 2;
  return holes.map((h) => {
    if (h.tipo !== "cavilha") return h;
    return {
      ...h,
      face: h.y === 0 ? "fundo" : "cima",
      x: h.x,
      y: centerThicknessMm,
    };
  });
}

export function buildBoxWithDeps(options: BoxOptions | undefined, deps: BoxAssemblerDeps): BoxModel {
  const opts = options ?? {};
  const { width, height, depth } = deps.resolveDimensions(opts);
  const useDefaultMDF = opts.material == null;
  const baseMaterial: THREE.Material = opts.material ?? deps.getFallbackPBRMaterial();

  const root = new THREE.Group();
  root.name = "box-model";
  const specs = deps.getPanelSpecs(width, height, depth);
  const panelTypes = ["left", "top", "bottom", "right", "back"] as const;
  const getMaterial = (_panelType: PanelType) => baseMaterial.clone();
  const panelOptions = (panelType: PanelType) =>
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
  const hasLateralDrillMarkers =
    (drillMap.lateral_esquerda?.length ?? 0) > 0 || (drillMap.lateral_direita?.length ?? 0) > 0;
  const forcePiLateralDrillGeometry = isPiBaseCabinetId(opts.baseCabinetId);
  const applyLateralDrillHoles =
    forcePiLateralDrillGeometry || hasLateralDrillMarkers || useLateralShelfHoles;
  const lateralLeftHoles = applyLateralDrillHoles
    ? mapLateralCavilhaHolesForViewer(drillMap.lateral_esquerda, deps.thicknessM)
    : [];
  const lateralRightHoles = applyLateralDrillHoles
    ? mapLateralCavilhaHolesForViewer(drillMap.lateral_direita, deps.thicknessM)
    : [];
  deps.applyDrillHolesToPanelGeometry(panels.top, "top", drillMap.cima);
  deps.applyDrillHolesToPanelGeometry(panels.bottom, "bottom", drillMap.fundo);
  deps.applyDrillHolesToPanelGeometry(panels.left, "left", lateralLeftHoles);
  deps.applyDrillHolesToPanelGeometry(panels.right, "right", lateralRightHoles);

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

export function buildBoxGroupWithDeps(options: BoxOptions | undefined, deps: BoxAssemblerDeps): THREE.Group {
  return buildBoxWithDeps(options ?? {}, deps).root;
}
