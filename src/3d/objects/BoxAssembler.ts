import * as THREE from "three";
import type { PanelMaterialOptions } from "./BoxMaterialApplier";
import type { BoxModel, BoxOptions, BoxPanelLayoutSpecs } from "./BoxBuilder";
import type { DoorSpec } from "./DoorFactory";
import type { DrawerSpec } from "./DrawerFactory";
import type { DoorLayerItem, DrawerLayerItem } from "../../models/BoxLayers";
import type { TechnicalDrillHole } from "../../core/types";
import { isPiBaseCabinetId } from "../../data/moveisUnificados/pi/models";
import type { PanelType } from "./PanelFactory";
import {
  computeWardrobeLocalLayout,
  getWardrobeGroupFromBaseCabinetId,
  hasWardrobeLowerDrawers,
} from "../../core/wardrobe/wardrobeRules";

type BoxAssemblerDeps = {
  resolveDimensions: (_options?: BoxOptions) => { width: number; height: number; depth: number };
  getPanelSpecs: (_width: number, _height: number, _depth: number) => BoxPanelLayoutSpecs;
  getShelfSpecs: (
    _width: number,
    _height: number,
    _depth: number,
    _shelves?: number,
    _opts?: BoxOptions
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

export function buildBoxWithDeps(options: BoxOptions | undefined, deps: BoxAssemblerDeps): BoxModel {
  const opts = options ?? {};
  const { width, height, depth } = deps.resolveDimensions(opts);
  const useDefaultMDF = opts.material == null;
  const baseMaterial: THREE.Material = opts.material ?? deps.getFallbackPBRMaterial();

  const root = new THREE.Group();
  root.name = "box-model";
  const specs = deps.getPanelSpecs(width, height, depth);
  const panelTypes = ["left", "top", "bottom", "right", "back"] as const;
  const getMaterial = (_panelType: PanelType) => baseMaterial;
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

  // Rodar apenas no eixo Y para espelhar esquerda/direita sem inverter o eixo vertical (Y).
  panels.right.rotation.y = 0;
  panels.right.rotation.z = 0;
  (panelTypes as readonly string[]).forEach((key) => {
    const k = key as keyof typeof panels;
    const p = panels[k];
    const pos = specs[k].pos;
    p.position.set(pos[0], pos[1], pos[2]);
    if (k === "right") {
      p.rotation.y = 0;
      p.rotation.z = 0;
    }
    root.add(p);
  });

  const drillMap = opts.drillMarkersByPanel ?? { cima: [], fundo: [], lateral_esquerda: [], lateral_direita: [], porta: [] };
  const shelfCount = Math.max(0, Math.floor(opts.shelves ?? 0));
  // Roupeiro (e gavetas em zona inferior): as prateleiras continuam a existir na zona superior; permitir furos de prateleira mesmo quando há gavetas.
  const useLateralShelfHoles = shelfCount > 0;
  const hasLateralDrillMarkers =
    (drillMap.lateral_esquerda?.length ?? 0) > 0 || (drillMap.lateral_direita?.length ?? 0) > 0;
  const forcePiLateralDrillGeometry = isPiBaseCabinetId(opts.baseCabinetId);
  const applyLateralDrillHoles =
    forcePiLateralDrillGeometry || hasLateralDrillMarkers || useLateralShelfHoles;
  const lateralLeftHoles = applyLateralDrillHoles
    ? drillMap.lateral_esquerda
    : [];
  const lateralRightHoles = applyLateralDrillHoles
    ? drillMap.lateral_direita
    : [];
  deps.applyDrillHolesToPanelGeometry(panels.top, "top", drillMap.cima);
  deps.applyDrillHolesToPanelGeometry(panels.bottom, "bottom", drillMap.fundo);
  deps.applyDrillHolesToPanelGeometry(panels.left, "left", lateralLeftHoles);
  deps.applyDrillHolesToPanelGeometry(panels.right, "right", lateralRightHoles);

  if (shelfCount > 0) {
    deps.getShelfSpecs(width, height, depth, shelfCount, opts).forEach((spec, i) => {
      const shelfMat = baseMaterial;
      const mesh = deps.panelFactory.createPanel(spec.size[0], spec.size[1], spec.size[2], `shelf-${i}`, "top", { singleMaterial: shelfMat });
      mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      mesh.userData.shelfIndex = i;
      root.add(mesh);
    });
  }

  // Roupeiro (H/J): divisores internos e varões de cabides (geometry visual).
  const wardrobeGroup = getWardrobeGroupFromBaseCabinetId(opts.baseCabinetId);
  if (wardrobeGroup && wardrobeGroup !== "T") {
    const feetHeightMm = Math.max(40, opts.feetHeight ?? (opts.pe_cm ?? 10) * 10);
    const widthMm = width * 1000;
    const heightMm = height * 1000;
    const depthMm = depth * 1000;
    const layout = computeWardrobeLocalLayout({
      baseCabinetId: opts.baseCabinetId,
      widthMm,
      heightMm,
      depthMm,
      feetHeightMm,
    });

    // Divisor horizontal: separa “zona inferior” (gavetas/varão) e “zona superior” (prateleira).
    if (layout.horizontalDividerCenterY_mm != null) {
      const dividerMat = baseMaterial;
      const dividerH = new THREE.Mesh(
        new THREE.BoxGeometry(width, deps.thicknessM, depth),
        dividerMat
      );
      dividerH.name = "wardrobe-divider-horizontal";
      dividerH.position.set(0, layout.horizontalDividerCenterY_mm / 1000, 0);
      root.add(dividerH);
    }

    // Divisor vertical: obrigatório quando largura >= 800mm.
    if (layout.verticalDividerEnabled) {
      const dividerMat = baseMaterial;
      const dividerV = new THREE.Mesh(
        new THREE.BoxGeometry(deps.thicknessM, height, depth),
        dividerMat
      );
      dividerV.name = "wardrobe-divider-vertical";
      dividerV.position.set((layout.verticalDividerCenterX_mm ?? 0) / 1000, 0, 0);
      root.add(dividerV);
    }

    // Varão de cabides (posição e lado dependem de cfg7/cfg8).
    const hasDrawersLower = hasWardrobeLowerDrawers(opts.baseCabinetId);
    const railThicknessM = 6 / 1000; // paridade com regras
    const railRadiusM = Math.max(0.001, railThicknessM / 2);
    const railZ = layout.shelfAndRailCenterZ_mm / 1000;
    const railY = layout.lowerCabideCenterY_mm != null ? layout.lowerCabideCenterY_mm / 1000 : -height / 4;

    const createRail = (name: string, x: number, lengthM: number) => {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(railRadiusM, railRadiusM, Math.max(0.001, lengthM), 12), baseMaterial);
      cyl.name = name;
      cyl.position.set(x, railY, railZ);
      // CylinderGeometry gera eixo em Y; rodar para alinhar ao eixo X (varão atravessando a largura).
      cyl.rotation.z = Math.PI / 2;
      root.add(cyl);
    };

    if (layout.verticalDividerEnabled) {
      const leftX = layout.leftCompartmentCenterX_mm / 1000;
      const rightX = layout.rightCompartmentCenterX_mm / 1000;
      const leftLen = layout.railWidthPerSide_mm / 1000;
      const rightLen = layout.railWidthPerSide_mm / 1000;
      if (hasDrawersLower) {
        createRail("wardrobe-rail-left", leftX, leftLen);
      } else {
        createRail("wardrobe-rail-left", leftX, leftLen);
        createRail("wardrobe-rail-right", rightX, rightLen);
      }
    } else {
      // Sem divisor vertical: um único varão
      createRail("wardrobe-rail-center", 0, layout.railWidthFull_mm / 1000);
    }
  }

  const doorLayerItems = Array.isArray(opts.doorLayerItems) ? opts.doorLayerItems : [];
  const drawerLayerItems = Array.isArray(opts.drawerLayerItems) ? opts.drawerLayerItems : [];
  const doorSpecs = deps.buildDoorSpecs(doorLayerItems);
  const drawerSpecs = deps.buildDrawerSpecs(drawerLayerItems);
  doorSpecs.forEach((spec, doorIndex) => {
    const item = doorLayerItems[doorIndex];
    const materialId = item?.material ?? item?.materialId ?? deps.getDefaultOfficialMaterialId();
    const doorMaterial = deps.getMaterialForOfficialId(materialId);
    root.add(deps.createDoorObject(spec, doorMaterial as THREE.Material, drillMap.portaPerDoor?.[doorIndex] ?? drillMap.porta));
  });
  drawerSpecs.forEach((spec, drawerIndex) => {
    const drawerMaterial = drawerLayerItems[drawerIndex]?.material
      ? deps.getMaterialForOfficialId(drawerLayerItems[drawerIndex].material!)
      : baseMaterial;
    root.add(deps.createDrawerObject(spec, drawerMaterial as THREE.Material));
  });

  root.position.set(0, 0, 0);
  return { root, panels, dimensions: { width, height, depth, thickness: deps.thicknessM } };
}

export function buildBoxGroupWithDeps(options: BoxOptions | undefined, deps: BoxAssemblerDeps): THREE.Group {
  return buildBoxWithDeps(options ?? {}, deps).root;
}
