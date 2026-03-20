import * as THREE from "three";
import { getDefaultOfficialMaterial } from "../../core/materials/materials.api";
import { SYSTEM_THICKNESS_MM, SYSTEM_BACK_MM } from "../../core/baseCabinets";
import type { DoorLayerItem, DrawerLayerItem } from "../../models/BoxLayers";
import type { BoxPanelIds, TechnicalDrillHole, ViewerDrillMarkersByPanel } from "../../core/types";
import { devLogger } from "../../utils/devLogger";
import {
  getEdgeMaterial,
  getFallbackPBRMaterial,
  getMaterialForOfficialId,
  resolvePanelMaterialOptions,
  type PanelMaterialOptions,
} from "./BoxMaterialApplier";
import { PanelFactory, type PanelType } from "./PanelFactory";
import { applyDrillHolesToPanelGeometry } from "./DrillGeometryBuilder";
import {
  buildDoorSpecs as buildDoorSpecsFromFactory,
  createDoorObject as createDoorObjectFromFactory,
  getDoorSpecFingerprint as getDoorSpecFingerprintFromFactory,
  getDoorSpecFromGroup as getDoorSpecFromGroupFromFactory,
  mapDoorHolesByHingeSide as mapDoorHolesByHingeSideFromFactory,
} from "./DoorFactory";
import {
  buildDrawerSpecs as buildDrawerSpecsFromFactory,
  createDrawerObject as createDrawerObjectFromFactory,
  getDrawerSpecFingerprint as getDrawerSpecFingerprintFromFactory,
} from "./DrawerFactory";

/**
 * Camada oficial de fabricação: gera TODAS as peças segundo as regras industriais.
 * Aplica-se a modelos base, caixas manuais, calculadora, duplicadas, templates e personalizadas.
 * Dimensões em cena em metros (1 unidade = 1 m).
 * - Costa (fundo): 10 mm, sempre ATRÁS da caixa; profundidade da caixa NUNCA é reduzida pela costa.
 * - Cima/fundo: largura total × profundidade total × 19 mm.
 * - Laterais: DENTRO; altura = altura - 38 mm, profundidade = total, espessura 19 mm.
 * - Prateleiras: DENTRO; largura = largura - 2 mm, profundidade = profundidade - 10 mm, 19 mm.
 * 
 * GAVETAS:
 * - Cálculos delegados ao domínio: src/core/drawers/
 * - BoxBuilder apenas renderiza LayerItems já calculados
 * - Lógica de dimensões, folgas e movimento está no domínio
 * 
 * updateBoxGroup: apenas atualiza geometria/posição por nome; não recria IDs.
 */
export type BoxOptions = {
  size?: number;
  width?: number;
  height?: number;
  depth?: number;
  index?: number;
  position?: { x: number; y: number; z: number };
  materialName?: string;
  material?: THREE.Material;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Ignorado na construção: espessura/costa vêm das constantes do sistema (19 mm / 10 mm). */
  thickness?: number;
  /** Número de prateleiras internas (geradas dentro da caixa). */
  shelves?: number;
  doorLayerItems?: DoorLayerItem[];
  drawerLayerItems?: DrawerLayerItem[];
  drillMarkersByPanel?: ViewerDrillMarkersByPanel;
  panelIds?: BoxPanelIds;
  /** Se true, não cria geometria paramétrica; o grupo serve apenas para o(s) modelo(s) GLB (caixa = GLB). */
  cadOnly?: boolean;
  /** Rotação em radianos (manipulação visual 3D). */
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  /** Direção da costa (parte traseira) em radianos: 0 | π/2 | π | -π/2. Auto-rotate alinha costa à parede. */
  costaRotationY?: number;
  /** Se true, o viewer não reposiciona esta caixa no reflow. */
  manualPosition?: boolean;
  /** Tipo de armário para altura automática: inferior (base) ou superior (parede). */
  cabinetType?: "lower" | "upper" | null;
  /** Altura do pé (PE) em cm para caixas inferiores; base da caixa fica a PE cm do piso (default 10). */
  pe_cm?: number;
  /** Altura dos pés em mm (controle do utilizador). */
  feetHeight?: number;
  /** Recuo frontal dos pés em mm (controle do utilizador). */
  feetOffsetFront?: number;
  /** Ativa/desativa os pés de 10 cm para caixas inferiores. */
  feetEnabled?: boolean;
  /** Se false, o viewer não altera rotation.y (modo manual; botão RODAR). Default true. */
  autoRotateEnabled?: boolean;
  /** Se true, a peça não pode ser movida nem transformada (apenas selecionável). */
  locked?: boolean;
};

