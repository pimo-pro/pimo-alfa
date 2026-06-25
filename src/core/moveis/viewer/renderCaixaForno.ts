import * as THREE from "three";
import type { BoxOptions } from "../../../3d/objects/BoxBuilder";
import type { BoxModel } from "../../../3d/objects/BoxBuilder";
import type { PanelType } from "../../../3d/objects/PanelFactory";
import type { ViewerDrillMarkersByPanel } from "../../types";
import { SYSTEM_BACK_MM, SYSTEM_THICKNESS_MM } from "../../baseCabinets";
import {
  resolveCostaMaterialForBox,
  resolveSeparadorMaterialForBox,
} from "../../materials/materials.api";
import {
  buildCaixaFornoDoorsLayer,
  computeCaixaFornoLayout,
  isCaixaFornoBox,
} from "../generators/caixaFornoGenerator";
import { getDivSepMeshSpecs } from "../../divSep/visualSpecs";

const BACK_THICKNESS_M = SYSTEM_BACK_MM / 1000;

export type RenderCaixaFornoDeps = {
  panelFactory: {
    createPanel: (
      width: number,
      height: number,
      depth: number,
      name: string,
      panelType: "left" | "right" | "top" | "bottom" | "back",
      options?: { singleMaterial?: THREE.Material; edgeMaterial?: THREE.Material; faceMaterial?: THREE.Material } | null
    ) => THREE.Mesh;
  };
  buildDoorSpecs: (items: import("../../../models/BoxLayers").DoorLayerItem[]) => import("../../../3d/objects/DoorFactory").DoorSpec[];
  createDoorObject: (
    spec: import("../../../3d/objects/DoorFactory").DoorSpec,
    material: THREE.Material,
    doorHoles?: import("../../types").TechnicalDrillHole[]
  ) => THREE.Object3D;
  getMaterialForOfficialId: (idOrLabel: string) => THREE.Material;
  getDefaultOfficialMaterialId: () => string;
  baseMaterial: THREE.Material;
  resolveDimensions: (options?: BoxOptions) => { width: number; height: number; depth: number };
  applyDrillHolesToPanelGeometry?: (
    panel: THREE.Mesh,
    panelType: PanelType,
    holes: import("../../types").TechnicalDrillHole[] | undefined
  ) => void;
};

