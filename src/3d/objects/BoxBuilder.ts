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
import { buildBoxGroupWithDeps, buildBoxWithDeps } from "./BoxAssembler";
import {
  dimensionsEqual as dimensionsEqualFromUpdater,
  updateBoxGeometryWithDeps,
  updateBoxGroupWithDeps,
  updateBoxModelWithDeps,
} from "./BoxUpdater";

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

function getAssemblerDeps() {
  return {
    resolveDimensions,
    getPanelSpecs,
    getShelfSpecs,
    panelFactory,
    getFallbackPBRMaterial,
    getEdgeMaterial,
    applyDrillHolesToPanelGeometry,
    buildDoorSpecs,
    buildDrawerSpecs,
    createDoorObject,
    createDrawerObject,
    getMaterialForOfficialId,
    getDefaultOfficialMaterialId: () => getDefaultOfficialMaterial().canonicalId,
    thicknessM: THICKNESS_M,
  };
}

export const buildBox = (options: BoxOptions = {}): BoxModel => {
  return buildBoxWithDeps(options, getAssemblerDeps());
};

export const updateBoxModel = (model: BoxModel, options: BoxOptions = {}): BoxModel => {
  return updateBoxModelWithDeps(model, options, getUpdaterDeps());
};
/** Compatível com o Viewer: devolve o grupo raiz do módulo (CIMA, FUNDO, LAT ESQ, LAT DIR, COSTA). */
export const buildBoxGroup = (options?: BoxOptions | null) => {
  return buildBoxGroupWithDeps(options, getAssemblerDeps());
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
  return dimensionsEqualFromUpdater(a, b);
}

function getUpdaterDeps() {
  return {
    resolveDimensions,
    getPanelSpecs,
    getShelfSpecs,
    panelFactory,
    getFallbackPBRMaterial,
    applyDrillHolesToPanelGeometry,
    buildDoorSpecs,
    buildDrawerSpecs,
    getDoorSpecFingerprint,
    getDrawerSpecFingerprint,
    createDoorObject,
    createDrawerObject,
    getMaterialForOfficialId,
    getDefaultOfficialMaterialId: () => getDefaultOfficialMaterial().canonicalId,
    thicknessM: THICKNESS_M,
    panelNames: PANEL_NAMES,
    lastDimsKey: LAST_DIMS_KEY,
    doorSpecFingerprintKey: DOOR_SPEC_FINGERPRINT_KEY,
    drawerSpecFingerprintKey: DRAWER_SPEC_FINGERPRINT_KEY,
  };
}

/**
 * Atualiza um grupo criado por buildBoxGroup: geometria e posição de cada painel por nome.
 * Atualização incremental: só altera painéis estruturais quando as dimensões mudam; para portas,
 * gavetas e prateleiras remove apenas os que deixaram de ser necessários e adiciona apenas os novos,
 * evitando loops com useCalculadoraSync e storms de efeitos passivos.
 */
export function updateBoxGroup(group: THREE.Group, options?: BoxOptions | null): { width: number; height: number; depth: number } {
  return updateBoxGroupWithDeps(group, options, getUpdaterDeps());
}

/** Atualiza um único Mesh (caixa sólida); compatibilidade com caixas não modulares. */
export const updateBoxGeometry = (mesh: THREE.Mesh, options: BoxOptions = {}) => {
  return updateBoxGeometryWithDeps(mesh, options, getUpdaterDeps());
};