export type BoxModel = {
  root: THREE.Group;
  panels: {
    left: THREE.Mesh;
    right: THREE.Mesh;
    top: THREE.Mesh;
    bottom: THREE.Mesh;
    back: THREE.Mesh;
  };
  dimensions: {
    width: number;
    height: number;
    depth: number;
    thickness: number;
  };
};

/** Espessura dos painéis em metros (19 mm). */
const THICKNESS_M = SYSTEM_THICKNESS_MM / 1000;
/** Espessura da costa em metros (10 mm). */
const BACK_THICKNESS_M = SYSTEM_BACK_MM / 1000;
/** Folga lateral para prateleiras (1 mm cada lado = 2 mm total). */
const SHELF_WIDTH_CLEARANCE_M = 0.002;
/** Profundidade interna antes da costa (costa 10 mm atrás). */
const SHELF_DEPTH_CLEARANCE_M = SYSTEM_BACK_MM / 1000;
/** Offset visual (1 mm) para dentro: evita Z-fighting entre prateleiras e paredes internas; não altera medidas/cutlist/CNC. */
const SHELF_VISUAL_INSET_M = 0.001;
const resolveDimensions = (options: BoxOptions = {}) => {
  const size = options.size ?? 1;
  const width = options.width ?? size;
  const height = options.height ?? size;
  const depth = options.depth ?? size;
  return {
    width: Math.max(0.001, width),
    height: Math.max(0.001, height),
    depth: Math.max(0.001, depth),
  };
};

/**
 * Especificação dos painéis segundo regras de marcenaria.
 * - Cima/fundo: largura total × profundidade total × 19 mm.
 * - Laterais: DENTRO; altura = altura - 38 mm, profundidade = total, 19 mm. Posição x dentro das faces.
 * - Costa: ATRÁS da caixa; largura total × altura total × 10 mm; z = -depth/2 - 5 mm.
 * Tamanhos em Three.js: [x_size, y_size, z_size] = [largura, altura, profundidade] para cada painel.
 */
function getPanelSpecs(width: number, height: number, depth: number) {
  const sideHeight = height - 2 * THICKNESS_M;
  return {
    top: {
      size: [width, THICKNESS_M, depth] as const,
      pos: [0, height / 2 - THICKNESS_M / 2, 0] as const,
    },
    bottom: {
      size: [width, THICKNESS_M, depth] as const,
      pos: [0, -height / 2 + THICKNESS_M / 2, 0] as const,
    },
    left: {
      size: [THICKNESS_M, sideHeight, depth] as const,
      pos: [-width / 2 + THICKNESS_M / 2, 0, 0] as const,
    },
    right: {
      size: [THICKNESS_M, sideHeight, depth] as const,
      pos: [width / 2 - THICKNESS_M / 2, 0, 0] as const,
    },
    back: {
      size: [width, height, BACK_THICKNESS_M] as const,
      pos: [0, 0, -depth / 2 - BACK_THICKNESS_M / 2] as const,
    },
  };
}

/**
 * Prateleiras: DENTRO da caixa. largura = width - 2 mm, profundidade = depth - 10 mm, espessura 19 mm.
 * Posição z: centrada na profundidade útil + SHELF_VISUAL_INSET_M para evitar Z-fighting com a costa.
 */
function getShelfSpecs(width: number, height: number, depth: number, count: number) {
  const shelfWidth = Math.max(0.001, width - SHELF_WIDTH_CLEARANCE_M);
  const shelfDepth = Math.max(0.001, depth - SHELF_DEPTH_CLEARANCE_M);
  const interiorHeight = Math.max(0.001, height - 2 * THICKNESS_M);
  const centerZ = -depth / 2 + shelfDepth / 2 + SHELF_VISUAL_INSET_M;
  const specs: { size: [number, number, number]; pos: [number, number, number] }[] = [];
  if (count < 1) return specs;
  const spacing = interiorHeight / (count + 1);
  const yMin = -height / 2 + THICKNESS_M + spacing;
  for (let i = 0; i < count; i++) {
    const y = yMin + i * spacing;
    specs.push({
      size: [shelfWidth, THICKNESS_M, shelfDepth],
      pos: [0, y, centerZ],
    });
  }
  return specs;
}