export function renderCaixaForno(options: BoxOptions | undefined, deps: RenderCaixaFornoDeps): BoxModel {
  const opts = options ?? {};
  const { width, height, depth } = deps.resolveDimensions(opts);
  const thicknessM = Math.max(0.001, opts.thickness ?? SYSTEM_THICKNESS_MM / 1000);
  const backThicknessM = BACK_THICKNESS_M;
  const baseMaterial = deps.baseMaterial;
  const boxEspessuraMm = thicknessM * 1000;
  const bodyMaterialId =
    opts.bodyMaterialId?.trim() || deps.getDefaultOfficialMaterialId();
  const costaMaterial = resolveCostaMaterialForBox(
    { costaMaterialId: opts.costaMaterialId },
    bodyMaterialId
  );
  const separadorMaterial = resolveSeparadorMaterialForBox(
    { separadorMaterialId: opts.separadorMaterialId },
    bodyMaterialId
  );
  const costaPanelMaterial = deps.getMaterialForOfficialId(costaMaterial.materialId);
  const separadorPanelMaterial = deps.getMaterialForOfficialId(separadorMaterial.materialId);

  const boxLike = {
    id: "caixa-forno-preview",
    dimensoes: {
      largura: width * 1000,
      altura: height * 1000,
      profundidade: (opts.layoutDepthM ?? depth) * 1000,
    },
    espessura: boxEspessuraMm,
    profundidadeExterna: (opts.layoutDepthM ?? depth) * 1000,
    portaTipo: "porta_simples" as const,
    doorsLayer: opts.doorLayerItems ?? [],
    costaAtiva: true,
    baseCabinetId: opts.baseCabinetId,
    catalogItemId: opts.baseCabinetId,
  };

  if (!isCaixaFornoBox(boxLike)) {
    throw new Error("renderCaixaForno: box não é caixa_forno");
  }

  const layout = computeCaixaFornoLayout(boxLike);
  const doorsLayer = buildCaixaFornoDoorsLayer(boxLike, opts.doorLayerItems);
  const root = new THREE.Group();
  root.name = "box-model-caixa-forno";

  const panelOpts = { singleMaterial: baseMaterial };
  const sideHeight = height;
  const sideDepth = depth;

  const left = deps.panelFactory.createPanel(
    thicknessM,
    sideHeight,
    sideDepth,
    "left",
    "left",
    panelOpts
  );
  left.position.set(-width / 2 + thicknessM / 2, 0, 0);

  const drillMap: ViewerDrillMarkersByPanel =
    opts.drillMarkersByPanel ?? {
      cima: [],
      fundo: [],
      lateral_esquerda: [],
      lateral_direita: [],
      porta: [],
    };
  if (deps.applyDrillHolesToPanelGeometry) {
    deps.applyDrillHolesToPanelGeometry(left, "left", drillMap.lateral_esquerda);
  }

  const right = deps.panelFactory.createPanel(
    thicknessM,
    sideHeight,
    sideDepth,
    "right",
    "right",
    panelOpts
  );
  right.position.set(width / 2 - thicknessM / 2, 0, 0);
  if (deps.applyDrillHolesToPanelGeometry) {
    deps.applyDrillHolesToPanelGeometry(right, "right", drillMap.lateral_direita);
  }

  const top = deps.panelFactory.createPanel(width, thicknessM, depth, "top", "top", panelOpts);
  top.position.set(0, height / 2 - thicknessM / 2, 0);

  const bottom = deps.panelFactory.createPanel(0.001, 0.001, 0.001, "bottom", "bottom", panelOpts);
  bottom.visible = false;

  const upperStartLocalM = layout.upperStartMm / 1000 - height / 2;
  const costaHeightM = Math.max(0.001, layout.costaSuperiorAlturaMm / 1000);
  const costaCenterY = upperStartLocalM + costaHeightM / 2;
  const backWidth = Math.max(0.001, width);

  const back = deps.panelFactory.createPanel(
    backWidth,
    costaHeightM,
    backThicknessM,
    "back-upper",
    "back",
    { singleMaterial: costaPanelMaterial as THREE.Material }
  );
  back.position.set(0, costaCenterY, -depth / 2 + backThicknessM / 2);
  back.name = "costa-superior";

  root.add(left, right, top, bottom, back);

  const divSepBoxLike = {
    dimensoes: boxLike.dimensoes,
    espessura: boxLike.espessura,
    profundidadeExterna: boxLike.profundidadeExterna,
    portaTipo: boxLike.portaTipo,
    doorsLayer: doorsLayer,
    costaAtiva: boxLike.costaAtiva,
    separadores: opts.separadores ?? [],
    divisores: opts.divisores ?? [],
  };
  getDivSepMeshSpecs(divSepBoxLike, width, height, depth, thicknessM).forEach((spec) => {
    if (!spec.name.includes("divsep-sep-")) return;
    const mesh = deps.panelFactory.createPanel(
      spec.size[0],
      spec.size[1],
      spec.size[2],
      spec.name,
      "top",
      { singleMaterial: separadorPanelMaterial as THREE.Material }
    );
    mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    mesh.userData.divSepId = spec.name;
    mesh.userData.divSepKind = "sep";
    root.add(mesh);
  });

  if ((opts.divisores ?? []).length > 0) {
    getDivSepMeshSpecs({ ...divSepBoxLike, separadores: [] }, width, height, depth, thicknessM).forEach((spec) => {
      const mesh = deps.panelFactory.createPanel(
        spec.size[0],
        spec.size[1],
        spec.size[2],
        spec.name,
        "top",
        panelOpts
      );
      mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      mesh.userData.divSepId = spec.name;
      mesh.userData.divSepKind = "div";
      root.add(mesh);
    });
  }

  const doorSpecs = deps.buildDoorSpecs(doorsLayer);
  doorSpecs.forEach((spec, doorIndex) => {
    const item = doorsLayer[doorIndex];
    const materialId = item?.material ?? item?.materialId ?? deps.getDefaultOfficialMaterialId();
    const doorMaterial = deps.getMaterialForOfficialId(materialId);
    const doorObj = deps.createDoorObject(
      spec,
      doorMaterial as THREE.Material,
      drillMap.portaPerDoor?.[doorIndex] ?? drillMap.porta
    );
    root.add(doorObj);
  });

  return {
    root,
    panels: { left, right, top, bottom, back },
    dimensions: {
      width,
      height,
      depth,
      thickness: thicknessM,
    },
  };
}