const panelFactory = new PanelFactory({ resolvePanelMaterialOptions });

/**
 * Especificação de porta para o Viewer 3D (derivada de DoorLayerItem).
 * Única fonte de verdade para dados é DoorLayerItem; DoorSpec é a projeção em metros para render.
 * buildDoorSpecs() converte DoorLayerItem[] → DoorSpec[].
 */
export type DoorSpec = {
  id: string;
  type: "door";
  groupType?: "simples" | "dupla";
  widthM: number;
  heightM: number;
  thicknessM: number;
  x: number;
  y: number;
  z: number;
  rotY: number;
  openDirection: DoorLayerItem["openDirection"];
  hingeSide: DoorLayerItem["hingeSide"];
  pivot: DoorLayerItem["pivot"];
  isOpen: boolean;
};

type DrawerSpec = {
  id: string;
  type: "drawer";
  // Dimensões da frente (cobre toda a abertura)
  widthM: number;
  heightM: number;
  depthM: number;
  frontThicknessM: number;
  // Dimensões do corpo
  bodyWidthM?: number;
  bodyHeightM?: number;
  bodyDepthM?: number;
  // Dimensões das peças
  leftSideWidthM?: number;
  leftSideHeightM?: number;
  leftSideDepthM?: number;
  rightSideWidthM?: number;
  rightSideHeightM?: number;
  rightSideDepthM?: number;
  backWidthM?: number;
  backHeightM?: number;
  backThicknessM?: number;
  bottomWidthM?: number;
  bottomDepthM?: number;
  bottomThicknessM?: number;
  sideThicknessM?: number;
  // Posicoes locais das pecas
  frontPosX?: number;
  frontPosY?: number;
  frontPosZ?: number;
  leftSidePosX?: number;
  leftSidePosY?: number;
  leftSidePosZ?: number;
  rightSidePosX?: number;
  rightSidePosY?: number;
  rightSidePosZ?: number;
  bottomPosX?: number;
  bottomPosY?: number;
  bottomPosZ?: number;
  backPosX?: number;
  backPosY?: number;
  backPosZ?: number;
  // Posição e estado
  x: number;
  y: number;
  z: number;
  rotY: number;
  isOpen: boolean;
  pullDistanceM: number;
};

/** Converte o modelo de porta (DoorLayerItem) para especificação de render (DoorSpec). Ordem preservada. */
function buildDoorSpecs(items: DoorLayerItem[]): DoorSpec[] {
  return buildDoorSpecsFromFactory(items);
}

/** Fingerprint do spec da porta para detectar alterações e recriar apenas a porta alterada. */
const DOOR_SPEC_FINGERPRINT_KEY = "doorSpecFingerprint";

function getDoorSpecFingerprint(spec: DoorSpec, materialName?: string): string {
  return getDoorSpecFingerprintFromFactory(spec, materialName);
}

/** Fingerprint do spec da gaveta para detectar alterações (ex.: isOpen); quando muda, recriamos só essa gaveta. */
const DRAWER_SPEC_FINGERPRINT_KEY = "drawerSpecFingerprint";

function getDrawerSpecFingerprint(spec: DrawerSpec, materialName?: string): string {
  return getDrawerSpecFingerprintFromFactory(spec, materialName);
}

/**
 * Converte DrawerLayerItem[] para DrawerSpec[] (formato Three.js)
 * 
 * NOTA: Não faz cálculos! Apenas converte mm -> metros.
 * Todos os cálculos de dimensões estão em src/core/drawers/
 */
function buildDrawerSpecs(items: DrawerLayerItem[]): DrawerSpec[] {
  return buildDrawerSpecsFromFactory(items);
}

function mapDoorHolesByHingeSide(
  holes: TechnicalDrillHole[] | undefined,
  doorWidthM: number,
  hingeSide: "left" | "right"
): TechnicalDrillHole[] {
  return mapDoorHolesByHingeSideFromFactory(holes, doorWidthM, hingeSide);
}

/**
 * Cria o objeto 3D da porta (grupo pivot + mesh do painel + furos).
 * Todos os nós recebem userData.doorLayerId para seleção, context menu e outline.
 * O ViewerCore deve chamar applyPanelIdsToBox no boxGroup após adicionar a porta, para definir userData.boxId.
 */
export function createDoorObject(spec: DoorSpec, material: THREE.Material, doorHoles?: TechnicalDrillHole[]): THREE.Object3D {
  return createDoorObjectFromFactory(spec, material, doorHoles);
}

/**
 * Extrai um DoorSpec a partir de um grupo de porta existente (door-layer-*).
 * Usado pelo ViewerCore para reconstruir a porta com novo material (novo uuid) e evitar cache de rotação.
 */
export function getDoorSpecFromGroup(group: THREE.Group): DoorSpec | null {
  return getDoorSpecFromGroupFromFactory(group);
}

/**
 * Renderiza uma gaveta no Three.js
 * 
 * NOTA: Não faz cálculos de dimensões! Apenas renderiza.
 * - Cálculos de folgas, gaps e dimensões: src/core/drawers/DrawerParametrics
 * - Lógica de movimento: src/core/drawers/DrawerMotionService
 * - Geração: src/core/drawers/DrawerGenerationService
 * 
 * Esta função apenas:
 * 1. Cria geometrias Three.js
 * 2. Posiciona peças
 * 3. Anima com requestAnimationFrame
 */
function createDrawerObject(spec: DrawerSpec, material: THREE.Material): THREE.Object3D {
  return createDrawerObjectFromFactory(spec, material);
}

export const buildBox = (options: BoxOptions = {}): BoxModel => {
  const opts = options ?? {};
  const { width, height, depth } = resolveDimensions(opts);
  const useDefaultMDF = opts.material == null;
  const baseMaterial: THREE.Material = opts.material ?? getFallbackPBRMaterial();

  const root = new THREE.Group();
  root.name = "box-model";

  const specs = getPanelSpecs(width, height, depth);
  const panelTypes = ["left", "top", "bottom", "right", "back"] as const;

  const getMaterial = (_panelType: PanelType) => baseMaterial.clone();

  const panelOptions = (panelType: PanelType): PanelMaterialOptions =>
    useDefaultMDF
      ? { edgeMaterial: getEdgeMaterial(), faceMaterial: getMaterial(panelType) }
      : { singleMaterial: getMaterial(panelType) };

  const panels = {
    left: panelFactory.createPanel(specs.left.size[0], specs.left.size[1], specs.left.size[2], "left", "left", panelOptions("left")),
    right: panelFactory.createPanel(specs.right.size[0], specs.right.size[1], specs.right.size[2], "right", "right", panelOptions("right")),
    top: panelFactory.createPanel(specs.top.size[0], specs.top.size[1], specs.top.size[2], "top", "top", panelOptions("top")),
    bottom: panelFactory.createPanel(specs.bottom.size[0], specs.bottom.size[1], specs.bottom.size[2], "bottom", "bottom", panelOptions("bottom")),
    back: panelFactory.createPanel(specs.back.size[0], specs.back.size[1], specs.back.size[2], "back", "back", panelOptions("back")),
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
  const drillMap: ViewerDrillMarkersByPanel = opts.drillMarkersByPanel ?? {
    cima: [],
    fundo: [],
    lateral_esquerda: [],
    lateral_direita: [],
    porta: [],
  };
  const shelfCount = Math.max(0, Math.floor(opts.shelves ?? 0));
  const hasDrawers = (opts.drawerLayerItems?.length ?? 0) > 0;
  const useLateralShelfHoles = shelfCount > 0 && !hasDrawers;
  const lateralLeftHoles = useLateralShelfHoles ? drillMap.lateral_esquerda : [];
  const lateralRightHoles = useLateralShelfHoles ? drillMap.lateral_direita : [];

  applyDrillHolesToPanelGeometry(panels.top, "top", drillMap.cima);
  applyDrillHolesToPanelGeometry(panels.bottom, "bottom", drillMap.fundo);
  applyDrillHolesToPanelGeometry(panels.left, "left", lateralLeftHoles);
  applyDrillHolesToPanelGeometry(panels.right, "right", lateralRightHoles);

  if (shelfCount > 0) {
    const shelfSpecs = getShelfSpecs(width, height, depth, shelfCount);
    shelfSpecs.forEach((spec, i) => {
      const shelfMat = baseMaterial.clone();
      const mesh = panelFactory.createPanel(spec.size[0], spec.size[1], spec.size[2], `shelf-${i}`, "top", { singleMaterial: shelfMat });
      mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      mesh.userData.shelfIndex = i;
      root.add(mesh);
    });
  }

  const doorLayerItems = Array.isArray(opts.doorLayerItems) ? opts.doorLayerItems : [];
  const drawerLayerItems = Array.isArray(opts.drawerLayerItems) ? opts.drawerLayerItems : [];
  const doorSpecs = buildDoorSpecs(doorLayerItems);
  const drawerSpecs = buildDrawerSpecs(drawerLayerItems);
  doorSpecs.forEach((spec, doorIndex) => {
    const item = doorLayerItems[doorIndex];
    const materialId = item?.material ?? item?.materialId ?? getDefaultOfficialMaterial().canonicalId;
    const doorMaterial = getMaterialForOfficialId(materialId);
    root.add(createDoorObject(spec, (doorMaterial as THREE.Material).clone(), drillMap.portaPerDoor?.[doorIndex] ?? drillMap.porta));
  });
  drawerSpecs.forEach((spec, drawerIndex) => {
    const drawerMaterial = drawerLayerItems[drawerIndex]?.material
      ? getMaterialForOfficialId(drawerLayerItems[drawerIndex].material!)
      : baseMaterial;
    root.add(createDrawerObject(spec, (drawerMaterial as THREE.Material).clone()));
  });

  root.position.set(0, 0, 0);

  return {
    root,
    panels,
    dimensions: { width, height, depth, thickness: THICKNESS_M },
  };
};

export const updateBoxModel = (model: BoxModel, options: BoxOptions = {}): BoxModel => {
  const opts = options ?? {};
  const { width, height, depth } = resolveDimensions(opts);
  const material = opts.material ?? model.panels.left.material;
  const specs = getPanelSpecs(width, height, depth);
  const panelKeys: (keyof typeof model.panels)[] = ["left", "right", "top", "bottom", "back"];

  panelKeys.forEach((key) => {
    const [wx, hy, dz] = specs[key].size;
    const [px, py, pz] = specs[key].pos;
    panelFactory.updatePanelGeometry(model.panels[key], wx, hy, dz);
    model.panels[key].position.set(px, py, pz);
    if (key === "right") {
      model.panels[key].rotation.y = Math.PI;
      model.panels[key].rotation.z = Math.PI;
    } else {
      model.panels[key].rotation.y = 0;
      model.panels[key].rotation.z = 0;
    }
  });

  if (opts.material != null) {
    Object.values(model.panels).forEach(panel => {
      panel.material = material;
    });
  }

  model.dimensions = { width, height, depth, thickness: THICKNESS_M };
  return model;
};
/** Compatível com o Viewer: devolve o grupo raiz do módulo (CIMA, FUNDO, LAT ESQ, LAT DIR, COSTA). */
export const buildBoxGroup = (options?: BoxOptions | null) => {
  const opts = options ?? {};
  const model = buildBox(opts);
  return model.root;
};

// Alias de compatibilidade interna para chamadas antigas em outros módulos.
export const buildBoxLegacy = buildBoxGroup;

const PANEL_NAMES = ["left", "right", "top", "bottom", "back"] as const;

/** Dimensões aplicadas na última chamada a updateBoxGroup (para evitar rebuild completo quando só portas/gavetas mudam). */
const LAST_DIMS_KEY = "lastUpdateBoxGroupDimensions";

function dimensionsEqual(
  a: { width: number; height: number; depth: number },
  b: { width: number; height: number; depth: number }
): boolean {
  return (
    Math.abs(a.width - b.width) < 1e-9 &&
    Math.abs(a.height - b.height) < 1e-9 &&
    Math.abs(a.depth - b.depth) < 1e-9
  );
}

/**
 * Atualiza um grupo criado por buildBoxGroup: geometria e posição de cada painel por nome.
 * Atualização incremental: só altera painéis estruturais quando as dimensões mudam; para portas,
 * gavetas e prateleiras remove apenas os que deixaram de ser necessários e adiciona apenas os novos,
 * evitando loops com useCalculadoraSync e storms de efeitos passivos.
 */
export function updateBoxGroup(group: THREE.Group, options?: BoxOptions | null): { width: number; height: number; depth: number } {
  const opts = options ?? {};
  const { width, height, depth } = resolveDimensions(opts);
  const dims = { width, height, depth };
  const lastDims = (group.userData as Record<string, unknown>)[LAST_DIMS_KEY] as { width: number; height: number; depth: number } | undefined;
  const dimensionsUnchanged = lastDims != null && dimensionsEqual(lastDims, dims);
  (group.userData as Record<string, unknown>)[LAST_DIMS_KEY] = dims;

  const specs = getPanelSpecs(width, height, depth);
  const baseMaterial = group.children[0] instanceof THREE.Mesh ? (group.children[0] as THREE.Mesh).material : getFallbackPBRMaterial();
  const mat = Array.isArray(baseMaterial) ? baseMaterial[0] : baseMaterial;
  const drillMap: ViewerDrillMarkersByPanel = opts.drillMarkersByPanel ?? {
    cima: [],
    fundo: [],
    lateral_esquerda: [],
    lateral_direita: [],
    porta: [],
  };
  const shelfCountForDrill = Math.max(0, Math.floor(opts.shelves ?? 0));
  const hasDrawersForDrill = (opts.drawerLayerItems?.length ?? 0) > 0;
  const useLateralShelfHoles = shelfCountForDrill > 0 && !hasDrawersForDrill;
  const lateralLeftHoles = useLateralShelfHoles ? drillMap.lateral_esquerda : [];
  const lateralRightHoles = useLateralShelfHoles ? drillMap.lateral_direita : [];

  // 1) Painéis estruturais: só atualizar geometria/posição quando as dimensões mudaram
  if (!dimensionsUnchanged) {
    for (const panelName of PANEL_NAMES) {
      const child = group.children.find((c) => c.name === panelName);
      if (!(child instanceof THREE.Mesh) || !child.geometry) continue;
      const spec = specs[panelName];
      if (!spec) continue;
      panelFactory.updatePanelGeometry(child, spec.size[0], spec.size[1], spec.size[2]);
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
      panelFactory.updatePanelGeometry(leftPanel, leftSpec.size[0], leftSpec.size[1], leftSpec.size[2]);
      leftPanel.position.set(leftSpec.pos[0], leftSpec.pos[1], leftSpec.pos[2]);
      leftPanel.rotation.y = 0;
      leftPanel.rotation.z = 0;
      delete (leftPanel.userData as Record<string, unknown>).explodedBasePosition;
      leftPanel.updateMatrix();
    }
    if (rightPanel) {
      const rightSpec = specs.right;
      panelFactory.updatePanelGeometry(rightPanel, rightSpec.size[0], rightSpec.size[1], rightSpec.size[2]);
      rightPanel.position.set(rightSpec.pos[0], rightSpec.pos[1], rightSpec.pos[2]);
      rightPanel.rotation.y = Math.PI;
      rightPanel.rotation.z = Math.PI;
      delete (rightPanel.userData as Record<string, unknown>).explodedBasePosition;
      rightPanel.updateMatrix();
    }
  }

  if (topPanel) applyDrillHolesToPanelGeometry(topPanel, "top", drillMap.cima);
  if (bottomPanel) applyDrillHolesToPanelGeometry(bottomPanel, "bottom", drillMap.fundo);
  if (leftPanel) applyDrillHolesToPanelGeometry(leftPanel, "left", lateralLeftHoles);
  if (rightPanel) applyDrillHolesToPanelGeometry(rightPanel, "right", lateralRightHoles);

  // 2) Incremental: portas — remover as que já não são necessárias; se spec mudou (fingerprint), recriar só essa porta
  const doorFpKey = DOOR_SPEC_FINGERPRINT_KEY;
  const doorLayerItems = Array.isArray(opts.doorLayerItems) ? opts.doorLayerItems : [];
  if (import.meta.env.DEV && doorLayerItems.length > 0) {
    devLogger.debug("[DOOR-MAT] BoxBuilder.updateBoxGroup doorLayerItems recebidos", {
      count: doorLayerItems.length,
      items: doorLayerItems.map((d, i) => ({ index: i, id: d.id, material: d.material, materialId: d.materialId })),
    });
  }
  const doorSpecs = buildDoorSpecs(doorLayerItems);
  const requiredDoorIds = new Set(doorSpecs.map((s) => s.id));
  const existingDoorNames = group.children
    .filter((c) => c.name.startsWith("door-layer-"))
    .map((c) => c.name);
  for (const name of existingDoorNames) {
    const id = name.replace("door-layer-", "");
    if (!requiredDoorIds.has(id)) {
      const obj = group.children.find((c) => c.name === name);
      if (obj) group.remove(obj);
    }
  }
  doorSpecs.forEach((spec, doorIndex) => {
    const item = doorLayerItems[doorIndex];
    const materialName = item?.material ?? item?.materialId ?? getDefaultOfficialMaterial().canonicalId;
    if (import.meta.env.DEV) {
      devLogger.debug("[DOOR-MAT] BoxBuilder.updateBoxGroup porta", {
        doorIndex,
        specId: spec.id,
        materialNameUsado: materialName,
        itemMaterial: item?.material,
        itemMaterialId: item?.materialId,
      });
    }
    const newFingerprint = getDoorSpecFingerprint(spec, materialName);
    const existingDoor = group.children.find((c) => c.name === `door-layer-${spec.id}`) as THREE.Object3D & { userData: Record<string, unknown> } | undefined;
    if (existingDoor) {
      const storedFingerprint = existingDoor.userData[doorFpKey] as string | undefined;
      if (storedFingerprint === newFingerprint) return;
      group.remove(existingDoor);
    }
    const doorMaterial = getMaterialForOfficialId(materialName);
    const newDoor = createDoorObject(spec, (doorMaterial as THREE.Material).clone(), drillMap.portaPerDoor?.[doorIndex] ?? drillMap.porta);
    (newDoor.userData as Record<string, unknown>)[doorFpKey] = newFingerprint;
    group.add(newDoor);
  });

  // 3) Incremental: gavetas — remover as que já não são necessárias; se spec mudou (fingerprint), recriar só essa gaveta
  const drawerFpKey = DRAWER_SPEC_FINGERPRINT_KEY;
  const drawerLayerItems = Array.isArray(opts.drawerLayerItems) ? opts.drawerLayerItems : [];
  const drawerSpecs = buildDrawerSpecs(drawerLayerItems);
  const requiredDrawerIds = new Set(drawerSpecs.map((s) => s.id));
  const existingDrawerNames = group.children
    .filter((c) => c.name.startsWith("drawer-layer-"))
    .map((c) => c.name);
  for (const name of existingDrawerNames) {
    const id = name.replace("drawer-layer-", "");
    if (!requiredDrawerIds.has(id)) {
      const obj = group.children.find((c) => c.name === name);
      if (obj) group.remove(obj);
    }
  }
  drawerSpecs.forEach((spec, drawerIndex) => {
    const materialName = drawerLayerItems[drawerIndex]?.material ?? getDefaultOfficialMaterial().canonicalId;
    const newFingerprint = getDrawerSpecFingerprint(spec, materialName);
    const existingDrawer = group.children.find((c) => c.name === `drawer-layer-${spec.id}`) as THREE.Object3D & { userData: Record<string, unknown> } | undefined;
    if (existingDrawer) {
      const storedFingerprint = existingDrawer.userData[drawerFpKey] as string | undefined;
      if (storedFingerprint === newFingerprint) return;
      group.remove(existingDrawer);
    }
    const drawerMaterial = getMaterialForOfficialId(materialName);
    const newDrawer = createDrawerObject(spec, (drawerMaterial as THREE.Material).clone());
    (newDrawer.userData as Record<string, unknown>)[drawerFpKey] = newFingerprint;
    group.add(newDrawer);
  });

  // 4) Prateleiras: sempre recalcular e recriar para evitar herança de posição antiga em runtime
  const shelfCount = Math.max(0, Math.floor(opts.shelves ?? 0));
  const shelfSpecs = getShelfSpecs(width, height, depth, shelfCount);
  const existingShelves = group.children.filter((c) => /^shelf-\d+$/.test(c.name));
  existingShelves.forEach((obj) => group.remove(obj));
  shelfSpecs.forEach((spec, i) => {
    const shelfMat = (mat as THREE.Material).clone();
    const mesh = panelFactory.createPanel(spec.size[0], spec.size[1], spec.size[2], `shelf-${i}`, "top", { singleMaterial: shelfMat });
    mesh.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    mesh.userData.shelfIndex = i;
    group.add(mesh);
  });

  group.updateMatrixWorld(true);
  return { width, height, depth };
}

/** Atualiza um único Mesh (caixa sólida); compatibilidade com caixas não modulares. */
export const updateBoxGeometry = (mesh: THREE.Mesh, options: BoxOptions = {}) => {
  const { width, height, depth } = resolveDimensions(options);
  mesh.geometry.dispose();
  const geometry = new THREE.BoxGeometry(width, height, depth);
  if (!geometry.attributes.uv2 && geometry.attributes.uv) {
    geometry.setAttribute("uv2", geometry.attributes.uv);
  }
  mesh.geometry = geometry;
  return { width, height, depth };
};
